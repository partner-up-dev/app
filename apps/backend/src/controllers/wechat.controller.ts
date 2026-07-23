import { zValidator } from "@hono/zod-validator";
import { randomUUID } from "crypto";
import type { Context } from "hono";
import { Hono } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { clearAnonymousSessionCookie, readAnonymousSessionCookie } from "../auth/anonymous-session";
import { type AuthEnv, authMiddleware, issuePublicAuthForUser } from "../auth/middleware";
import {
  cancelNotification,
  type PRMessageNotificationSubscriptionAction,
  type PRMessageNotificationSubscriptionUpdateResult,
  updatePRMessageNotificationSubscription,
} from "../domains/notification";
import {
  reconcileActivityStartRemindersForRecipient,
  reconcileConfirmationRemindersForRecipient,
} from "../domains/pr";
import { AUTHENTICATED_REQUIRED_CODE } from "../domains/pr/contracts";
import { reconcileAlternativeWaitlistNotificationsForUserSources } from "../domains/pr/ports";
import {
  bindWeChatToCurrentUser,
  classifyCurrentPublicUser,
  upgradeAnonymousUserWithWeChat,
} from "../domains/user";
import { hasUserRole, type User, type UserId } from "../entities/user";
import {
  type WeChatNotificationKind,
  wechatNotificationKindSchema,
} from "../entities/user-notification-opt";
import { env } from "../lib/env";
import { resolveConfiguredFrontendReturnTo } from "../lib/frontend-origin";
import { ProblemDetailsError, throwHttpProblem } from "../lib/problem-details";
import {
  isWeChatAbilityMockingEnabled,
  resolveWeChatAbilityMockOpenId,
} from "../lib/wechat-ability-mocking";
import { UserNotificationOptRepository } from "../repositories/UserNotificationOptRepository";
import { UserRepository } from "../repositories/UserRepository";
import { WeChatJssdkService } from "../services/WeChatJssdkService";
import { type WeChatOAuthLoginSession, WeChatOAuthService } from "../services/WeChatOAuthService";
import { WeChatSubscriptionMessageService } from "../services/WeChatSubscriptionMessageService";

const app = new Hono<AuthEnv>();
const jssdkService = new WeChatJssdkService();
const oauthService = new WeChatOAuthService();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const subscriptionMessageService = new WeChatSubscriptionMessageService();

const OAUTH_STATE_COOKIE_NAME = "wechat_oauth_state";
const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const OAUTH_HANDOFF_COOKIE_NAME = "wechat_oauth_handoff";
const OAUTH_HANDOFF_TTL_SECONDS = 2 * 60;
const OAUTH_HANDOFF_QUERY_PARAM = "wechatOAuthHandoff";
const OAUTH_HANDOFF_COOKIE_PATH = "/api/wechat/oauth/handoff";
const OAUTH_MOCK_CODE = "mock-oauth-code";
const WECHAT_BIND_REQUIRED_CODE = "WECHAT_BIND_REQUIRED";
const WECHAT_OAUTH_HANDOFF_EXPIRED_CODE = "WECHAT_OAUTH_HANDOFF_EXPIRED";
const WECHAT_OAUTH_HANDOFF_INVALID_CODE = "WECHAT_OAUTH_HANDOFF_INVALID";
const WECHAT_OAUTH_HANDOFF_MISMATCH_CODE = "WECHAT_OAUTH_HANDOFF_MISMATCH";
const WECHAT_OAUTH_NOT_CONFIGURED_CODE = "WECHAT_OAUTH_NOT_CONFIGURED";
const WECHAT_OAUTH_PUBLIC_IDENTITY_NOT_ALLOWED_CODE = "WECHAT_OAUTH_PUBLIC_IDENTITY_NOT_ALLOWED";

const signatureQuerySchema = z.object({
  url: z.string().min(1),
});

const oauthLoginQuerySchema = z.object({
  returnTo: z.string().optional(),
});

const oauthMockAuthorizeQuerySchema = z.object({
  state: z.string().min(1),
});

const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
});

const oauthHandoffQuerySchema = z.object({
  handoff: z.string().min(1),
});

const oauthHandoffQueryValidator = zValidator<
  typeof oauthHandoffQuerySchema,
  "query",
  AuthEnv,
  string
>("query", oauthHandoffQuerySchema, (result, c) => {
  if (result.success) return;
  c.header("Cache-Control", "no-store");
  c.set("suppressAccessTokenHeader", true);
  return throwHttpProblem({
    status: 400,
    detail: "Invalid OAuth handoff",
    code: WECHAT_OAUTH_HANDOFF_INVALID_CODE,
  });
});

const oauthStateCookiePayloadSchema = z.object({
  nonce: z.string().min(1),
  returnTo: z.string().url(),
  mode: z.enum(["login", "bind"]),
  bindUserId: z.string().uuid().nullable(),
  anonymousUserId: z.string().uuid().nullable(),
  expiresAtMs: z.number().int().positive(),
});

const oauthCallbackAuthPayloadSchema = z.object({
  role: z.literal("authenticated"),
  roles: z.tuple([z.literal("authenticated")]),
  userId: z.string().uuid(),
  accessToken: z.string().min(1),
});

const oauthHandoffCookiePayloadSchema = z.object({
  nonce: z.string().min(1),
  userId: z.string().uuid(),
  expiresAtMs: z.number().int().positive(),
});
const reminderSubscriptionUpdateSchema = z.object({
  enabled: z.boolean(),
});
const notificationSubscriptionActionSchema = z.enum(["ADD_ONE", "CLEAR"]);
const notificationSubscriptionUpdateSchema = z.object({
  kind: wechatNotificationKindSchema,
  action: notificationSubscriptionActionSchema,
});

type OAuthStateCookiePayload = z.infer<typeof oauthStateCookiePayloadSchema>;
type OAuthStateMode = OAuthStateCookiePayload["mode"];
type OAuthHandoffCookiePayload = z.infer<typeof oauthHandoffCookiePayloadSchema>;
type OAuthCallbackAuthPayload = z.infer<typeof oauthCallbackAuthPayloadSchema>;
type NotificationSubscriptionState = {
  enabled: boolean;
  optInAt: string | null;
  remainingCount: number;
  configured: boolean;
  requiresOpenSubscribe: boolean;
  templateId: string | null;
};

const nowMs = (): number => Date.now();

const isOAuthRuntimeAvailable = (): boolean =>
  oauthService.isConfigured() || isWeChatAbilityMockingEnabled();

const resolveOAuthSessionSecret = (): string | null => {
  if (oauthService.isConfigured()) {
    return oauthService.getSessionSecret();
  }
  if (isWeChatAbilityMockingEnabled()) {
    return env.AUTH_JWT_SECRET;
  }
  return null;
};

