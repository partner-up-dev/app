import { onMounted } from "vue";
import { client } from "@/lib/rpc";
import { useUserSessionStore, type AuthSessionPayload } from "@/shared/auth/useUserSessionStore";
import { getStoredAccessToken, getStoredUserId } from "@/shared/auth/session-storage";
import { hasPendingWeChatOAuthHandoff } from "@/processes/wechat/oauth-handoff";
import { trackAuthSessionCreated } from "@/shared/telemetry/auth-session";

let hasBootstrappedAuthSession = false;
let bootstrappingPromise: Promise<void> | null = null;

type AuthSessionBootstrapResult = "completed" | "deferred";

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

const registerFreshAnonymousSession = async (
  store: ReturnType<typeof useUserSessionStore>,
): Promise<boolean> => {
  const registerRes = await client.api.auth.register.anonymous.$post(undefined, {
    init: {
      credentials: "include",
    },
  });

  if (!registerRes.ok) {
    return false;
  }

  const payload = (await registerRes.json()) as AuthSessionPayload;
  await applyAndTrackAuthSession(store, payload);
  return true;
};

const runAuthSessionBootstrap = async (): Promise<AuthSessionBootstrapResult> => {
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

  const existingToken = getStoredAccessToken();
  const storedUserId = store.userId ?? getStoredUserId();

  if (!existingToken && !storedUserId) {
    await registerFreshAnonymousSession(store);
  }

  const currentUserId = store.userId ?? storedUserId;

  const res = await client.api.auth.session.$post(
    {
      json: {
        userId: currentUserId,
      },
    },
    {
      init: {
        credentials: "include",
      },
    },
  );

  if (!res.ok) {
    if (res.status === 401) {
      store.clearSession();
    }

    const rotated = getStoredAccessToken();
    store.setAccessToken(rotated);
    return "completed";
  }

  const payload = (await res.json()) as AuthSessionPayload;
  await applyAndTrackAuthSession(store, payload);
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
  const registered = await registerFreshAnonymousSession(store);
  if (!registered) {
    throw new Error("Failed to start anonymous session");
  }
  hasBootstrappedAuthSession = true;
};

export const useAuthSessionBootstrap = (): void => {
  onMounted(() => {
    void ensureAuthSessionBootstrapped();
  });
};
