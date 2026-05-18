import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { randomUUID } from "crypto";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import {
  authMiddleware,
  issueAuthForUser,
  type AuthEnv,
} from "../auth/middleware";
import { env } from "../lib/env";
import {
  isWeChatAbilityMockingEnabled,
  resolveWeChatAbilityMockOpenId,
} from "../lib/wechat-ability-mocking";
import { WeChatJssdkService } from "../services/WeChatJssdkService";
import {
  WeChatOAuthService,
  type WeChatOAuthLoginSession,
} from "../services/WeChatOAuthService";
import { UserRepository } from "../repositories/UserRepository";
import { UserNotificationOptRepository } from "../repositories/UserNotificationOptRepository";
import {
  bindWeChatToCurrentUser,
  upgradeAnonymousUserWithWeChat,
} from "../domains/user";
import { scheduleAlternativeWaitlistNotificationsForUserSources } from "../domains/pr-core/services/waitlist-alternative-reminder.service";
import {
  clearAnonymousSessionCookie,
  readAnonymousSessionCookie,
} from "../auth/anonymous-session";
import {
  cancelWeChatActivityStartReminderJobsForUser,
  cancelWeChatMeetingPointUpdatedJobsForUser,
  cancelWeChatNewPartnerJobsForUser,
  cancelWeChatPRMessageJobsForUser,
  cancelWeChatReminderJobsForUser,
  cancelWeChatWaitlistPromotedJobsForUser,
  cancelWeChatWaitlistAlternativeAvailableJobsForUser,
  rebuildWeChatActivityStartReminderJobsForUser,
  rebuildWeChatReminderJobsForUser,
} from "../infra/notifications";
import { hasUserRole, type User, type UserId } from "../entities/user";
import {
  wechatNotificationKindSchema,
  type WeChatNotificationKind,
} from "../entities/user-notification-opt";
import { WeChatSubscriptionMessageService } from "../services/WeChatSubscriptionMessageService";
import { ingestTelemetryEvents } from "../infra/telemetry";

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
const ANCHOR_USER_AUTH_REQUIRED_CODE = "ANCHOR_USER_AUTH_REQUIRED";
const WECHAT_BIND_REQUIRED_CODE = "WECHAT_BIND_REQUIRED";

const signatureQuerySchema = z.object({
  url: z.string().min(1),
});

