export type AdminSessionRole = "anonymous" | "service" | "analytics";

const STORAGE_ADMIN_USER_ID_KEY = "partner_up_admin_user_id";
const STORAGE_ADMIN_ACCESS_TOKEN_KEY = "partner_up_admin_access_token";
const STORAGE_ADMIN_SESSION_ROLE_KEY = "partner_up_admin_session_role";
const STORAGE_ADMIN_SESSION_ROLES_KEY = "partner_up_admin_session_roles";

let memoryAdminUserId: string | null = null;
let memoryAdminAccessToken: string | null = null;
let memoryAdminRole: AdminSessionRole = "anonymous";
let memoryAdminRoles: AdminSessionRole[] = ["anonymous"];

const readStorage = (key: string): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string | null): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (value === null) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, value);
  } catch {
    // Ignore localStorage failures.
  }
};

const isAdminSessionRole = (value: string | null): value is AdminSessionRole =>
  value === "anonymous" || value === "service" || value === "analytics";

const normalizeAdminSessionRoles = (
  roles: readonly string[] | null | undefined,
): AdminSessionRole[] => {
  const normalized = [...new Set(roles ?? [])].filter((role) =>
    isAdminSessionRole(role),
  );

  if (normalized.includes("service") || normalized.includes("analytics")) {
    return normalized.filter((role) => role !== "anonymous");
  }

  return ["anonymous"];
};

export const resolvePrimaryAdminSessionRole = (
  roles: readonly AdminSessionRole[],
): AdminSessionRole => {
  if (roles.includes("service")) return "service";
  if (roles.includes("analytics")) return "analytics";
  return "anonymous";
};

const readStoredAdminSessionRoles = (): AdminSessionRole[] => {
  const rawRoles = readStorage(STORAGE_ADMIN_SESSION_ROLES_KEY);
  if (rawRoles) {
    try {
      const parsed = JSON.parse(rawRoles) as unknown;
      if (Array.isArray(parsed)) {
        return normalizeAdminSessionRoles(
          parsed.filter((role) => typeof role === "string"),
        );
      }
    } catch {
      return ["anonymous"];
    }
  }

  const rawRole = readStorage(STORAGE_ADMIN_SESSION_ROLE_KEY);
  return normalizeAdminSessionRoles(rawRole ? [rawRole] : null);
};

export const getStoredAdminUserId = (): string | null => {
  if (typeof window === "undefined") {
    return memoryAdminUserId;
  }

  return readStorage(STORAGE_ADMIN_USER_ID_KEY);
};

export const setStoredAdminUserId = (userId: string | null): void => {
  memoryAdminUserId = userId;
  writeStorage(STORAGE_ADMIN_USER_ID_KEY, userId);
};

export const getStoredAdminAccessToken = (): string | null => {
  if (typeof window === "undefined") {
    return memoryAdminAccessToken;
  }

  return readStorage(STORAGE_ADMIN_ACCESS_TOKEN_KEY);
};

export const setStoredAdminAccessToken = (accessToken: string | null): void => {
  memoryAdminAccessToken = accessToken;
  writeStorage(STORAGE_ADMIN_ACCESS_TOKEN_KEY, accessToken);
};

export const getStoredAdminSessionRole = (): AdminSessionRole => {
  if (typeof window === "undefined") {
    return memoryAdminRole;
  }

  return resolvePrimaryAdminSessionRole(readStoredAdminSessionRoles());
};

export const setStoredAdminSessionRole = (role: AdminSessionRole): void => {
  setStoredAdminSessionRoles([role]);
};

export const getStoredAdminSessionRoles = (): AdminSessionRole[] => {
  if (typeof window === "undefined") {
    return memoryAdminRoles;
  }

  return readStoredAdminSessionRoles();
};

export const setStoredAdminSessionRoles = (
  roles: readonly AdminSessionRole[],
): void => {
  const nextRoles = normalizeAdminSessionRoles(roles);
  const primaryRole = resolvePrimaryAdminSessionRole(nextRoles);

  memoryAdminRoles = nextRoles;
  memoryAdminRole = primaryRole;
  writeStorage(STORAGE_ADMIN_SESSION_ROLE_KEY, primaryRole);
  writeStorage(STORAGE_ADMIN_SESSION_ROLES_KEY, JSON.stringify(nextRoles));
};

export const clearStoredAdminSession = (): void => {
  memoryAdminUserId = null;
  memoryAdminAccessToken = null;
  memoryAdminRole = "anonymous";
  memoryAdminRoles = ["anonymous"];

  writeStorage(STORAGE_ADMIN_USER_ID_KEY, null);
  writeStorage(STORAGE_ADMIN_ACCESS_TOKEN_KEY, null);
  writeStorage(STORAGE_ADMIN_SESSION_ROLE_KEY, null);
  writeStorage(STORAGE_ADMIN_SESSION_ROLES_KEY, null);
};

export const getStoredAdminHasAnyRole = (
  requiredRoles: readonly AdminSessionRole[],
): boolean =>
  Boolean(getStoredAdminUserId()) &&
  Boolean(getStoredAdminAccessToken()) &&
  getStoredAdminSessionRoles().some((role) => requiredRoles.includes(role));

export const getStoredAdminHasAccess = (): boolean =>
  getStoredAdminHasAnyRole(["service"]);
