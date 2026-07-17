import type { Context, MiddlewareHandler } from "hono";
import type { User, UserId, UserRole } from "../entities/user";
import { isAuthenticatedAuthRole, type AuthRole, type RequestAuth } from "./types";
import { issueAccessToken, shouldRenewAccessToken, verifyAccessToken } from "./jwt";

const ACCESS_TOKEN_HEADER = "x-access-token";
const AUTH_HEADER_PREFIX = "Bearer ";

export type AuthEnv = {
  Variables: {
    auth: RequestAuth;
  };
};

const readBearerToken = (c: Context): string | null => {
  const authHeader = c.req.header("authorization") ?? c.req.header("Authorization");
  if (!authHeader?.startsWith(AUTH_HEADER_PREFIX)) return null;
  const token = authHeader.slice(AUTH_HEADER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
};

const mapUserRolesToAuthRoles = (roles: readonly UserRole[]): AuthRole[] => {
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

export const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const auth = resolveRequestAuth(c);
  c.set("auth", auth);

  await next();

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

export const issueAuthForUser = (user: Pick<User, "id" | "role">): RequestAuth =>
  issueRoleAuth(user.id, mapUserRolesToAuthRoles(user.role));
