import type { Context, MiddlewareHandler } from "hono";
import type { User, UserId, UserRole } from "../entities/user";
import type { CurrentPublicUserIdentity, OperatorCredentialIdentity } from "../domains/user";
import { classifyCurrentPublicUser, findCurrentPublicUserIdentity } from "../domains/user/queries";
import { isAuthenticatedAuthRole, type AuthRole, type RequestAuth } from "./types";
import { issueAccessToken, shouldRenewAccessToken, verifyAccessToken } from "./jwt";

const ACCESS_TOKEN_HEADER = "x-access-token";
const AUTH_HEADER_PREFIX = "Bearer ";

export type AuthEnv = {
  Variables: {
    auth: RequestAuth;
    suppressAccessTokenHeader?: boolean;
  };
};

const readBearerToken = (c: Context): string | null => {
  const authHeader = c.req.header("authorization") ?? c.req.header("Authorization");
  if (!authHeader?.startsWith(AUTH_HEADER_PREFIX)) return null;
  const token = authHeader.slice(AUTH_HEADER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
};

const mapOperatorUserRolesToAuthRoles = (roles: readonly UserRole[]): AuthRole[] => {
  const nonAnonymousRoles = roles.filter((role) => role !== "anonymous");
  return nonAnonymousRoles.length > 0 ? Array.from(new Set(nonAnonymousRoles)) : ["anonymous"];
};

const buildAnonymousAuth = (userId: UserId | null = null): RequestAuth => {
  const roles: AuthRole[] = ["anonymous"];
  const token = issueAccessToken(roles, userId);
  const claims = verifyAccessToken(token);
  if (!claims) {
    throw new Error("Failed to issue anonymous access token");
  }
  return {
    role: "anonymous",
    roles,
    userId,
    token,
    claims,
  };
};

const issueRoleAuth = (userId: UserId, roles: AuthRole[]): RequestAuth => {
  const token = issueAccessToken(roles, userId);
  const claims = verifyAccessToken(token);
  if (!claims) {
    throw new Error(`Failed to issue ${roles.join(",")} access token`);
  }
  return {
    role: claims.role,
    roles: claims.roles,
    userId,
    token,
    claims,
  };
};

export const resolveRequestAuth = (c: Context): RequestAuth => {
  const bearer = readBearerToken(c);
  if (!bearer) {
    return buildAnonymousAuth();
  }

  const claims = verifyAccessToken(bearer);
  if (!claims) {
    return buildAnonymousAuth();
  }

  if (isAuthenticatedAuthRole(claims.role) && claims.sub) {
    if (shouldRenewAccessToken(claims)) {
      return issueRoleAuth(claims.sub as UserId, claims.roles);
    }

    return {
      role: claims.role,
      roles: claims.roles,
      userId: claims.sub as UserId,
      token: bearer,
      claims,
    };
  }

  if (shouldRenewAccessToken(claims)) {
    return buildAnonymousAuth(claims.sub as UserId | null);
  }

  return {
    role: "anonymous",
    roles: ["anonymous"],
    userId: claims.sub as UserId | null,
    token: bearer,
    claims,
  };
};

const resolvePublicRequestAuth = async (c: Context): Promise<RequestAuth> => {
  const bearer = readBearerToken(c);
  if (!bearer) {
    return buildAnonymousAuth();
  }

  const claims = verifyAccessToken(bearer);
  if (!claims || !claims.sub) {
    return buildAnonymousAuth();
  }

  const identity = await findCurrentPublicUserIdentity(claims.sub as UserId);
  if (!identity) {
    return buildAnonymousAuth();
  }

  const hasCanonicalRoles = claims.roles.length === 1 && claims.roles[0] === identity.role;
  if (hasCanonicalRoles && !shouldRenewAccessToken(claims)) {
    return {
      role: identity.role,
      roles: [identity.role],
      userId: identity.userId,
      token: bearer,
      claims,
    };
  }

  return issueRoleAuth(identity.userId, [identity.role]);
};

export const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const auth = await resolvePublicRequestAuth(c);
  c.set("auth", auth);

  await next();

  if (c.get("suppressAccessTokenHeader")) {
    return;
  }

  const latestAuth = c.get("auth");
  c.header(ACCESS_TOKEN_HEADER, latestAuth.token);
};

export const attachAuthTokenHeader = (c: Context, token: string): void => {
  c.header(ACCESS_TOKEN_HEADER, token);
};

export const issueAnonymousAuth = (userId: UserId | null = null): RequestAuth =>
  buildAnonymousAuth(userId);

export const issueUserAuth = (userId: UserId): RequestAuth =>
  issueRoleAuth(userId, ["authenticated"]);

export const issueOperatorAuthForIdentity = (identity: OperatorCredentialIdentity): RequestAuth =>
  issueRoleAuth(identity.userId, mapOperatorUserRolesToAuthRoles(identity.roles));

/** Issue a public-session token only from a User-owned validated identity. */
export const issuePublicAuthForIdentity = (identity: CurrentPublicUserIdentity): RequestAuth =>
  identity.role === "anonymous"
    ? issueAnonymousAuth(identity.userId)
    : issueRoleAuth(identity.userId, [identity.role]);

/** Issue only a public-session token; operator roles are never minted here. */
export const issuePublicAuthForUser = (
  user: Pick<User, "id" | "status" | "role">,
): RequestAuth | null => {
  const identity = classifyCurrentPublicUser(user);
  if (!identity) return null;
  return issuePublicAuthForIdentity(identity);
};