const buildNotificationChannelState = async (): Promise<{
  reminder: Pick<
    NotificationSubscriptionState,
    "configured" | "requiresOpenSubscribe" | "templateId"
  >;
  activityStartReminder: Pick<
    NotificationSubscriptionState,
    "configured" | "requiresOpenSubscribe" | "templateId"
  >;
  newPartner: Pick<
    NotificationSubscriptionState,
    "configured" | "requiresOpenSubscribe" | "templateId"
  >;
  prMessage: Pick<
    NotificationSubscriptionState,
    "configured" | "requiresOpenSubscribe" | "templateId"
  >;
  meetingPointUpdated: Pick<
    NotificationSubscriptionState,
    "configured" | "requiresOpenSubscribe" | "templateId"
  >;
  prReady: Pick<
    NotificationSubscriptionState,
    "configured" | "requiresOpenSubscribe" | "templateId"
  >;
  waitlistPromoted: Pick<
    NotificationSubscriptionState,
    "configured" | "requiresOpenSubscribe" | "templateId"
  >;
  waitlistAlternativeAvailable: Pick<
    NotificationSubscriptionState,
    "configured" | "requiresOpenSubscribe" | "templateId"
  >;
}> => {
  const [
    reminderTemplateId,
    activityStartReminderTemplateId,
    newPartnerTemplateId,
    prMessageTemplateId,
    meetingPointUpdatedTemplateId,
    prReadyTemplateId,
    waitlistPromotedTemplateId,
  ] = await Promise.all([
    subscriptionMessageService.getConfirmationReminderTemplateId(),
    subscriptionMessageService.getActivityStartReminderTemplateId(),
    subscriptionMessageService.getNewPartnerTemplateId(),
    subscriptionMessageService.getPRMessageTemplateId(),
    subscriptionMessageService.getMeetingPointUpdatedTemplateId(),
    subscriptionMessageService.getPRReadyTemplateId(),
    subscriptionMessageService.getWaitlistPromotedTemplateId(),
  ]);

  const [
    reminderSubmsgConfigured,
    activityStartReminderSubmsgConfigured,
    newPartnerSubmsgConfigured,
    prMessageSubmsgConfigured,
    meetingPointUpdatedSubmsgConfigured,
    prReadySubmsgConfigured,
    waitlistPromotedSubmsgConfigured,
  ] = await Promise.all([
    subscriptionMessageService.isConfirmationReminderConfigured(),
    subscriptionMessageService.isActivityStartReminderConfigured(),
    subscriptionMessageService.isNewPartnerConfigured(),
    subscriptionMessageService.isPRMessageConfigured(),
    subscriptionMessageService.isMeetingPointUpdatedConfigured(),
    subscriptionMessageService.isPRReadyConfigured(),
    subscriptionMessageService.isWaitlistPromotedConfigured(),
  ]);

  return {
    reminder: {
      configured: reminderSubmsgConfigured,
      requiresOpenSubscribe: reminderSubmsgConfigured && Boolean(reminderTemplateId),
      templateId: reminderTemplateId,
    },
    activityStartReminder: {
      configured: activityStartReminderSubmsgConfigured,
      requiresOpenSubscribe:
        activityStartReminderSubmsgConfigured && Boolean(activityStartReminderTemplateId),
      templateId: activityStartReminderTemplateId,
    },
    newPartner: {
      configured: newPartnerSubmsgConfigured,
      requiresOpenSubscribe: newPartnerSubmsgConfigured && Boolean(newPartnerTemplateId),
      templateId: newPartnerTemplateId,
    },
    prMessage: {
      configured: prMessageSubmsgConfigured,
      requiresOpenSubscribe: prMessageSubmsgConfigured && Boolean(prMessageTemplateId),
      templateId: prMessageTemplateId,
    },
    meetingPointUpdated: {
      configured: meetingPointUpdatedSubmsgConfigured,
      requiresOpenSubscribe:
        meetingPointUpdatedSubmsgConfigured && Boolean(meetingPointUpdatedTemplateId),
      templateId: meetingPointUpdatedTemplateId,
    },
    prReady: {
      configured: prReadySubmsgConfigured,
      requiresOpenSubscribe: prReadySubmsgConfigured && Boolean(prReadyTemplateId),
      templateId: prReadyTemplateId,
    },
    waitlistPromoted: {
      configured: waitlistPromotedSubmsgConfigured,
      requiresOpenSubscribe:
        waitlistPromotedSubmsgConfigured && Boolean(waitlistPromotedTemplateId),
      templateId: waitlistPromotedTemplateId,
    },
    waitlistAlternativeAvailable: {
      configured: waitlistPromotedSubmsgConfigured,
      requiresOpenSubscribe:
        waitlistPromotedSubmsgConfigured && Boolean(waitlistPromotedTemplateId),
      templateId: waitlistPromotedTemplateId,
    },
  };
};

const buildAnonymousSubscriptionsResponse = async (configured: boolean) => {
  const channels = await buildNotificationChannelState();

  return {
    configured,
    authenticated: false,
    wechatBound: false,
    subscriptions: {
      REMINDER_CONFIRMATION: {
        enabled: false,
        optInAt: null,
        remainingCount: 0,
        configured: channels.reminder.configured,
        requiresOpenSubscribe: channels.reminder.requiresOpenSubscribe,
        templateId: channels.reminder.templateId,
      },
      ACTIVITY_START_REMINDER: {
        enabled: false,
        optInAt: null,
        remainingCount: 0,
        configured: channels.activityStartReminder.configured,
        requiresOpenSubscribe: channels.activityStartReminder.requiresOpenSubscribe,
        templateId: channels.activityStartReminder.templateId,
      },
      NEW_PARTNER: {
        enabled: false,
        optInAt: null,
        remainingCount: 0,
        configured: channels.newPartner.configured,
        requiresOpenSubscribe: channels.newPartner.requiresOpenSubscribe,
        templateId: channels.newPartner.templateId,
      },
      PR_MESSAGE: {
        enabled: false,
        optInAt: null,
        remainingCount: 0,
        configured: channels.prMessage.configured,
        requiresOpenSubscribe: channels.prMessage.requiresOpenSubscribe,
        templateId: channels.prMessage.templateId,
      },
      MEETING_POINT_UPDATED: {
        enabled: false,
        optInAt: null,
        remainingCount: 0,
        configured: channels.meetingPointUpdated.configured,
        requiresOpenSubscribe: channels.meetingPointUpdated.requiresOpenSubscribe,
        templateId: channels.meetingPointUpdated.templateId,
      },
      PR_READY: {
        enabled: false,
        optInAt: null,
        remainingCount: 0,
        configured: channels.prReady.configured,
        requiresOpenSubscribe: channels.prReady.requiresOpenSubscribe,
        templateId: channels.prReady.templateId,
      },
      WAITLIST_PROMOTED: {
        enabled: false,
        optInAt: null,
        remainingCount: 0,
        configured: channels.waitlistPromoted.configured,
        requiresOpenSubscribe: channels.waitlistPromoted.requiresOpenSubscribe,
        templateId: channels.waitlistPromoted.templateId,
      },
      WAITLIST_ALTERNATIVE_AVAILABLE: {
        enabled: false,
        optInAt: null,
        remainingCount: 0,
        configured: channels.waitlistAlternativeAvailable.configured,
        requiresOpenSubscribe: channels.waitlistAlternativeAvailable.requiresOpenSubscribe,
        templateId: channels.waitlistAlternativeAvailable.templateId,
      },
    },
  };
};