const oauthLoginQuerySchema = z.object({
  returnTo: z.string().optional(),
  traceId: z.string().uuid().optional(),
  traceStartedAtMs: z.coerce.number().int().positive().optional(),
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

const oauthStateCookiePayloadSchema = z.object({
  nonce: z.string().min(1),
  returnTo: z.string().url(),
  mode: z.enum(["login", "bind"]),
  bindUserId: z.string().uuid().nullable(),
  anonymousUserId: z.string().uuid().nullable(),
  traceId: z.string().uuid().nullable().optional(),
  traceStartedAtMs: z.number().int().positive().nullable().optional(),
  backendLoginStartedAtMs: z.number().int().positive().nullable().optional(),
  expiresAtMs: z.number().int().positive(),
});

const oauthCallbackAuthPayloadSchema = z.object({
  role: z.enum(["authenticated", "service", "analytics"]),
  roles: z.array(z.enum(["anonymous", "authenticated", "service", "analytics"])),
  userId: z.string().uuid(),
  accessToken: z.string().min(1),
});

const oauthHandoffCookiePayloadSchema = z.object({
  nonce: z.string().min(1),
  userId: z.string().uuid(),
  traceId: z.string().uuid().nullable().optional(),
  traceStartedAtMs: z.number().int().positive().nullable().optional(),
  backendLoginStartedAtMs: z.number().int().positive().nullable().optional(),
  backendCallbackStartedAtMs: z.number().int().positive().nullable().optional(),
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
type OAuthHandoffCookiePayload = z.infer<
  typeof oauthHandoffCookiePayloadSchema
>;
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

type OAuthTraceStage =
  | "backend_login_received"
  | "backend_login_redirect_prepared"
  | "backend_bind_received"
  | "backend_bind_redirect_prepared"
  | "backend_callback_state_validated"
  | "backend_code_exchange_completed"
  | "backend_user_resolution_completed"
  | "backend_callback_redirect_prepared"
  | "backend_callback_json_success"
  | "backend_callback_failed"
  | "backend_handoff_received"
  | "backend_handoff_completed"
  | "backend_handoff_failed";

type OAuthTraceContext = {
  traceId: string | null;
  traceStartedAtMs: number | null;
  backendLoginStartedAtMs: number | null;
  backendCallbackStartedAtMs?: number | null;
};

const resolveElapsedMs = (
  startedAtMs: number | null | undefined,
  endedAtMs = nowMs(),
): number | undefined => {
  if (!startedAtMs || startedAtMs > endedAtMs) return undefined;
  return endedAtMs - startedAtMs;
};

const buildOAuthTraceContext = (input: {
  traceId?: string | null;
  traceStartedAtMs?: number | null;
  backendLoginStartedAtMs?: number | null;
  backendCallbackStartedAtMs?: number | null;
}): OAuthTraceContext => ({
  traceId: input.traceId ?? null,
  traceStartedAtMs: input.traceStartedAtMs ?? null,
  backendLoginStartedAtMs: input.backendLoginStartedAtMs ?? null,
  backendCallbackStartedAtMs: input.backendCallbackStartedAtMs ?? null,
});

const recordWeChatOAuthTrace = (input: {
  context: OAuthTraceContext;
  stage: OAuthTraceStage;
  durationMs?: number;
  result?: "success" | "failure";
  mode?: OAuthStateMode;
  branch?: string;
  status?: number;
  errorCode?: string;
}): void => {
  const { traceId } = input.context;
  if (!traceId) return;

  const occurredAt = new Date().toISOString();
  const payload: Record<string, unknown> = {
    traceId,
    stage: input.stage,
    durationMs: input.durationMs,
    sinceFrontendStartMs: resolveElapsedMs(input.context.traceStartedAtMs),
    sinceBackendLoginStartMs: resolveElapsedMs(
      input.context.backendLoginStartedAtMs,
    ),
    sinceBackendCallbackStartMs: resolveElapsedMs(
      input.context.backendCallbackStartedAtMs,
    ),
    result: input.result,
    mode: input.mode,
    branch: input.branch,
    status: input.status,
    errorCode: input.errorCode,
  };

  console.info("[WeChatOAuthTrace]", payload);
  void ingestTelemetryEvents([
    {
      type: "wechat_oauth_trace",
      source: "backend",
      sessionId: traceId,
      requestId: traceId,
      payload,
      occurredAt,
    },
  ]).catch((error) => {
    console.error("[WeChatOAuthTrace] ingest failed", {
      traceId,
      stage: input.stage,
      error: error instanceof Error ? error.message : String(error),
    });
  });
};

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
    waitlistPromotedTemplateId,
  ] = await Promise.all([
    subscriptionMessageService.getConfirmationReminderTemplateId(),
    subscriptionMessageService.getActivityStartReminderTemplateId(),
    subscriptionMessageService.getNewPartnerTemplateId(),
    subscriptionMessageService.getPRMessageTemplateId(),
    subscriptionMessageService.getMeetingPointUpdatedTemplateId(),
    subscriptionMessageService.getWaitlistPromotedTemplateId(),
  ]);

  const [
    reminderSubmsgConfigured,
    activityStartReminderSubmsgConfigured,
    newPartnerSubmsgConfigured,
    prMessageSubmsgConfigured,
    meetingPointUpdatedSubmsgConfigured,
    waitlistPromotedSubmsgConfigured,
  ] = await Promise.all([
    subscriptionMessageService.isConfirmationReminderConfigured(),
    subscriptionMessageService.isActivityStartReminderConfigured(),
    subscriptionMessageService.isNewPartnerConfigured(),
    subscriptionMessageService.isPRMessageConfigured(),
    subscriptionMessageService.isMeetingPointUpdatedConfigured(),
    subscriptionMessageService.isWaitlistPromotedConfigured(),
  ]);

  return {
    reminder: {
      configured: reminderSubmsgConfigured,
      requiresOpenSubscribe:
        reminderSubmsgConfigured && Boolean(reminderTemplateId),
      templateId: reminderTemplateId,
    },
    activityStartReminder: {
      configured: activityStartReminderSubmsgConfigured,
      requiresOpenSubscribe:
        activityStartReminderSubmsgConfigured &&
        Boolean(activityStartReminderTemplateId),
      templateId: activityStartReminderTemplateId,
    },
    newPartner: {
      configured: newPartnerSubmsgConfigured,
      requiresOpenSubscribe:
        newPartnerSubmsgConfigured && Boolean(newPartnerTemplateId),
      templateId: newPartnerTemplateId,
    },
    prMessage: {
      configured: prMessageSubmsgConfigured,
      requiresOpenSubscribe:
        prMessageSubmsgConfigured && Boolean(prMessageTemplateId),
      templateId: prMessageTemplateId,
    },
    meetingPointUpdated: {
      configured: meetingPointUpdatedSubmsgConfigured,
      requiresOpenSubscribe:
        meetingPointUpdatedSubmsgConfigured &&
        Boolean(meetingPointUpdatedTemplateId),
      templateId: meetingPointUpdatedTemplateId,
    },
    waitlistPromoted: {
      configured: waitlistPromotedSubmsgConfigured,
      requiresOpenSubscribe:
        waitlistPromotedSubmsgConfigured &&
        Boolean(waitlistPromotedTemplateId),
      templateId: waitlistPromotedTemplateId,
    },
    waitlistAlternativeAvailable: {
      configured: waitlistPromotedSubmsgConfigured,
      requiresOpenSubscribe:
        waitlistPromotedSubmsgConfigured &&
        Boolean(waitlistPromotedTemplateId),
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
        requiresOpenSubscribe:
          channels.activityStartReminder.requiresOpenSubscribe,
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
        requiresOpenSubscribe:
          channels.meetingPointUpdated.requiresOpenSubscribe,
        templateId: channels.meetingPointUpdated.templateId,
      },
      WAITLIST_PROMOTED: {
        enabled: false,
        optInAt: null,
        remainingCount: 0,
        configured: channels.waitlistPromoted.configured,
        requiresOpenSubscribe:
          channels.waitlistPromoted.requiresOpenSubscribe,
        templateId: channels.waitlistPromoted.templateId,
      },
      WAITLIST_ALTERNATIVE_AVAILABLE: {
        enabled: false,
        optInAt: null,
        remainingCount: 0,
        configured: channels.waitlistAlternativeAvailable.configured,
        requiresOpenSubscribe:
          channels.waitlistAlternativeAvailable.requiresOpenSubscribe,
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
  const prMessage = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    "PR_MESSAGE",
  );
  const meetingPointUpdated = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    "MEETING_POINT_UPDATED",
  );
  const waitlistPromoted = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    "WAITLIST_PROMOTED",
  );
  const waitlistAlternativeAvailable =
    userNotificationOptRepo.getSubscriptionSnapshot(
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
        optInAt: activityStartReminder.optInAt
          ? activityStartReminder.optInAt.toISOString()
          : null,
        remainingCount: activityStartReminder.remainingCount,
        configured: channels.activityStartReminder.configured,
        requiresOpenSubscribe:
          channels.activityStartReminder.requiresOpenSubscribe,
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
        optInAt: meetingPointUpdated.optInAt
          ? meetingPointUpdated.optInAt.toISOString()
          : null,
        remainingCount: meetingPointUpdated.remainingCount,
        configured: channels.meetingPointUpdated.configured,
        requiresOpenSubscribe:
          channels.meetingPointUpdated.requiresOpenSubscribe,
        templateId: channels.meetingPointUpdated.templateId,
      },
      WAITLIST_PROMOTED: {
        enabled: waitlistPromoted.enabled,
        optInAt: waitlistPromoted.optInAt
          ? waitlistPromoted.optInAt.toISOString()
          : null,
        remainingCount: waitlistPromoted.remainingCount,
        configured: channels.waitlistPromoted.configured,
        requiresOpenSubscribe:
          channels.waitlistPromoted.requiresOpenSubscribe,
        templateId: channels.waitlistPromoted.templateId,
      },
      WAITLIST_ALTERNATIVE_AVAILABLE: {
        enabled: waitlistAlternativeAvailable.enabled,
        optInAt: waitlistAlternativeAvailable.optInAt
          ? waitlistAlternativeAvailable.optInAt.toISOString()
          : null,
        remainingCount: waitlistAlternativeAvailable.remainingCount,
        configured: channels.waitlistAlternativeAvailable.configured,
        requiresOpenSubscribe:
          channels.waitlistAlternativeAvailable.requiresOpenSubscribe,
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
      return cancelWeChatReminderJobsForUser(userId);
    }
    if (previousRemainingCount <= 0 && nextRemainingCount > 0) {
      await rebuildWeChatReminderJobsForUser(userId);
      return 0;
    }
    return 0;
  }

  if (kind === "ACTIVITY_START_REMINDER") {
    if (nextRemainingCount <= 0) {
      return cancelWeChatActivityStartReminderJobsForUser(userId);
    }
    if (previousRemainingCount <= 0 && nextRemainingCount > 0) {
      await rebuildWeChatActivityStartReminderJobsForUser(userId);
      return 0;
    }
    return 0;
  }

  if (kind === "NEW_PARTNER" && nextRemainingCount <= 0) {
    return cancelWeChatNewPartnerJobsForUser(userId);
  }

  if (kind === "PR_MESSAGE" && nextRemainingCount <= 0) {
    return cancelWeChatPRMessageJobsForUser(userId);
  }

  if (kind === "MEETING_POINT_UPDATED" && nextRemainingCount <= 0) {
    return cancelWeChatMeetingPointUpdatedJobsForUser(userId);
  }

  if (kind === "WAITLIST_PROMOTED" && nextRemainingCount <= 0) {
    return cancelWeChatWaitlistPromotedJobsForUser(userId);
  }

  if (
    kind === "WAITLIST_ALTERNATIVE_AVAILABLE" &&
    nextRemainingCount <= 0
  ) {
    return cancelWeChatWaitlistAlternativeAvailableJobsForUser(userId);
  }
  if (
    kind === "WAITLIST_ALTERNATIVE_AVAILABLE" &&
    previousRemainingCount <= 0 &&
    nextRemainingCount > 0
  ) {
    await scheduleAlternativeWaitlistNotificationsForUserSources(userId);
    return 0;
  }

  return 0;
};

