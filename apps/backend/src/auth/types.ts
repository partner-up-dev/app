export type AuthRole = "anonymous" | "authenticated" | "service" | "analytics";
export type AuthenticatedAuthRole = Exclude<AuthRole, "anonymous">;

export const isAuthenticatedAuthRole = (role: AuthRole): role is AuthenticatedAuthRole =>
  role !== "anonymous";

export const hasAuthRole = (roles: readonly AuthRole[], role: AuthRole): boolean =>
  roles.includes(role);

export const hasAnyAuthRole = (
  roles: readonly AuthRole[],
  allowedRoles: readonly AuthRole[],
): boolean => allowedRoles.some((role) => hasAuthRole(roles, role));

export type AuthClaims = {
  role: AuthRole;
  roles: AuthRole[];
  sub: string | null;
  exp: number;
  iat: number;
};

export type RequestAuth = {
  role: AuthRole;
  roles: AuthRole[];
  userId: string | null;
  token: string;
  claims: AuthClaims;
};
