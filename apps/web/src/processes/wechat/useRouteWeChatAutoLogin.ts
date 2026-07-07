import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { isWeChatAbilityEnv } from "@/shared/wechat/ability-mocking";
import { requestWeChatOAuthLogin } from "@/processes/wechat/oauth-login";
import { hasPendingWeChatOAuthHandoff } from "@/processes/wechat/oauth-handoff";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";

const AUTO_LOGIN_ATTEMPT_STORAGE_KEY =
  "partner_up_wechat_auto_login_attempted_routes";

const readAttemptedRouteKeys = (): string[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(AUTO_LOGIN_ATTEMPT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
};

const writeAttemptedRouteKeys = (keys: string[]): void => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      AUTO_LOGIN_ATTEMPT_STORAGE_KEY,
      JSON.stringify(keys),
    );
  } catch {
    // Ignore sessionStorage write failures.
  }
};

const hasRouteAttempted = (routeKey: string): boolean =>
  readAttemptedRouteKeys().includes(routeKey);

const markRouteAttempted = (routeKey: string): void => {
  const keys = readAttemptedRouteKeys();
  if (keys.includes(routeKey)) return;
  writeAttemptedRouteKeys([...keys, routeKey]);
};

const clearRouteAttempted = (routeKey: string): void => {
  const keys = readAttemptedRouteKeys();
  if (!keys.includes(routeKey)) return;
  writeAttemptedRouteKeys(keys.filter((entry) => entry !== routeKey));
};

const resolveAutoLoginRouteKey = (
  routePath: string,
  wechatAutoLoginPolicy: "route" | "skip" | undefined,
): string | null => {
  if (wechatAutoLoginPolicy !== "route") return null;
  return routePath;
};

type RouteWeChatAutoLoginAttemptRuntime = {
  resolveRouteKey: () => string | null;
  hasPendingHandoff: () => boolean;
  ensureAuthSessionBootstrapped: () => Promise<void>;
  isAuthenticated: () => boolean;
  clearRouteAttempted: (routeKey: string) => void;
  isWeChatAbilityEnv: () => boolean;
  hasRouteAttempted: (routeKey: string) => boolean;
  markRouteAttempted: (routeKey: string) => void;
  isRedirecting: () => boolean;
  setRedirecting: (value: boolean) => void;
  getReturnTo: () => string;
  requestLogin: (returnTo: string) => boolean;
};

export type RouteWeChatAutoLoginAttemptResult =
  | "skipped"
  | "deferred"
  | "authenticated"
  | "already-attempted"
  | "redirecting";

export const runRouteWeChatAutoLoginAttempt = async (
  runtime: RouteWeChatAutoLoginAttemptRuntime,
): Promise<RouteWeChatAutoLoginAttemptResult> => {
  if (runtime.isRedirecting()) return "redirecting";

  const initialRouteKey = runtime.resolveRouteKey();
  if (!initialRouteKey) return "skipped";
  if (runtime.hasPendingHandoff()) return "deferred";

  await runtime.ensureAuthSessionBootstrapped();

  if (runtime.isRedirecting()) return "redirecting";
  if (runtime.hasPendingHandoff()) return "deferred";

  const routeKey = runtime.resolveRouteKey();
  if (!routeKey) return "skipped";

  if (runtime.isAuthenticated()) {
    runtime.clearRouteAttempted(routeKey);
    return "authenticated";
  }

  if (!runtime.isWeChatAbilityEnv()) return "skipped";
  if (runtime.hasRouteAttempted(routeKey)) return "already-attempted";

  runtime.markRouteAttempted(routeKey);
  runtime.setRedirecting(true);
  runtime.requestLogin(runtime.getReturnTo());
  return "redirecting";
};

export const useRouteWeChatAutoLogin = () => {
  const route = useRoute();
  const userSessionStore = useUserSessionStore();
  const redirecting = ref(false);

  const attemptAutoLogin = () => {
    if (typeof window === "undefined") return;

    void runRouteWeChatAutoLoginAttempt({
      resolveRouteKey: () =>
        resolveAutoLoginRouteKey(
          route.path,
          route.meta.wechatAutoLoginPolicy,
        ),
      hasPendingHandoff: hasPendingWeChatOAuthHandoff,
      ensureAuthSessionBootstrapped,
      isAuthenticated: () => userSessionStore.isAuthenticated,
      clearRouteAttempted,
      isWeChatAbilityEnv,
      hasRouteAttempted,
      markRouteAttempted,
      isRedirecting: () => redirecting.value,
      setRedirecting: (value) => {
        redirecting.value = value;
      },
      getReturnTo: () => window.location.href,
      requestLogin: requestWeChatOAuthLogin,
    });
  };

  watch(
    () =>
      [route.name, route.path, userSessionStore.role, userSessionStore.userId] as const,
    () => {
      attemptAutoLogin();
    },
    { immediate: true },
  );

  return {
    attemptAutoLogin,
  };
};
