import type { AuthSessionPayload } from "@/shared/auth/useUserSessionStore";

export type AuthSessionRestoreResult = {
  status: number;
  payload?: AuthSessionPayload;
};

/**
 * The smallest boundary needed by the public session process. Keeping RPC and
 * Pinia outside this module makes the register/restore ordering independently
 * testable and prevents a rejected UUID from introducing a retry loop.
 */
export type AuthSessionBootstrapBoundary = {
  readAccessToken: () => string | null;
  readUserId: () => string | null;
  registerAnonymous: () => Promise<AuthSessionPayload | null>;
  restoreSession: (userId: string | null) => Promise<AuthSessionRestoreResult>;
  clearPublicSession: () => void;
  applySession: (payload: AuthSessionPayload) => Promise<void> | void;
};

export const runAuthSessionBootstrapCoordinator = async (
  boundary: AuthSessionBootstrapBoundary,
): Promise<void> => {
  const accessToken = boundary.readAccessToken();
  const userId = boundary.readUserId();

  // A clean browser gets its anonymous identity directly from registration.
  // It must not immediately issue a second /auth/session request.
  if (!accessToken && !userId) {
    const payload = await boundary.registerAnonymous();
    if (payload) {
      await boundary.applySession(payload);
    }
    return;
  }

  const restored = await boundary.restoreSession(userId);
  if (restored.status === 200) {
    if (restored.payload) {
      await boundary.applySession(restored.payload);
    }
    return;
  }

  // A stale anonymous UUID is recoverable exactly once. Other failures end
  // bootstrap without clearing existing public state or creating a request
  // loop.
  if (restored.status === 401) {
    boundary.clearPublicSession();
    const payload = await boundary.registerAnonymous();
    if (payload) {
      await boundary.applySession(payload);
    }
  }
};