const isHttpProtocol = (protocol: string): boolean =>
  protocol === "http:" || protocol === "https:";

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
  const normalizedForwardedProto = forwardedProto
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  if (normalizedForwardedProto === "https") return true;

  try {
    return new URL(c.req.url).protocol === "https:";
  } catch {
    return false;
  }
};

const firstForwardedHeaderValue = (
  rawValue: string | undefined,
): string | null => {
  const value = rawValue?.split(",")[0]?.trim();
  return value && value.length > 0 ? value : null;
};

const resolveForwardedProtocol = (
  rawValue: string | undefined,
): string | null => {
  const value = firstForwardedHeaderValue(rawValue)?.toLowerCase();
  if (value === "http" || value === "http:") return "http:";
  if (value === "https" || value === "https:") return "https:";
  return null;
};

const resolvePublicRequestUrl = (c: Context): URL => {
  const url = new URL(c.req.url);
  const forwardedProtocol = resolveForwardedProtocol(
    c.req.header("x-forwarded-proto"),
  );
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

const decodeSignedPayload = <T>(
  rawValue: string,
  schema: z.ZodType<T>,
): T | null => {
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
  deleteCookie(
    c,
    resolveOAuthStateCookieName(nonce),
    resolveCookieBaseOptions(c),
  );
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
  deleteCookie(
    c,
    resolveOAuthHandoffCookieName(nonce),
    resolveOAuthHandoffCookieOptions(c),
  );
};

const collectAllowedReturnToOrigins = (c: Context): Set<string> => {
  const origins = new Set<string>();

  origins.add(resolvePublicRequestUrl(c).origin);

  const frontendUrl = parseHttpUrl(env.FRONTEND_URL);
  if (frontendUrl) {
    origins.add(frontendUrl.origin);
  }

  const originHeader = parseHttpUrl(c.req.header("origin"));
  if (originHeader) {
    origins.add(originHeader.origin);
  }

  const refererHeader = parseHttpUrl(c.req.header("referer"));
  if (refererHeader) {
    origins.add(refererHeader.origin);
  }

  return origins;
};

const resolveFallbackReturnTo = (c: Context): string => {
  const referer = parseHttpUrl(c.req.header("referer"));
  if (referer) {
    return referer.toString();
  }

  const frontendUrl = parseHttpUrl(env.FRONTEND_URL);
  if (frontendUrl) {
    return frontendUrl.toString();
  }

  const requestUrl = resolvePublicRequestUrl(c);
  requestUrl.pathname = "/";
  requestUrl.search = "";
  requestUrl.hash = "";
  return requestUrl.toString();
};

const resolveReturnTo = (
  rawReturnTo: string | undefined,
  c: Context,
): string => {
  const trimmedReturnTo = rawReturnTo?.trim();
  if (!trimmedReturnTo) {
    return resolveFallbackReturnTo(c);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmedReturnTo, resolvePublicRequestUrl(c).origin);
  } catch {
    throw new Error("Invalid returnTo");
  }

  if (!isHttpProtocol(parsed.protocol)) {
    throw new Error("Invalid returnTo protocol");
  }

  const allowedOrigins = collectAllowedReturnToOrigins(c);
  if (allowedOrigins.size > 0 && !allowedOrigins.has(parsed.origin)) {
    throw new Error("returnTo origin is not allowed");
  }

  return parsed.toString();
};

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

