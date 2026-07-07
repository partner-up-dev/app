export type SessionRole = "anonymous" | "authenticated" | "service" | "analytics";

const STORAGE_USER_ID_KEY = "partner_up_user_id";
const STORAGE_ACCESS_TOKEN_KEY = "partner_up_access_token";
const STORAGE_SESSION_ROLE_KEY = "partner_up_session_role";
const LEGACY_STORAGE_USER_PIN_KEY = "partner_up_user_pin";

let memoryUserId: string | null = null;
let memoryAccessToken: string | null = null;
let memoryRole: SessionRole = "anonymous";

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

export const getStoredUserId = (): string | null => {
  writeStorage(LEGACY_STORAGE_USER_PIN_KEY, null);
  if (typeof window === "undefined") {
    return memoryUserId;
  }
  return readStorage(STORAGE_USER_ID_KEY);
};

export const setStoredUserId = (userId: string | null): void => {
  memoryUserId = userId;
  writeStorage(LEGACY_STORAGE_USER_PIN_KEY, null);
  writeStorage(STORAGE_USER_ID_KEY, userId);
};

export const getStoredAccessToken = (): string | null => {
  if (typeof window === "undefined") {
    return memoryAccessToken;
  }
  return readStorage(STORAGE_ACCESS_TOKEN_KEY);
};

export const setStoredAccessToken = (accessToken: string | null): void => {
  memoryAccessToken = accessToken;
  writeStorage(STORAGE_ACCESS_TOKEN_KEY, accessToken);
};

const isSessionRole = (value: string | null): value is SessionRole =>
  value === "anonymous" ||
  value === "authenticated" ||
  value === "service" ||
  value === "analytics";

export const isAuthenticatedSessionRole = (
  role: SessionRole,
): role is Exclude<SessionRole, "anonymous"> => role !== "anonymous";

export const getStoredSessionRole = (): SessionRole => {
  if (typeof window === "undefined") {
    return memoryRole;
  }

  const raw = readStorage(STORAGE_SESSION_ROLE_KEY);
  return isSessionRole(raw) ? raw : "anonymous";
};

export const setStoredSessionRole = (role: SessionRole): void => {
  memoryRole = role;
  writeStorage(STORAGE_SESSION_ROLE_KEY, role);
};

export const clearStoredSession = (): void => {
  memoryUserId = null;
  memoryAccessToken = null;
  memoryRole = "anonymous";

  writeStorage(STORAGE_USER_ID_KEY, null);
  writeStorage(STORAGE_ACCESS_TOKEN_KEY, null);
  writeStorage(STORAGE_SESSION_ROLE_KEY, null);
  writeStorage(LEGACY_STORAGE_USER_PIN_KEY, null);
};