const buildAuthenticatedSubscriptionsResponse = async (
  userId: UserId,
): Promise<{
  configured: boolean;
  authenticated: boolean;
  wechatBound: boolean;
  subscriptions: Record<WeChatNotificationKind, NotificationSubscriptionState>;
}> => {
  const notificationOpt = await userNotificationOptRepo.findByUserId(userId);
  const channels = await buildNotificationChannelState();

  const reminder = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    "REMINDER_CONFIRMATION",
  );
  const activityStartReminder = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    "ACTIVITY_START_REMINDER",
  );
  const newPartner = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    "NEW_PARTNER",
  );
  const prMessage = userNotificationOptRepo.getSubscriptionSnapshot(notificationOpt, "PR_MESSAGE");
  const meetingPointUpdated = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    "MEETING_POINT_UPDATED",
  );
  const prReady = userNotificationOptRepo.getSubscriptionSnapshot(notificationOpt, "PR_READY");
  const waitlistPromoted = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    "WAITLIST_PROMOTED",
  );
  const waitlistAlternativeAvailable = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    "WAITLIST_ALTERNATIVE_AVAILABLE",
  );

  return {
    configured: true,
    authenticated: true,
    wechatBound: true,
    subscriptions: {
      REMINDER_CONFIRMATION: {
        enabled: reminder.enabled,
        optInAt: reminder.optInAt ? reminder.optInAt.toISOString() : null,
        remainingCount: reminder.remainingCount,
        configured: channels.reminder.configured,
        requiresOpenSubscribe: channels.reminder.requiresOpenSubscribe,
        templateId: channels.reminder.templateId,
      },
      ACTIVITY_START_REMINDER: {
        enabled: activityStartReminder.enabled,
        optInAt: activityStartReminder.optInAt ? activityStartReminder.optInAt.toISOString() : null,
        remainingCount: activityStartReminder.remainingCount,
        configured: channels.activityStartReminder.configured,
        requiresOpenSubscribe: channels.activityStartReminder.requiresOpenSubscribe,
        templateId: channels.activityStartReminder.templateId,
      },
      NEW_PARTNER: {
        enabled: newPartner.enabled,
        optInAt: newPartner.optInAt ? newPartner.optInAt.toISOString() : null,
        remainingCount: newPartner.remainingCount,
        configured: channels.newPartner.configured,
        requiresOpenSubscribe: channels.newPartner.requiresOpenSubscribe,
        templateId: channels.newPartner.templateId,
      },
      PR_MESSAGE: {
        enabled: prMessage.enabled,
        optInAt: prMessage.optInAt ? prMessage.optInAt.toISOString() : null,
        remainingCount: prMessage.remainingCount,
        configured: channels.prMessage.configured,
        requiresOpenSubscribe: channels.prMessage.requiresOpenSubscribe,
        templateId: channels.prMessage.templateId,
      },
      MEETING_POINT_UPDATED: {
        enabled: meetingPointUpdated.enabled,
        optInAt: meetingPointUpdated.optInAt ? meetingPointUpdated.optInAt.toISOString() : null,
        remainingCount: meetingPointUpdated.remainingCount,
        configured: channels.meetingPointUpdated.configured,
        requiresOpenSubscribe: channels.meetingPointUpdated.requiresOpenSubscribe,
        templateId: channels.meetingPointUpdated.templateId,
      },
      PR_READY: {
        enabled: prReady.enabled,
        optInAt: prReady.optInAt ? prReady.optInAt.toISOString() : null,
        remainingCount: prReady.remainingCount,
        configured: channels.prReady.configured,
        requiresOpenSubscribe: channels.prReady.requiresOpenSubscribe,
        templateId: channels.prReady.templateId,
      },
      WAITLIST_PROMOTED: {
        enabled: waitlistPromoted.enabled,
        optInAt: waitlistPromoted.optInAt ? waitlistPromoted.optInAt.toISOString() : null,
        remainingCount: waitlistPromoted.remainingCount,
        configured: channels.waitlistPromoted.configured,
        requiresOpenSubscribe: channels.waitlistPromoted.requiresOpenSubscribe,
        templateId: channels.waitlistPromoted.templateId,
      },
      WAITLIST_ALTERNATIVE_AVAILABLE: {
        enabled: waitlistAlternativeAvailable.enabled,
        optInAt: waitlistAlternativeAvailable.optInAt
          ? waitlistAlternativeAvailable.optInAt.toISOString()
          : null,
        remainingCount: waitlistAlternativeAvailable.remainingCount,
        configured: channels.waitlistAlternativeAvailable.configured,
        requiresOpenSubscribe: channels.waitlistAlternativeAvailable.requiresOpenSubscribe,
        templateId: channels.waitlistAlternativeAvailable.templateId,
      },
    },
  };
};

const applyNotificationSubscriptionSideEffects = async (
  userId: UserId,
  kind: WeChatNotificationKind,
  previousRemainingCount: number,
  nextRemainingCount: number,
): Promise<number> => {
  if (kind === "REMINDER_CONFIRMATION") {
    if (nextRemainingCount <= 0) {
      const cancellation = await cancelNotification({
        template: "pr.confirmation-reminder",
        recipientUserId: userId,
        scope: { kind: "RECIPIENT" },
      });
      return cancellation.canceled;
    }

    const reconciliation = await reconcileConfirmationRemindersForRecipient({
      recipientUserId: userId,
    });
    return reconciliation.canceled;
  }

  if (kind === "ACTIVITY_START_REMINDER") {
    if (nextRemainingCount <= 0) {
      const cancellation = await cancelNotification({
        template: "pr.activity-start-reminder",
        recipientUserId: userId,
        scope: { kind: "RECIPIENT" },
      });
      return cancellation.canceled;
    }

    const reconciliation = await reconcileActivityStartRemindersForRecipient({
      recipientUserId: userId,
    });
    return reconciliation.canceled;
  }

  if (
    kind === "WAITLIST_ALTERNATIVE_AVAILABLE" &&
    previousRemainingCount <= 0 &&
    nextRemainingCount > 0
  ) {
    await reconcileAlternativeWaitlistNotificationsForUserSources(userId);
    return 0;
  }

  return 0;
};

type PRMessageSubscriptionControllerDependencies = {
  updateSubscription(input: {
    recipientUserId: string;
    action: PRMessageNotificationSubscriptionAction;
  }): Promise<PRMessageNotificationSubscriptionUpdateResult>;
};

const prMessageSubscriptionControllerDependencies: PRMessageSubscriptionControllerDependencies = {
  updateSubscription: updatePRMessageNotificationSubscription,
};

/**
 * Converts the authenticated PR-message subscription protocol onto
 * Notification's serialized command. Generic window invalidation remains
 * private to Notification.
 */
export const applyPRMessageNotificationSubscriptionUpdate = async (
  userId: UserId,
  action: PRMessageNotificationSubscriptionAction,
  dependencies: PRMessageSubscriptionControllerDependencies = prMessageSubscriptionControllerDependencies,
): Promise<{
  update: PRMessageNotificationSubscriptionUpdateResult;
  deletedJobs: number;
}> => {
  const update = await dependencies.updateSubscription({
    recipientUserId: userId,
    action,
  });

  return {
    update,
    deletedJobs: update.invalidated.canceled,
  };
};

