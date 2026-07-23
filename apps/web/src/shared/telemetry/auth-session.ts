import type { AuthSessionPayload } from "@/shared/auth/useUserSessionStore";
import { resolveAnonymousId } from "@/shared/telemetry/journey";
import { trackContextEvent } from "@/shared/telemetry/track";

const sha256Hex = async (value: string): Promise<string | null> => {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return null;
  }

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const trackAuthSessionCreated = async (payload: AuthSessionPayload): Promise<void> => {
  const authenticatedUserHash = payload.userId ? await sha256Hex(payload.userId) : null;

  trackContextEvent("auth.session.created", {
    session_role: payload.role,
    anonymous_id: resolveAnonymousId(),
    authenticated_user_hash: authenticatedUserHash,
  });
};
