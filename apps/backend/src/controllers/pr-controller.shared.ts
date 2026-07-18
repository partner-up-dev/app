import type { Context } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth/middleware";
import { issueAnonymousAuth, issueAuthForUser } from "../auth/middleware";
import {
  AUTHENTICATED_REQUIRED_CODE,
  type CreatorIdentityInput,
  throwAuthenticatedRequired,
} from "../domains/pr/contracts";
import {
  createNaturalLanguagePRSchema,
  createStructuredPRSchema,
  partnerRequestFieldsObjectSchema,
  partnerRequestFieldsSchema,
  prAllowEditAfterReadySchema,
  prStatusManualSchema,
} from "../entities/partner-request";
import { prMessageBodySchema } from "../entities/pr-message";
import { hasUserRole, type UserId } from "../entities/user";
import { throwHttpProblem } from "../lib/problem-details";
import { resolveWeChatAbilityMockOpenId } from "../lib/wechat-ability-mocking";
import { UserRepository } from "../repositories/UserRepository";
import { WeChatOAuthService } from "../services/WeChatOAuthService";

const oauthService = new WeChatOAuthService();
const userRepo = new UserRepository();
const WECHAT_OAUTH_NOT_CONFIGURED_CODE = "WECHAT_OAUTH_NOT_CONFIGURED";

export { prAllowEditAfterReadySchema };

const readBoundOpenId = async (c: Context<AuthEnv>): Promise<string | null> => {
  const userId = getAuthenticatedUserId(c);
  if (!userId) {
    return null;
  }

  const user = await userRepo.findById(userId);
  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  return user.openId ?? null;
};

const throwCodedHttpException = (status: 401 | 503, message: string, code: string): never => {
  return throwHttpProblem({ status, detail: message, code });
};

export const nlWordCountSchema = createNaturalLanguagePRSchema.refine(
  ({ rawText }) => rawText.trim().split(/\s+/).filter(Boolean).length <= 50,
  { message: "Natural language input must be 50 words or fewer" },
);

export const updateStatusSchema = z.object({
  status: prStatusManualSchema,
});

export const userUpdateContentFieldsSchema = partnerRequestFieldsObjectSchema
  .omit({
    type: true,
  })
  .strict();

export const updateContentSchema = z
  .object({
    fields: userUpdateContentFieldsSchema,
    allowRelease: z.boolean().optional(),
  })
  .strict();

export const prIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const prPartnerProfileParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  partnerId: z.coerce.number().int().positive(),
});

export const prMessageCreateSchema = z.object({
  body: prMessageBodySchema,
});

export const prMessageReadMarkerSchema = z.object({
  lastReadMessageId: z.coerce.number().int().positive(),
});

export const resolveAvatarUrl = (requestUrl: string, avatarUrl: string | null): string | null => {
  if (!avatarUrl) return null;

  try {
    return new URL(avatarUrl).toString();
  } catch {
    return new URL(avatarUrl, requestUrl).toString();
  }
};

export const requireAuthenticatedOpenId = async (c: Context<AuthEnv>): Promise<string> => {
  const openId = await readBoundOpenId(c);
  if (openId) {
    return openId;
  }

  const mockOpenId = resolveWeChatAbilityMockOpenId();
  if (mockOpenId) {
    return mockOpenId;
  }

  const userId = getAuthenticatedUserId(c);
  if (!userId) {
    if (!oauthService.isConfigured()) {
      return throwCodedHttpException(
        503,
        "WeChat OAuth is not configured",
        WECHAT_OAUTH_NOT_CONFIGURED_CODE,
      );
    }

    return throwCodedHttpException(
      401,
      "WeChat login required for partner actions",
      AUTHENTICATED_REQUIRED_CODE,
    );
  }

  return throwCodedHttpException(
    401,
    "Current account is not bound to WeChat",
    AUTHENTICATED_REQUIRED_CODE,
  );
};

export const tryReadAuthenticatedOpenId = async (c: Context<AuthEnv>): Promise<string | null> => {
  return readBoundOpenId(c);
};

export const getAuthenticatedUserId = (c: Context<AuthEnv>): UserId | null => {
  const auth = c.get("auth");
  if (!auth.roles.includes("authenticated") || !auth.userId) {
    return null;
  }

  return auth.userId as UserId;
};

export const getSessionUserId = (c: Context<AuthEnv>): UserId | null => {
  const auth = c.get("auth");
  if (!auth.userId) {
    return null;
  }
  return auth.userId as UserId;
};

export const requireSessionUserId = (c: Context<AuthEnv>): UserId => {
  const auth = c.get("auth");
  if (!auth.userId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }
  return auth.userId as UserId;
};

export const requireAuthenticatedUserId = (c: Context<AuthEnv>): UserId => {
  const auth = c.get("auth");
  if (!auth.roles.includes("authenticated") || !auth.userId) {
    return throwAuthenticatedRequired();
  }
  return auth.userId as UserId;
};

export const buildCreatorIdentity = async (c: Context<AuthEnv>) => {
  const authenticatedUserId = getAuthenticatedUserId(c);
  const sessionUserId = getSessionUserId(c);
  const openId = await tryReadAuthenticatedOpenId(c);

  return {
    authenticatedUserId,
    anonymousUserId: authenticatedUserId === null ? sessionUserId : null,
    oauthOpenId: openId,
  };
};

export const requireAuthenticatedCreatorIdentity = async (
  c: Context<AuthEnv>,
): Promise<CreatorIdentityInput> => {
  const authenticatedUserId = requireAuthenticatedUserId(c);
  const openId = await tryReadAuthenticatedOpenId(c);

  return {
    authenticatedUserId,
    anonymousUserId: null,
    oauthOpenId: openId,
  };
};

export const issueResponseAuth = async (c: Context<AuthEnv>, userId: UserId): Promise<void> => {
  const user = await userRepo.findById(userId);
  if (!user || user.status !== "ACTIVE") {
    return throwHttpProblem({ status: 401, detail: "Invalid session user" });
  }

  const auth = hasUserRole(user.role, "anonymous")
    ? issueAnonymousAuth(user.id)
    : issueAuthForUser(user);
  c.set("auth", auth);
};

export { createNaturalLanguagePRSchema, createStructuredPRSchema, partnerRequestFieldsSchema };