const isHttpProtocol = (protocol: string): boolean => protocol === "http:" || protocol === "https:";

const parseHttpUrl = (rawUrl: string | undefined): URL | null => {
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    if (!isHttpProtocol(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const isSecureRequest = (c: Context): boolean => {
  const forwardedProto = c.req.header("x-forwarded-proto");
  const normalizedForwardedProto = forwardedProto?.split(",")[0]?.trim().toLowerCase();
  if (normalizedForwardedProto === "https") return true;

  try {
    return new URL(c.req.url).protocol === "https:";
  } catch {
    return false;
  }
};

const firstForwardedHeaderValue = (rawValue: string | undefined): string | null => {
  const value = rawValue?.split(",")[0]?.trim();
  return value && value.length > 0 ? value : null;
};

const resolveForwardedProtocol = (rawValue: string | undefined): string | null => {
  const value = firstForwardedHeaderValue(rawValue)?.toLowerCase();
  if (value === "http" || value === "http:") return "http:";
  if (value === "https" || value === "https:") return "https:";
  return null;
};

const resolvePublicRequestUrl = (c: Context): URL => {
  const url = new URL(c.req.url);
  const forwardedProtocol = resolveForwardedProtocol(c.req.header("x-forwarded-proto"));
  if (forwardedProtocol) {
    url.protocol = forwardedProtocol;
  }

  const forwardedHost =
    firstForwardedHeaderValue(c.req.header("x-forwarded-host")) ??
    firstForwardedHeaderValue(c.req.header("host"));
  if (forwardedHost) {
    url.host = forwardedHost;
  }

  return url;
};

const resolveCookieBaseOptions = (c: Context) => ({
  httpOnly: true,
  sameSite: "Lax" as const,
  secure: isSecureRequest(c),
  path: "/",
});

const encodeSignedPayload = (payload: object): string =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

const decodeSignedPayload = <T>(rawValue: string, schema: z.ZodType<T>): T | null => {
  try {
    const json = Buffer.from(rawValue, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    const result = schema.safeParse(parsed);
    if (!result.success) return null;
    return result.data;
  } catch {
    return null;
  }
};

const readSignedCookiePayload = async <T>(
  c: Context,
  cookieName: string,
  secret: string,
  schema: z.ZodType<T>,
): Promise<T | null> => {
  const cookieValue = await getSignedCookie(c, secret, cookieName);
  if (!cookieValue) {
    return null;
  }

  return decodeSignedPayload(cookieValue, schema);
};

const clearOAuthStateCookie = (c: Context): void => {
  deleteCookie(c, OAUTH_STATE_COOKIE_NAME, resolveCookieBaseOptions(c));
};

const resolveOAuthStateCookieName = (nonce: string): string =>
  `${OAUTH_STATE_COOKIE_NAME}_${nonce}`;

const clearOAuthStateCookieByNonce = (c: Context, nonce: string): void => {
  deleteCookie(c, resolveOAuthStateCookieName(nonce), resolveCookieBaseOptions(c));
};

const resolveOAuthHandoffCookieName = (nonce: string): string =>
  `${OAUTH_HANDOFF_COOKIE_NAME}_${nonce}`;

const resolveOAuthHandoffCookieOptions = (c: Context) => ({
  ...resolveCookieBaseOptions(c),
  sameSite: isSecureRequest(c) ? ("None" as const) : ("Lax" as const),
  secure: isSecureRequest(c),
  path: OAUTH_HANDOFF_COOKIE_PATH,
});

const clearOAuthHandoffCookieByNonce = (c: Context, nonce: string): void => {
  deleteCookie(c, resolveOAuthHandoffCookieName(nonce), resolveOAuthHandoffCookieOptions(c));
};

const resolveReturnTo = (rawReturnTo: string | undefined): string =>
  resolveConfiguredFrontendReturnTo(rawReturnTo, env.FRONTEND_URL);

const resolveOAuthCallbackUrl = (c: Context): string => {
  const configuredCallbackUrl = parseHttpUrl(env.WECHAT_OAUTH_CALLBACK_URL);
  if (configuredCallbackUrl) {
    configuredCallbackUrl.search = "";
    configuredCallbackUrl.hash = "";
    return configuredCallbackUrl.toString();
  }

  const backendCallbackUrl = resolvePublicRequestUrl(c);
  backendCallbackUrl.pathname = backendCallbackUrl.pathname.replace(
    /\/oauth\/(?:login|bind)$/,
    "/oauth/callback",
  );
  backendCallbackUrl.search = "";
  backendCallbackUrl.hash = "";
  return backendCallbackUrl.toString();
};

const resolveMockOAuthAuthorizeUrl = (c: Context, state: string): string => {
  const authorizeUrl = resolvePublicRequestUrl(c);
  authorizeUrl.pathname = authorizeUrl.pathname.replace(
    /\/oauth\/(?:login|bind)$/,
    "/oauth/mock/authorize",
  );
  authorizeUrl.search = "";
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.hash = "";
  return authorizeUrl.toString();
};

const resolveMockOAuthCallbackUrl = (c: Context, state: string): string => {
  const callbackUrl = resolvePublicRequestUrl(c);
  callbackUrl.pathname = callbackUrl.pathname.replace(
    /\/oauth\/mock\/authorize$/,
    "/oauth/callback",
  );
  callbackUrl.search = "";
  callbackUrl.searchParams.set("state", state);
  callbackUrl.searchParams.set("code", OAUTH_MOCK_CODE);
  callbackUrl.hash = "";
  return callbackUrl.toString();
};

const appendBindResultToReturnTo = (
  returnTo: string,
  result: "success" | "conflict" | "failed",
): string => {
  const url = new URL(returnTo);
  url.searchParams.set("wechatBind", result);
  return url.toString();
};

const appendOAuthHandoffToReturnTo = (returnTo: string, handoffNonce: string): string => {
  const url = new URL(returnTo);
  url.searchParams.set(OAUTH_HANDOFF_QUERY_PARAM, handoffNonce);
  return url.toString();
};

const setOAuthStateCookie = async (c: Context, payload: OAuthStateCookiePayload): Promise<void> => {
  const sessionSecret = resolveOAuthSessionSecret();
  if (!sessionSecret) {
    throw new Error("WeChat OAuth state secret is not configured");
  }
  await setSignedCookie(
    c,
    resolveOAuthStateCookieName(payload.nonce),
    encodeSignedPayload(payload),
    sessionSecret,
    {
      ...resolveCookieBaseOptions(c),
      maxAge: OAUTH_STATE_TTL_SECONDS,
    },
  );
  await setSignedCookie(c, OAUTH_STATE_COOKIE_NAME, encodeSignedPayload(payload), sessionSecret, {
    ...resolveCookieBaseOptions(c),
    maxAge: OAUTH_STATE_TTL_SECONDS,
  });
};

const setOAuthHandoffCookie = async (
  c: Context,
  payload: OAuthHandoffCookiePayload,
): Promise<void> => {
  const sessionSecret = resolveOAuthSessionSecret();
  if (!sessionSecret) {
    throw new Error("WeChat OAuth handoff secret is not configured");
  }

  await setSignedCookie(
    c,
    resolveOAuthHandoffCookieName(payload.nonce),
    encodeSignedPayload(payload),
    sessionSecret,
    {
      ...resolveOAuthHandoffCookieOptions(c),
      maxAge: OAUTH_HANDOFF_TTL_SECONDS,
    },
  );
};

const buildOAuthStatePayload = (
  returnTo: string,
  mode: OAuthStateMode,
  bindUserId: UserId | null = null,
  anonymousUserId: UserId | null = null,
): OAuthStateCookiePayload => ({
  nonce: randomUUID(),
  returnTo,
  mode,
  bindUserId,
  anonymousUserId,
  expiresAtMs: nowMs() + OAUTH_STATE_TTL_SECONDS * 1000,
});

const buildOAuthHandoffPayload = (userId: UserId): OAuthHandoffCookiePayload => ({
  nonce: randomUUID(),
  userId,
  expiresAtMs: nowMs() + OAUTH_HANDOFF_TTL_SECONDS * 1000,
});

const isOAuthCallbackNavigationRequest = (c: Context): boolean => {
  const secFetchMode = c.req.header("sec-fetch-mode")?.toLowerCase();
  if (secFetchMode === "navigate") {
    return true;
  }
  if (secFetchMode === "cors") {
    return false;
  }

  const accept = c.req.header("accept")?.toLowerCase() ?? "";
  return accept.includes("text/html");
};

const requireAuthenticatedUserId = (c: Context): UserId => {
  const auth = c.get("auth");
  if (auth.role === "anonymous" || !auth.userId) {
    throw new Error("Authentication required");
  }

  return auth.userId as UserId;
};

const readSessionUserId = (c: Context<AuthEnv>): UserId | null => {
  const auth = c.get("auth");
  if (!auth.userId) {
    return null;
  }
  return auth.userId as UserId;
};

const throwOAuthPublicIdentityNotAllowed = (): never =>
  throwHttpProblem({
    status: 403,
    detail: "OAuth identity is not eligible for a public session",
    code: WECHAT_OAUTH_PUBLIC_IDENTITY_NOT_ALLOWED_CODE,
    type: "https://partner-up.app/problems/wechat.oauth_public_identity_not_allowed",
  });

const assertOAuthPublicAuthenticatedUser = (user: User): void => {
  const identity = classifyCurrentPublicUser(user);
  if (!identity || identity.role !== "authenticated") {
    throwOAuthPublicIdentityNotAllowed();
  }
};

function assertOAuthPublicAuthenticatedAuth(
  auth: ReturnType<typeof issuePublicAuthForUser>,
): asserts auth is NonNullable<ReturnType<typeof issuePublicAuthForUser>> {
  if (!auth || auth.role !== "authenticated") {
    throwOAuthPublicIdentityNotAllowed();
  }
}

const throwOAuthHandoffProblem = (
  c: Context<AuthEnv>,
  input: Parameters<typeof throwHttpProblem>[0],
): never => {
  c.set("suppressAccessTokenHeader", true);
  return throwHttpProblem(input);
};

const issueOAuthCallbackAuth = async (
  c: Context<AuthEnv>,
  user: User,
): Promise<OAuthCallbackAuthPayload> => {
  assertOAuthPublicAuthenticatedUser(user);
  const authenticated = issuePublicAuthForUser(user);
  assertOAuthPublicAuthenticatedAuth(authenticated);
  c.set("auth", authenticated);

  return {
    role: "authenticated",
    roles: ["authenticated"],
    userId: user.id,
    accessToken: authenticated.token,
  };
};

const hasMissingWeChatProfile = (user: Pick<User, "nickname" | "sex" | "avatar">): boolean =>
  !user.nickname || user.sex === null || !user.avatar;

const fetchAndApplyWeChatProfileIfMissing = async (input: {
  userId: UserId;
  session: WeChatOAuthLoginSession;
}): Promise<void> => {
  try {
    const profile = await oauthService.fetchUserInfo(
      input.session.oauthAccessToken,
      input.session.openId,
      input.session.scope,
    );
    await userRepo.updateWeChatProfileFieldsIfMissing({
      userId: input.userId,
      nickname: profile.nickname,
      sex: profile.sex,
      avatar: profile.avatar,
    });
  } catch {
    // Profile refresh is best-effort and cannot change a completed OAuth result.
  }
};

const scheduleWeChatProfileRefreshIfMissing = (input: {
  user: Pick<User, "id" | "nickname" | "sex" | "avatar">;
  session: WeChatOAuthLoginSession | null;
}): void => {
  const session = input.session;
  if (!session || !hasMissingWeChatProfile(input.user)) {
    return;
  }

  setTimeout(() => {
    void fetchAndApplyWeChatProfileIfMissing({
      userId: input.user.id,
      session,
    });
  }, 0);
};

const resolveAuthenticatedBoundUser = async (
  c: Context,
): Promise<
  { ok: true; user: User } | { ok: false; status: 401; payload: { error: string; code: string } }
> => {
  let userId: UserId;
  try {
    userId = requireAuthenticatedUserId(c);
  } catch {
    return {
      ok: false,
      status: 401,
      payload: {
        error: "Authenticated user required",
        code: AUTHENTICATED_REQUIRED_CODE,
      },
    };
  }

  const user = await userRepo.findById(userId);
  if (!user || user.status !== "ACTIVE") {
    return {
      ok: false,
      status: 401,
      payload: {
        error: "Authenticated user required",
        code: AUTHENTICATED_REQUIRED_CODE,
      },
    };
  }

  if (!user.openId) {
    return {
      ok: false,
      status: 401,
      payload: {
        error: "Current account is not bound to WeChat",
        code: WECHAT_BIND_REQUIRED_CODE,
      },
    };
  }

  return {
    ok: true,
    user,
  };
};

export const wechatRoute = app
  .use("*", authMiddleware)
  .get("/jssdk-signature", zValidator("query", signatureQuerySchema), async (c) => {
    const { url } = c.req.valid("query");
    try {
      // Validate URL early to return 400 rather than 500.
      // WeChat signature uses the full URL without hash.
      new URL(url);
    } catch {
      return c.json({ error: "Invalid url" }, 400);
    }

    try {
      const signature = await jssdkService.createSignature(url);
      return c.json(signature);
    } catch (error) {
      const message = error instanceof Error ? error.message : "WeChat signature failed";
      return c.json({ error: message }, 500);
    }
  })
  .get("/official-account/follow-status", async (c) => {
    const userId = readSessionUserId(c);
    if (!userId) {
      return c.json({
        status: "UNKNOWN" as const,
        followedAt: null,
      });
    }

    const user = await userRepo.findById(userId);
    if (!user || user.status !== "ACTIVE" || !user.wechatOfficialAccountFollowedAt) {
      return c.json({
        status: "UNKNOWN" as const,
        followedAt: null,
      });
    }

    return c.json({
      status: "FOLLOWED" as const,
      followedAt: user.wechatOfficialAccountFollowedAt.toISOString(),
    });
  })
  .get("/notifications/subscriptions", async (c) => {
    if (!isOAuthRuntimeAvailable()) {
      return c.json(await buildAnonymousSubscriptionsResponse(false));
    }

    const identity = await resolveAuthenticatedBoundUser(c);
    if (!identity.ok) {
      const fallback = await buildAnonymousSubscriptionsResponse(true);
      if (identity.payload.code === AUTHENTICATED_REQUIRED_CODE) {
        return c.json(fallback);
      }
      return c.json({
        ...fallback,
        authenticated: true,
      });
    }

    return c.json(await buildAuthenticatedSubscriptionsResponse(identity.user.id));
  })
  .post(
    "/notifications/subscriptions",
    zValidator("json", notificationSubscriptionUpdateSchema),
    async (c) => {
      if (!isOAuthRuntimeAvailable()) {
        return c.json({ error: "WeChat OAuth is not configured" }, 503);
      }

      const identity = await resolveAuthenticatedBoundUser(c);
      if (!identity.ok) {
        return c.json(identity.payload, identity.status);
      }

      const { kind, action } = c.req.valid("json");
      if (kind === "PR_MESSAGE") {
        let conversion: Awaited<ReturnType<typeof applyPRMessageNotificationSubscriptionUpdate>>;
        try {
          conversion = await applyPRMessageNotificationSubscriptionUpdate(identity.user.id, action);
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "PR_MESSAGE_NOTIFICATION_SUBSCRIPTION_WRITE_FAILED"
          ) {
            return c.json({ error: "Failed to update notification subscription" }, 500);
          }
          throw error;
        }

        const fullState = await buildAuthenticatedSubscriptionsResponse(identity.user.id);
        const selectedState = fullState.subscriptions.PR_MESSAGE;
        return c.json({
          ok: true,
          kind,
          action,
          enabled: conversion.update.current.preferred,
          optInAt: selectedState.optInAt,
          remainingCount: conversion.update.current.remainingCredit,
          configured: selectedState.configured,
          deletedJobs: conversion.deletedJobs,
        });
      }

      const currentNotificationOpt = await userNotificationOptRepo.findByUserId(identity.user.id);
      const previousSnapshot = userNotificationOptRepo.getSubscriptionSnapshot(
        currentNotificationOpt,
        kind,
      );
      const updatedNotificationOpt =
        action === "ADD_ONE"
          ? await userNotificationOptRepo.addOneWechatNotificationCredit(identity.user.id, kind)
          : await userNotificationOptRepo.clearWechatNotificationCredits(identity.user.id, kind);
      if (!updatedNotificationOpt) {
        return c.json({ error: "Failed to update notification subscription" }, 500);
      }
      const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
        updatedNotificationOpt,
        kind,
      );
      const deletedJobs = await applyNotificationSubscriptionSideEffects(
        identity.user.id,
        kind,
        previousSnapshot.remainingCount,
        snapshot.remainingCount,
      );
      const fullState = await buildAuthenticatedSubscriptionsResponse(identity.user.id);
      const selectedState = fullState.subscriptions[kind];
      return c.json({
        ok: true,
        kind,
        action,
        enabled: snapshot.enabled,
        optInAt: snapshot.optInAt ? snapshot.optInAt.toISOString() : null,
        remainingCount: snapshot.remainingCount,
        configured: selectedState.configured,
        deletedJobs,
      });
    },
  )
  .get("/reminders/subscription", async (c) => {
    if (!isOAuthRuntimeAvailable()) {
      const fallback = await buildAnonymousSubscriptionsResponse(false);
      const reminder = fallback.subscriptions.REMINDER_CONFIRMATION;
      return c.json({
        configured: fallback.configured && reminder.configured,
        authenticated: fallback.authenticated,
        wechatBound: fallback.wechatBound,
        enabled: reminder.enabled,
        optInAt: reminder.optInAt,
        remainingCount: reminder.remainingCount,
      });
    }

    const identity = await resolveAuthenticatedBoundUser(c);
    if (!identity.ok) {
      const fallback = await buildAnonymousSubscriptionsResponse(true);
      const reminder = fallback.subscriptions.REMINDER_CONFIRMATION;
      const authenticated = identity.payload.code === AUTHENTICATED_REQUIRED_CODE ? false : true;
      return c.json({
        configured: fallback.configured && reminder.configured,
        authenticated,
        wechatBound: false,
        enabled: reminder.enabled,
        optInAt: reminder.optInAt,
        remainingCount: reminder.remainingCount,
      });
    }

    const fullState = await buildAuthenticatedSubscriptionsResponse(identity.user.id);
    const reminder = fullState.subscriptions.REMINDER_CONFIRMATION;

    return c.json({
      configured: fullState.configured && reminder.configured,
      authenticated: fullState.authenticated,
      wechatBound: fullState.wechatBound,
      enabled: reminder.enabled,
      optInAt: reminder.optInAt,
      remainingCount: reminder.remainingCount,
    });
  })
  .post(
    "/reminders/subscription",
    zValidator("json", reminderSubscriptionUpdateSchema),
    async (c) => {
      if (!isOAuthRuntimeAvailable()) {
        return c.json({ error: "WeChat OAuth is not configured" }, 503);
      }

      const identity = await resolveAuthenticatedBoundUser(c);
      if (!identity.ok) {
        return c.json(identity.payload, identity.status);
      }

      const { enabled } = c.req.valid("json");
      const currentNotificationOpt = await userNotificationOptRepo.findByUserId(identity.user.id);
      const previousSnapshot = userNotificationOptRepo.getSubscriptionSnapshot(
        currentNotificationOpt,
        "REMINDER_CONFIRMATION",
      );
      const updatedNotificationOpt =
        await userNotificationOptRepo.setWechatNotificationRemainingCount(
          identity.user.id,
          "REMINDER_CONFIRMATION",
          enabled ? 1 : 0,
        );
      if (!updatedNotificationOpt) {
        return c.json({ error: "Failed to update reminder subscription" }, 500);
      }
      const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
        updatedNotificationOpt,
        "REMINDER_CONFIRMATION",
      );
      const deletedJobs = await applyNotificationSubscriptionSideEffects(
        identity.user.id,
        "REMINDER_CONFIRMATION",
        previousSnapshot.remainingCount,
        snapshot.remainingCount,
      );
      const fullState = await buildAuthenticatedSubscriptionsResponse(identity.user.id);
      const reminder = fullState.subscriptions.REMINDER_CONFIRMATION;

      return c.json({
        ok: true,
        enabled: snapshot.enabled,
        optInAt: snapshot.optInAt ? snapshot.optInAt.toISOString() : null,
        remainingCount: snapshot.remainingCount,
        configured: fullState.configured && reminder.configured,
        deletedJobs,
      });
    },
  )
  .get("/oauth/mock/authorize", zValidator("query", oauthMockAuthorizeQuerySchema), async (c) => {
    if (!isWeChatAbilityMockingEnabled()) {
      return c.json({ error: "Mock OAuth is not enabled" }, 404);
    }

    if (!resolveWeChatAbilityMockOpenId()) {
      return c.json({ error: "Mock WeChat openid is not configured" }, 503);
    }

    const { state } = c.req.valid("query");
    return c.redirect(resolveMockOAuthCallbackUrl(c, state), 302);
  })
  .get("/oauth/login", zValidator("query", oauthLoginQuerySchema), async (c) => {
    const { returnTo: rawReturnTo } = c.req.valid("query");

    let returnTo: string;
    try {
      returnTo = resolveReturnTo(rawReturnTo);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid returnTo";
      return c.json({ error: message }, 400);
    }

    const sessionUserId = readSessionUserId(c);
    const auth = c.get("auth");
    const bindUserId = auth.role === "anonymous" || !sessionUserId ? null : sessionUserId;
    const anonymousUserId =
      auth.role === "anonymous" ? (sessionUserId ?? (await readAnonymousSessionCookie(c))) : null;

    if (isWeChatAbilityMockingEnabled()) {
      const mockOpenId = resolveWeChatAbilityMockOpenId();
      if (!mockOpenId) {
        return c.json({ error: "Mock WeChat openid is not configured" }, 503);
      }

      const statePayload = buildOAuthStatePayload(returnTo, "login", bindUserId, anonymousUserId);
      await setOAuthStateCookie(c, statePayload);
      const mockAuthorizeUrl = resolveMockOAuthAuthorizeUrl(c, statePayload.nonce);
      return c.redirect(mockAuthorizeUrl, 302);
    }

    if (!oauthService.isConfigured()) {
      return c.json({ error: "WeChat OAuth is not configured" }, 503);
    }

    const statePayload = buildOAuthStatePayload(returnTo, "login", bindUserId, anonymousUserId);
    await setOAuthStateCookie(c, statePayload);

    const callbackUrl = resolveOAuthCallbackUrl(c);
    const authorizeUrl = oauthService.createAuthorizeUrl(callbackUrl, statePayload.nonce);

    return c.redirect(authorizeUrl, 302);
  })
  .get("/oauth/bind", zValidator("query", oauthLoginQuerySchema), async (c) => {
    const { returnTo: rawReturnTo } = c.req.valid("query");

    if (!isOAuthRuntimeAvailable()) {
      return c.json({ error: "WeChat OAuth is not configured" }, 503);
    }

    let returnTo: string;
    try {
      returnTo = resolveReturnTo(rawReturnTo);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid returnTo";
      return c.json({ error: message }, 400);
    }

    let currentUserId: UserId;
    try {
      currentUserId = requireAuthenticatedUserId(c);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication required";
      return c.json({ error: message }, 401);
    }

    const currentUser = await userRepo.findById(currentUserId);
    if (!currentUser) {
      return c.json({ error: "Authenticated user not found" }, 404);
    }
    if (currentUser.openId) {
      return c.json({ error: "Current user is already bound to WeChat" }, 409);
    }

    const statePayload = buildOAuthStatePayload(returnTo, "bind", currentUserId);
    await setOAuthStateCookie(c, statePayload);

    const authorizeUrl = isWeChatAbilityMockingEnabled()
      ? resolveMockOAuthAuthorizeUrl(c, statePayload.nonce)
      : oauthService.isConfigured()
        ? oauthService.createAuthorizeUrl(resolveOAuthCallbackUrl(c), statePayload.nonce)
        : null;
    if (!authorizeUrl) {
      return c.json({ error: "WeChat OAuth is not configured" }, 503);
    }

    return c.json({ authorizeUrl });
  })
  .get("/oauth/handoff", oauthHandoffQueryValidator, async (c) => {
    const { handoff } = c.req.valid("query");
    c.header("Cache-Control", "no-store");
    const sessionSecret = resolveOAuthSessionSecret();
    if (!sessionSecret) {
      return throwOAuthHandoffProblem(c, {
        status: 503,
        detail: "WeChat OAuth is not configured",
        code: WECHAT_OAUTH_NOT_CONFIGURED_CODE,
      });
    }

    const payload = await readSignedCookiePayload(
      c,
      resolveOAuthHandoffCookieName(handoff),
      sessionSecret,
      oauthHandoffCookiePayloadSchema,
    );

    clearOAuthHandoffCookieByNonce(c, handoff);

    if (!payload) {
      return throwOAuthHandoffProblem(c, {
        status: 400,
        detail: "Invalid OAuth handoff",
        code: WECHAT_OAUTH_HANDOFF_INVALID_CODE,
      });
    }
    if (payload.expiresAtMs <= nowMs()) {
      return throwOAuthHandoffProblem(c, {
        status: 400,
        detail: "OAuth handoff expired",
        code: WECHAT_OAUTH_HANDOFF_EXPIRED_CODE,
      });
    }
    if (payload.nonce !== handoff) {
      return throwOAuthHandoffProblem(c, {
        status: 400,
        detail: "OAuth handoff mismatch",
        code: WECHAT_OAUTH_HANDOFF_MISMATCH_CODE,
      });
    }

    const user = await userRepo.findById(payload.userId as UserId);
    if (!user || user.status !== "ACTIVE") {
      return throwOAuthHandoffProblem(c, {
        status: 403,
        detail: "OAuth identity is not eligible for a public session",
        code: WECHAT_OAUTH_PUBLIC_IDENTITY_NOT_ALLOWED_CODE,
        type: "https://partner-up.app/problems/wechat.oauth_public_identity_not_allowed",
      });
    }

    let authPayload: OAuthCallbackAuthPayload;
    try {
      authPayload = await issueOAuthCallbackAuth(c, user);
    } catch (error) {
      c.set("suppressAccessTokenHeader", true);
      throw error;
    }
    return c.json({
      ok: true,
      auth: authPayload,
    });
  })
  .get("/oauth/callback", zValidator("query", oauthCallbackQuerySchema), async (c) => {
    const respondError = (
      status: ContentfulStatusCode,
      error: string,
      returnTo?: string | null,
    ) => {
      c.set("suppressAccessTokenHeader", true);
      return c.json({ ok: false, error, returnTo: returnTo ?? undefined }, status);
    };
    const respondSuccess = async (returnTo: string) => {
      if (!isOAuthCallbackNavigationRequest(c)) {
        return c.json({ ok: true, returnTo });
      }

      return c.redirect(returnTo, 302);
    };
    const respondAuthenticatedSuccess = async (returnTo: string, user: User) => {
      if (!isOAuthCallbackNavigationRequest(c)) {
        const authPayload = await issueOAuthCallbackAuth(c, user);
        return c.json({ ok: true, returnTo, auth: authPayload });
      }

      const handoffPayload = buildOAuthHandoffPayload(user.id);
      await setOAuthHandoffCookie(c, handoffPayload);
      return c.redirect(appendOAuthHandoffToReturnTo(returnTo, handoffPayload.nonce), 302);
    };
    const resolveActiveUserById = async (userId: UserId): Promise<User> => {
      const user = await userRepo.findById(userId);
      if (!user || user.status !== "ACTIVE") {
        throw new Error("Authenticated user not found");
      }
      return user;
    };

    const { code, state } = c.req.valid("query");
    if (!code || !state) {
      clearOAuthStateCookie(c);
      return respondError(400, "Missing code or state");
    }

    const useMockOAuthFlow = isWeChatAbilityMockingEnabled() && code === OAUTH_MOCK_CODE;
    if (!useMockOAuthFlow && !oauthService.isConfigured()) {
      clearOAuthStateCookieByNonce(c, state);
      clearOAuthStateCookie(c);
      return respondError(503, "WeChat OAuth is not configured");
    }

    const sessionSecret = resolveOAuthSessionSecret();
    if (!sessionSecret) {
      clearOAuthStateCookieByNonce(c, state);
      clearOAuthStateCookie(c);
      return respondError(503, "WeChat OAuth is not configured");
    }
    const statePayload =
      (await readSignedCookiePayload(
        c,
        resolveOAuthStateCookieName(state),
        sessionSecret,
        oauthStateCookiePayloadSchema,
      )) ??
      (await readSignedCookiePayload(
        c,
        OAUTH_STATE_COOKIE_NAME,
        sessionSecret,
        oauthStateCookiePayloadSchema,
      ));

    if (!statePayload) {
      clearOAuthStateCookieByNonce(c, state);
      clearOAuthStateCookie(c);
      return respondError(400, "Invalid OAuth state");
    }

    if (statePayload.expiresAtMs <= nowMs()) {
      clearOAuthStateCookieByNonce(c, state);
      clearOAuthStateCookie(c);
      return respondError(400, "OAuth state expired");
    }

    if (statePayload.nonce !== state) {
      clearOAuthStateCookieByNonce(c, state);
      clearOAuthStateCookie(c);
      return respondError(400, "OAuth state mismatch");
    }

    try {
      if (statePayload.mode === "bind" && statePayload.bindUserId) {
        const bindOpenId = useMockOAuthFlow
          ? resolveWeChatAbilityMockOpenId()
          : (await oauthService.exchangeCodeForSession(code)).openId;
        if (!bindOpenId) {
          throw new Error("Mock WeChat openid is not configured");
        }

        const occupiedUser = await userRepo.findByOpenId(bindOpenId);
        if (occupiedUser && occupiedUser.status === "ACTIVE") {
          clearAnonymousSessionCookie(c);
          clearOAuthStateCookieByNonce(c, state);
          clearOAuthStateCookie(c);
          assertOAuthPublicAuthenticatedUser(occupiedUser);

          return await respondAuthenticatedSuccess(
            appendBindResultToReturnTo(statePayload.returnTo, "success"),
            occupiedUser,
          );
        }

        const bindTargetUser = await resolveActiveUserById(statePayload.bindUserId as UserId);
        let boundUser: User;

        if (hasUserRole(bindTargetUser.role, "anonymous")) {
          const upgraded = await upgradeAnonymousUserWithWeChat({
            userId: bindTargetUser.id,
            openId: bindOpenId,
            profile: null,
          });
          if (!upgraded) {
            throw new Error("Failed to upgrade anonymous user");
          }
          boundUser = await resolveActiveUserById(upgraded.userId);
        } else {
          await bindWeChatToCurrentUser(bindTargetUser.id, bindOpenId);
          boundUser = await resolveActiveUserById(bindTargetUser.id);
        }

        clearAnonymousSessionCookie(c);
        clearOAuthStateCookieByNonce(c, state);
        clearOAuthStateCookie(c);
        assertOAuthPublicAuthenticatedUser(boundUser);

        return await respondAuthenticatedSuccess(
          appendBindResultToReturnTo(statePayload.returnTo, "success"),
          boundUser,
        );
      }

      let loginOpenId: string | null = null;
      let loginSession: WeChatOAuthLoginSession | null = null;

      if (useMockOAuthFlow) {
        loginOpenId = resolveWeChatAbilityMockOpenId();
      } else {
        const session = await oauthService.exchangeCodeForSession(code);
        loginSession = session;
        loginOpenId = session.openId;
      }

      if (!loginOpenId) {
        throw new Error("Mock WeChat openid is not configured");
      }

      const existingUser = await userRepo.findByOpenId(loginOpenId);
      if (existingUser) {
        scheduleWeChatProfileRefreshIfMissing({
          user: existingUser,
          session: loginSession,
        });
        clearAnonymousSessionCookie(c);
        clearOAuthStateCookieByNonce(c, state);
        clearOAuthStateCookie(c);
        return await respondAuthenticatedSuccess(statePayload.returnTo, existingUser);
      }

      const bindCandidateUserId =
        (statePayload.bindUserId as UserId | null) ??
        (statePayload.anonymousUserId as UserId | null) ??
        readSessionUserId(c);
      if (bindCandidateUserId) {
        const bindCandidateUser = await userRepo.findById(bindCandidateUserId);
        if (
          bindCandidateUser &&
          bindCandidateUser.status === "ACTIVE" &&
          !bindCandidateUser.openId
        ) {
          let boundCandidate: User | null = null;
          if (hasUserRole(bindCandidateUser.role, "anonymous")) {
            const upgraded = await upgradeAnonymousUserWithWeChat({
              userId: bindCandidateUser.id,
              openId: loginOpenId,
              profile: null,
            });
            if (upgraded) {
              boundCandidate = await resolveActiveUserById(upgraded.userId);
              scheduleWeChatProfileRefreshIfMissing({
                user: boundCandidate,
                session: loginSession,
              });
            }
          } else {
            await bindWeChatToCurrentUser(bindCandidateUser.id, loginOpenId);
            boundCandidate = await userRepo.findById(bindCandidateUser.id);
            if (boundCandidate) {
              scheduleWeChatProfileRefreshIfMissing({
                user: boundCandidate,
                session: loginSession,
              });
            }
          }

          if (boundCandidate && boundCandidate.status === "ACTIVE") {
            clearAnonymousSessionCookie(c);
            clearOAuthStateCookieByNonce(c, state);
            clearOAuthStateCookie(c);
            return await respondAuthenticatedSuccess(statePayload.returnTo, boundCandidate);
          }
        }
      }

      const createdUser = await userRepo.createIfNotExists({
        id: randomUUID() as UserId,
        openId: loginOpenId,
        role: ["authenticated"],
        status: "ACTIVE",
        nickname: null,
        sex: null,
        avatar: null,
      });
      const resolvedUser = createdUser ?? (await userRepo.findByOpenId(loginOpenId));
      if (!resolvedUser || resolvedUser.status !== "ACTIVE") {
        throw new Error("Failed to create user for WeChat OAuth login");
      }
      scheduleWeChatProfileRefreshIfMissing({
        user: resolvedUser,
        session: loginSession,
      });

      clearAnonymousSessionCookie(c);
      clearOAuthStateCookieByNonce(c, state);
      clearOAuthStateCookie(c);
      return await respondAuthenticatedSuccess(statePayload.returnTo, resolvedUser);
    } catch (error) {
      clearOAuthStateCookieByNonce(c, state);
      clearOAuthStateCookie(c);
      if (statePayload.mode === "bind") {
        c.set("suppressAccessTokenHeader", true);
        return respondSuccess(appendBindResultToReturnTo(statePayload.returnTo, "failed"));
      }

      if (error instanceof ProblemDetailsError) {
        return respondError(
          error.status as ContentfulStatusCode,
          error.message,
          statePayload.returnTo,
        );
      }

      return respondError(500, "WeChat OAuth callback failed", statePayload.returnTo);
    }
  });