const resolveMockOAuthCallbackUrl = (
  c: Context,
  state: string,
): string => {
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

const appendOAuthHandoffToReturnTo = (
  returnTo: string,
  handoffNonce: string,
): string => {
  const url = new URL(returnTo);
  url.searchParams.set(OAUTH_HANDOFF_QUERY_PARAM, handoffNonce);
  return url.toString();
};

const setOAuthStateCookie = async (
  c: Context,
  payload: OAuthStateCookiePayload,
): Promise<void> => {
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
  await setSignedCookie(
    c,
    OAUTH_STATE_COOKIE_NAME,
    encodeSignedPayload(payload),
    sessionSecret,
    {
      ...resolveCookieBaseOptions(c),
      maxAge: OAUTH_STATE_TTL_SECONDS,
    },
  );
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
  traceContext: OAuthTraceContext = buildOAuthTraceContext({}),
): OAuthStateCookiePayload => ({
  nonce: randomUUID(),
  returnTo,
  mode,
  bindUserId,
  anonymousUserId,
  traceId: traceContext.traceId,
  traceStartedAtMs: traceContext.traceStartedAtMs,
  backendLoginStartedAtMs: traceContext.backendLoginStartedAtMs,
  expiresAtMs: nowMs() + OAUTH_STATE_TTL_SECONDS * 1000,
});

const buildOAuthHandoffPayload = (
  userId: UserId,
  traceContext: OAuthTraceContext = buildOAuthTraceContext({}),
): OAuthHandoffCookiePayload => ({
  nonce: randomUUID(),
  userId,
  traceId: traceContext.traceId,
  traceStartedAtMs: traceContext.traceStartedAtMs,
  backendLoginStartedAtMs: traceContext.backendLoginStartedAtMs,
  backendCallbackStartedAtMs: traceContext.backendCallbackStartedAtMs,
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

const issueOAuthCallbackAuth = async (
  c: Context<AuthEnv>,
  user: User,
): Promise<OAuthCallbackAuthPayload> => {
  const authenticated = issueAuthForUser(user);
  if (authenticated.role === "anonymous") {
    throw new Error("OAuth callback user must have an authenticated role");
  }
  c.set("auth", authenticated);

  return {
    role: authenticated.role,
    roles: authenticated.roles,
    userId: user.id,
    accessToken: authenticated.token,
  };
};

type DeferredWeChatProfileRefreshReason =
  | "login_existing_user"
  | "login_anonymous_upgrade"
  | "login_authenticated_bind"
  | "login_created_user";

const hasMissingWeChatProfile = (
  user: Pick<User, "nickname" | "sex" | "avatar">,
): boolean => !user.nickname || user.sex === null || !user.avatar;

const fetchAndApplyWeChatProfileIfMissing = async (input: {
  userId: UserId;
  session: WeChatOAuthLoginSession;
  reason: DeferredWeChatProfileRefreshReason;
}): Promise<void> => {
  const startedAtMs = Date.now();
  try {
    const profile = await oauthService.fetchUserInfo(
      input.session.oauthAccessToken,
      input.session.openId,
      input.session.scope,
    );
    const updatedUser = await userRepo.updateWeChatProfileFieldsIfMissing({
      userId: input.userId,
      nickname: profile.nickname,
      sex: profile.sex,
      avatar: profile.avatar,
    });
    console.log("[WeChatOAuth] profile refresh completed", {
      reason: input.reason,
      durationMs: Date.now() - startedAtMs,
      updated: Boolean(updatedUser),
    });
  } catch (error) {
    console.error("[WeChatOAuth] profile refresh failed", {
      reason: input.reason,
      durationMs: Date.now() - startedAtMs,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const scheduleWeChatProfileRefreshIfMissing = (input: {
  user: Pick<User, "id" | "nickname" | "sex" | "avatar">;
  session: WeChatOAuthLoginSession | null;
  reason: DeferredWeChatProfileRefreshReason;
}): void => {
  const session = input.session;
  if (!session || !hasMissingWeChatProfile(input.user)) {
    return;
  }

  setTimeout(() => {
    void fetchAndApplyWeChatProfileIfMissing({
      userId: input.user.id,
      session,
      reason: input.reason,
    });
  }, 0);
};

const resolveAuthenticatedBoundUser = async (
  c: Context,
): Promise<
  | { ok: true; user: User }
  | { ok: false; status: 401; payload: { error: string; code: string } }
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
        code: ANCHOR_USER_AUTH_REQUIRED_CODE,
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
        code: ANCHOR_USER_AUTH_REQUIRED_CODE,
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
  .get(
    "/jssdk-signature",
    zValidator("query", signatureQuerySchema),
    async (c) => {
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
        const message =
          error instanceof Error ? error.message : "WeChat signature failed";
        return c.json({ error: message }, 500);
      }
    },
  )
  .get("/official-account/follow-status", async (c) => {
    const userId = readSessionUserId(c);
    if (!userId) {
      return c.json({
        status: "UNKNOWN" as const,
        followedAt: null,
      });
    }

    const user = await userRepo.findById(userId);
    if (
      !user ||
      user.status !== "ACTIVE" ||
      !user.wechatOfficialAccountFollowedAt
    ) {
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
      if (identity.payload.code === ANCHOR_USER_AUTH_REQUIRED_CODE) {
        return c.json(fallback);
      }
      return c.json({
        ...fallback,
        authenticated: true,
      });
    }

    return c.json(
      await buildAuthenticatedSubscriptionsResponse(identity.user.id),
    );
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
      const currentNotificationOpt = await userNotificationOptRepo.findByUserId(
        identity.user.id,
      );
      const previousSnapshot = userNotificationOptRepo.getSubscriptionSnapshot(
        currentNotificationOpt,
        kind,
      );
      const updatedNotificationOpt =
        action === "ADD_ONE"
          ? await userNotificationOptRepo.addOneWechatNotificationCredit(
              identity.user.id,
              kind,
            )
          : await userNotificationOptRepo.clearWechatNotificationCredits(
              identity.user.id,
              kind,
            );
      if (!updatedNotificationOpt) {
        return c.json(
          { error: "Failed to update notification subscription" },
          500,
        );
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
      const fullState = await buildAuthenticatedSubscriptionsResponse(
        identity.user.id,
      );
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
      const authenticated =
        identity.payload.code === ANCHOR_USER_AUTH_REQUIRED_CODE ? false : true;
      return c.json({
        configured: fallback.configured && reminder.configured,
        authenticated,
        wechatBound: false,
        enabled: reminder.enabled,
        optInAt: reminder.optInAt,
        remainingCount: reminder.remainingCount,
      });
    }

    const fullState = await buildAuthenticatedSubscriptionsResponse(
      identity.user.id,
    );
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
      const currentNotificationOpt = await userNotificationOptRepo.findByUserId(
        identity.user.id,
      );
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
      const fullState = await buildAuthenticatedSubscriptionsResponse(
        identity.user.id,
      );
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
  .get(
    "/oauth/mock/authorize",
    zValidator("query", oauthMockAuthorizeQuerySchema),
    async (c) => {
      if (!isWeChatAbilityMockingEnabled()) {
        return c.json({ error: "Mock OAuth is not enabled" }, 404);
      }

      if (!resolveWeChatAbilityMockOpenId()) {
        return c.json({ error: "Mock WeChat openid is not configured" }, 503);
      }

      const { state } = c.req.valid("query");
      return c.redirect(resolveMockOAuthCallbackUrl(c, state), 302);
    },
  )
  .get(
    "/oauth/login",
    zValidator("query", oauthLoginQuerySchema),
    async (c) => {
      const loginStartedAtMs = nowMs();
      const {
        returnTo: rawReturnTo,
        traceId,
        traceStartedAtMs,
      } = c.req.valid("query");
      const traceContext = buildOAuthTraceContext({
        traceId: traceId ?? null,
        traceStartedAtMs: traceStartedAtMs ?? null,
        backendLoginStartedAtMs: loginStartedAtMs,
      });
      recordWeChatOAuthTrace({
        context: traceContext,
        stage: "backend_login_received",
        mode: "login",
      });

      let returnTo: string;
      try {
        returnTo = resolveReturnTo(rawReturnTo, c);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid returnTo";
        return c.json({ error: message }, 400);
      }

      const sessionUserId = readSessionUserId(c);
      const auth = c.get("auth");
      const bindUserId =
        auth.role === "anonymous" || !sessionUserId ? null : sessionUserId;
      const anonymousUserId =
        auth.role === "anonymous"
          ? (sessionUserId ?? (await readAnonymousSessionCookie(c)))
          : null;

      if (isWeChatAbilityMockingEnabled()) {
        const mockOpenId = resolveWeChatAbilityMockOpenId();
        if (!mockOpenId) {
          return c.json({ error: "Mock WeChat openid is not configured" }, 503);
        }

        const statePayload = buildOAuthStatePayload(
          returnTo,
          "login",
          bindUserId,
          anonymousUserId,
          traceContext,
        );
        await setOAuthStateCookie(c, statePayload);
        const mockAuthorizeUrl = resolveMockOAuthAuthorizeUrl(
          c,
          statePayload.nonce,
        );
        recordWeChatOAuthTrace({
          context: traceContext,
          stage: "backend_login_redirect_prepared",
          mode: "login",
          durationMs: nowMs() - loginStartedAtMs,
          result: "success",
          branch: "mock",
        });
        return c.redirect(mockAuthorizeUrl, 302);
      }

      if (!oauthService.isConfigured()) {
        return c.json({ error: "WeChat OAuth is not configured" }, 503);
      }

      const statePayload = buildOAuthStatePayload(
        returnTo,
        "login",
        bindUserId,
        anonymousUserId,
        traceContext,
      );
      await setOAuthStateCookie(c, statePayload);

      const callbackUrl = resolveOAuthCallbackUrl(c);
      const authorizeUrl = oauthService.createAuthorizeUrl(
        callbackUrl,
        statePayload.nonce,
      );

      recordWeChatOAuthTrace({
        context: traceContext,
        stage: "backend_login_redirect_prepared",
        mode: "login",
        durationMs: nowMs() - loginStartedAtMs,
        result: "success",
        branch: "wechat",
      });
      return c.redirect(authorizeUrl, 302);
    },
  )
  .get("/oauth/bind", zValidator("query", oauthLoginQuerySchema), async (c) => {
    const bindStartedAtMs = nowMs();
    const {
      returnTo: rawReturnTo,
      traceId,
      traceStartedAtMs,
    } = c.req.valid("query");
    const traceContext = buildOAuthTraceContext({
      traceId: traceId ?? null,
      traceStartedAtMs: traceStartedAtMs ?? null,
      backendLoginStartedAtMs: bindStartedAtMs,
    });
    recordWeChatOAuthTrace({
      context: traceContext,
      stage: "backend_bind_received",
      mode: "bind",
    });

    if (!isOAuthRuntimeAvailable()) {
      return c.json({ error: "WeChat OAuth is not configured" }, 503);
    }

    let returnTo: string;
    try {
      returnTo = resolveReturnTo(rawReturnTo, c);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid returnTo";
      return c.json({ error: message }, 400);
    }

    let currentUserId: UserId;
    try {
      currentUserId = requireAuthenticatedUserId(c);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication required";
      return c.json({ error: message }, 401);
    }

    const currentUser = await userRepo.findById(currentUserId);
    if (!currentUser) {
      return c.json({ error: "Authenticated user not found" }, 404);
    }
    if (currentUser.openId) {
      return c.json({ error: "Current user is already bound to WeChat" }, 409);
    }

    const statePayload = buildOAuthStatePayload(
      returnTo,
      "bind",
      currentUserId,
      null,
      traceContext,
    );
    await setOAuthStateCookie(c, statePayload);

    const authorizeUrl = isWeChatAbilityMockingEnabled()
      ? resolveMockOAuthAuthorizeUrl(c, statePayload.nonce)
      : oauthService.isConfigured()
        ? oauthService.createAuthorizeUrl(
            resolveOAuthCallbackUrl(c),
            statePayload.nonce,
          )
        : null;
    if (!authorizeUrl) {
      return c.json({ error: "WeChat OAuth is not configured" }, 503);
    }

    recordWeChatOAuthTrace({
      context: traceContext,
      stage: "backend_bind_redirect_prepared",
      mode: "bind",
      durationMs: nowMs() - bindStartedAtMs,
      result: "success",
      branch: isWeChatAbilityMockingEnabled() ? "mock" : "wechat",
    });
    return c.json({ authorizeUrl });
  })
  .get(
    "/oauth/handoff",
    zValidator("query", oauthHandoffQuerySchema),
    async (c) => {
      const handoffStartedAtMs = nowMs();
      const { handoff } = c.req.valid("query");
      const sessionSecret = resolveOAuthSessionSecret();
      if (!sessionSecret) {
        return c.json({ error: "WeChat OAuth is not configured" }, 503);
      }

      const payload = await readSignedCookiePayload(
        c,
        resolveOAuthHandoffCookieName(handoff),
        sessionSecret,
        oauthHandoffCookiePayloadSchema,
      );

      clearOAuthHandoffCookieByNonce(c, handoff);

      if (!payload) {
        return c.json({ error: "Invalid OAuth handoff" }, 400);
      }
      const traceContext = buildOAuthTraceContext({
        traceId: payload.traceId,
        traceStartedAtMs: payload.traceStartedAtMs,
        backendLoginStartedAtMs: payload.backendLoginStartedAtMs,
        backendCallbackStartedAtMs: payload.backendCallbackStartedAtMs,
      });
      recordWeChatOAuthTrace({
        context: traceContext,
        stage: "backend_handoff_received",
      });
      if (payload.expiresAtMs <= nowMs()) {
        recordWeChatOAuthTrace({
          context: traceContext,
          stage: "backend_handoff_failed",
          durationMs: nowMs() - handoffStartedAtMs,
          result: "failure",
          status: 400,
          errorCode: "expired",
        });
        return c.json({ error: "OAuth handoff expired" }, 400);
      }
      if (payload.nonce !== handoff) {
        recordWeChatOAuthTrace({
          context: traceContext,
          stage: "backend_handoff_failed",
          durationMs: nowMs() - handoffStartedAtMs,
          result: "failure",
          status: 400,
          errorCode: "mismatch",
        });
        return c.json({ error: "OAuth handoff mismatch" }, 400);
      }

      const user = await userRepo.findById(payload.userId as UserId);
      if (!user || user.status !== "ACTIVE") {
        recordWeChatOAuthTrace({
          context: traceContext,
          stage: "backend_handoff_failed",
          durationMs: nowMs() - handoffStartedAtMs,
          result: "failure",
          status: 401,
          errorCode: "user_not_found",
        });
        return c.json({ error: "OAuth handoff user not found" }, 401);
      }

      const authPayload = await issueOAuthCallbackAuth(c, user);
      recordWeChatOAuthTrace({
        context: traceContext,
        stage: "backend_handoff_completed",
        durationMs: nowMs() - handoffStartedAtMs,
        result: "success",
      });
      return c.json({
        ok: true,
        auth: authPayload,
        traceId: payload.traceId ?? undefined,
      });
    },
  )
  .get(
    "/oauth/callback",
    zValidator("query", oauthCallbackQuerySchema),
    async (c) => {
      const callbackStartedAtMs = nowMs();
      const respondError = (
        status: ContentfulStatusCode,
        error: string,
        returnTo?: string | null,
      ) =>
        c.json({ ok: false, error, returnTo: returnTo ?? undefined }, status);
      const respondSuccess = async (returnTo: string) => {
        if (!isOAuthCallbackNavigationRequest(c)) {
          return c.json({ ok: true, returnTo });
        }

        return c.redirect(returnTo, 302);
      };
      const respondAuthenticatedSuccess = async (
        returnTo: string,
        user: User,
        traceContext: OAuthTraceContext,
        branch: string,
      ) => {
        if (!isOAuthCallbackNavigationRequest(c)) {
          const authPayload = await issueOAuthCallbackAuth(c, user);
          recordWeChatOAuthTrace({
            context: traceContext,
            stage: "backend_callback_json_success",
            durationMs: nowMs() - callbackStartedAtMs,
            result: "success",
            branch,
          });
          return c.json({ ok: true, returnTo, auth: authPayload });
        }

        const handoffPayload = buildOAuthHandoffPayload(user.id, traceContext);
        await setOAuthHandoffCookie(c, handoffPayload);
        recordWeChatOAuthTrace({
          context: traceContext,
          stage: "backend_callback_redirect_prepared",
          durationMs: nowMs() - callbackStartedAtMs,
          result: "success",
          branch,
        });
        return c.redirect(
          appendOAuthHandoffToReturnTo(returnTo, handoffPayload.nonce),
          302,
        );
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

      const useMockOAuthFlow =
        isWeChatAbilityMockingEnabled() && code === OAUTH_MOCK_CODE;
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

      const traceContext = buildOAuthTraceContext({
        traceId: statePayload.traceId,
        traceStartedAtMs: statePayload.traceStartedAtMs,
        backendLoginStartedAtMs: statePayload.backendLoginStartedAtMs,
        backendCallbackStartedAtMs: callbackStartedAtMs,
      });
      recordWeChatOAuthTrace({
        context: traceContext,
        stage: "backend_callback_state_validated",
        mode: statePayload.mode,
      });

      try {
        if (statePayload.mode === "bind" && statePayload.bindUserId) {
          const exchangeStartedAtMs = nowMs();
          const bindOpenId = useMockOAuthFlow
            ? resolveWeChatAbilityMockOpenId()
            : (await oauthService.exchangeCodeForSession(code)).openId;
          recordWeChatOAuthTrace({
            context: traceContext,
            stage: "backend_code_exchange_completed",
            mode: "bind",
            durationMs: useMockOAuthFlow ? 0 : nowMs() - exchangeStartedAtMs,
            result: "success",
            branch: useMockOAuthFlow ? "mock" : "wechat",
          });
          if (!bindOpenId) {
            throw new Error("Mock WeChat openid is not configured");
          }

          const userResolutionStartedAtMs = nowMs();
          const occupiedUser = await userRepo.findByOpenId(bindOpenId);
          if (occupiedUser && occupiedUser.status === "ACTIVE") {
            recordWeChatOAuthTrace({
              context: traceContext,
              stage: "backend_user_resolution_completed",
              mode: "bind",
              durationMs: nowMs() - userResolutionStartedAtMs,
              result: "success",
              branch: "occupied_user",
            });
            clearAnonymousSessionCookie(c);
            clearOAuthStateCookieByNonce(c, state);
            clearOAuthStateCookie(c);

            return respondAuthenticatedSuccess(
              appendBindResultToReturnTo(statePayload.returnTo, "success"),
              occupiedUser,
              traceContext,
              "bind_occupied_user",
            );
          }

          const bindTargetUser = await resolveActiveUserById(
            statePayload.bindUserId as UserId,
          );
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
          recordWeChatOAuthTrace({
            context: traceContext,
            stage: "backend_user_resolution_completed",
            mode: "bind",
            durationMs: nowMs() - userResolutionStartedAtMs,
            result: "success",
            branch: hasUserRole(bindTargetUser.role, "anonymous")
              ? "anonymous_upgrade"
              : "authenticated_bind",
          });

          return respondAuthenticatedSuccess(
            appendBindResultToReturnTo(statePayload.returnTo, "success"),
            boundUser,
            traceContext,
            "bind_target_user",
          );
        }

        let loginOpenId: string | null = null;
        let loginSession: WeChatOAuthLoginSession | null = null;

        const exchangeStartedAtMs = nowMs();
        if (useMockOAuthFlow) {
          loginOpenId = resolveWeChatAbilityMockOpenId();
        } else {
          const session = await oauthService.exchangeCodeForSession(code);
          loginSession = session;
          loginOpenId = session.openId;
        }
        recordWeChatOAuthTrace({
          context: traceContext,
          stage: "backend_code_exchange_completed",
          mode: "login",
          durationMs: useMockOAuthFlow ? 0 : nowMs() - exchangeStartedAtMs,
          result: "success",
          branch: useMockOAuthFlow ? "mock" : "wechat",
        });

        if (!loginOpenId) {
          throw new Error("Mock WeChat openid is not configured");
        }

        const userResolutionStartedAtMs = nowMs();
        const existingUser = await userRepo.findByOpenId(loginOpenId);
        if (existingUser) {
          scheduleWeChatProfileRefreshIfMissing({
            user: existingUser,
            session: loginSession,
            reason: "login_existing_user",
          });
          clearAnonymousSessionCookie(c);
          clearOAuthStateCookieByNonce(c, state);
          clearOAuthStateCookie(c);
          recordWeChatOAuthTrace({
            context: traceContext,
            stage: "backend_user_resolution_completed",
            mode: "login",
            durationMs: nowMs() - userResolutionStartedAtMs,
            result: "success",
            branch: "existing_user",
          });
          return respondAuthenticatedSuccess(
            statePayload.returnTo,
            existingUser,
            traceContext,
            "login_existing_user",
          );
        }

        const bindCandidateUserId =
          (statePayload.bindUserId as UserId | null) ??
          (statePayload.anonymousUserId as UserId | null) ??
          readSessionUserId(c);
        if (bindCandidateUserId) {
          const bindCandidateUser =
            await userRepo.findById(bindCandidateUserId);
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
                  reason: "login_anonymous_upgrade",
                });
              }
            } else {
              await bindWeChatToCurrentUser(bindCandidateUser.id, loginOpenId);
              boundCandidate = await userRepo.findById(bindCandidateUser.id);
              if (boundCandidate) {
                scheduleWeChatProfileRefreshIfMissing({
                  user: boundCandidate,
                  session: loginSession,
                  reason: "login_authenticated_bind",
                });
              }
            }

            if (boundCandidate && boundCandidate.status === "ACTIVE") {
              clearAnonymousSessionCookie(c);
              clearOAuthStateCookieByNonce(c, state);
              clearOAuthStateCookie(c);
              recordWeChatOAuthTrace({
                context: traceContext,
                stage: "backend_user_resolution_completed",
                mode: "login",
                durationMs: nowMs() - userResolutionStartedAtMs,
                result: "success",
                branch: hasUserRole(bindCandidateUser.role, "anonymous")
                  ? "anonymous_upgrade"
                  : "authenticated_bind",
              });
              return respondAuthenticatedSuccess(
                statePayload.returnTo,
                boundCandidate,
                traceContext,
                "login_bind_candidate",
              );
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
        const resolvedUser =
          createdUser ?? (await userRepo.findByOpenId(loginOpenId));
        if (!resolvedUser || resolvedUser.status !== "ACTIVE") {
          throw new Error("Failed to create user for WeChat OAuth login");
        }
        scheduleWeChatProfileRefreshIfMissing({
          user: resolvedUser,
          session: loginSession,
          reason: "login_created_user",
        });

        clearAnonymousSessionCookie(c);
        clearOAuthStateCookieByNonce(c, state);
        clearOAuthStateCookie(c);
        recordWeChatOAuthTrace({
          context: traceContext,
          stage: "backend_user_resolution_completed",
          mode: "login",
          durationMs: nowMs() - userResolutionStartedAtMs,
          result: "success",
          branch: "created_user",
        });
        return respondAuthenticatedSuccess(
          statePayload.returnTo,
          resolvedUser,
          traceContext,
          "login_created_user",
        );
      } catch (error) {
        clearOAuthStateCookieByNonce(c, state);
        clearOAuthStateCookie(c);
        recordWeChatOAuthTrace({
          context: traceContext,
          stage: "backend_callback_failed",
          mode: statePayload.mode,
          durationMs: nowMs() - callbackStartedAtMs,
          result: "failure",
          errorCode: error instanceof Error ? error.name : "unknown_error",
        });
        if (statePayload.mode === "bind") {
          return respondSuccess(
            appendBindResultToReturnTo(statePayload.returnTo, "failed"),
          );
        }

        const message =
          error instanceof Error
            ? error.message
            : "WeChat OAuth callback failed";
        return respondError(500, message, statePayload.returnTo);
      }
    },
  );
