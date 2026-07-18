import { onMounted } from "vue";
import { client } from "@/lib/rpc";
import { useUserSessionStore, type AuthSessionPayload } from "@/shared/auth/useUserSessionStore";
import { getStoredAccessToken, getStoredUserId } from "@/shared/auth/session-storage";
import { hasPendingWeChatOAuthHandoff } from "@/processes/wechat/oauth-handoff";
import { trackAuthSessionCreated } from "@/shared/telemetry/auth-session";
import { runAuthSessionBootstrapCoordinator } from "./auth-session-bootstrap-coordinator";

let hasBootstrappedAuthSession = false;
let bootstrappingPromise: Promise<void> | null = null;

const applyAndTrackAuthSession = async (
  store: ReturnType<typeof useUserSessionStore>,
  payload: AuthSessionPayload,
): Promise<void> => {
  store.applyAuthSession(payload);
  try {
    await trackAuthSessionCreated(payload);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[telemetry] failed to record auth session", error);
    }
  }
};

const runAuthSessionBootstrap = async (): Promise<"completed" | "deferred"> => {
  if (typeof window !== "undefined") {
    const isOAuthCallback = window.location.pathname === "/wechat/oauth/callback";
    if (isOAuthCallback) {
      const searchParams = new URLSearchParams(window.location.search);
      const hasOAuthParams =
        Boolean(searchParams.get("code")) && Boolean(searchParams.get("state"));
      if (hasOAuthParams) {
        return "completed";
      }
    }
  }

  if (hasPendingWeChatOAuthHandoff()) {
    return "deferred";
  }

  const store = useUserSessionStore();
  await runAuthSessionBootstrapCoordinator({
    readAccessToken: getStoredAccessToken,
    readUserId: () => store.userId ?? getStoredUserId(),
    registerAnonymous: async () => {
      const registerRes = await client.api.auth.register.anonymous.$post(undefined, {
        init: {
          credentials: "include",
        },
      });

      if (!registerRes.ok) {
        return null;
      }

      return (await registerRes.json()) as AuthSessionPayload;
    },
    restoreSession: async (userId) => {
      const res = await client.api.auth.session.$post(
        {
          json: { userId },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        return { status: res.status };
      }

      return {
        status: res.status,
        payload: (await res.json()) as AuthSessionPayload,
      };
    },
    clearPublicSession: () => store.clearSession(),
    applySession: (payload) => applyAndTrackAuthSession(store, payload),
  });
  return "completed";
};

export const ensureAuthSessionBootstrapped = async (): Promise<void> => {
  if (hasBootstrappedAuthSession) {
    return;
  }

  if (!bootstrappingPromise) {
    bootstrappingPromise = runAuthSessionBootstrap()
      .then((result) => {
        if (result === "completed") {
          hasBootstrappedAuthSession = true;
        }
      })
      .finally(() => {
        bootstrappingPromise = null;
      });
  }

  await bootstrappingPromise;
};

export const resetAuthSessionToFreshAnonymous = async (): Promise<void> => {
  if (bootstrappingPromise) {
    try {
      await bootstrappingPromise;
    } catch {
      // Continue with an explicit user-initiated session reset.
    }
  }

  const store = useUserSessionStore();
  store.clearSession();
  hasBootstrappedAuthSession = false;
  const registerRes = await client.api.auth.register.anonymous.$post(undefined, {
    init: {
      credentials: "include",
    },
  });
  if (!registerRes.ok) {
    throw new Error("Failed to start anonymous session");
  }
  await applyAndTrackAuthSession(store, (await registerRes.json()) as AuthSessionPayload);
  hasBootstrappedAuthSession = true;
};

export const useAuthSessionBootstrap = (): void => {
  onMounted(() => {
    void ensureAuthSessionBootstrapped();
  });
};
