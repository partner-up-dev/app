import type { Pinia } from "pinia";
import type { RouteLocationNormalized, Router } from "vue-router";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { isWeChatAbilityEnv } from "@/shared/wechat/ability-mocking";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";
import {
  hasPendingWeChatOAuthHandoff,
  WECHAT_OAUTH_HANDOFF_QUERY_PARAM,
} from "@/processes/wechat/oauth-handoff";
import { requestWeChatOAuthLogin } from "@/processes/wechat/oauth-login";

const AUTO_LOGIN_ATTEMPT_STORAGE_KEY = "partner_up_wechat_auto_login_attempted_routes";

export type RouteEntryTarget = Pick<
  RouteLocationNormalized,
  "path" | "fullPath" | "meta" | "query"
>;

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
    window.sessionStorage.setItem(AUTO_LOGIN_ATTEMPT_STORAGE_KEY, JSON.stringify(keys));
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

const resolveAutoLoginRouteKey = (route: RouteEntryTarget): string | null => {
  if (route.meta.wechatAutoLoginPolicy !== "route") return null;
  return route.path;
};

const routeHasPendingHandoff = (route: RouteEntryTarget): boolean =>
  Object.prototype.hasOwnProperty.call(route.query, WECHAT_OAUTH_HANDOFF_QUERY_PARAM);

export type RouteWeChatAutoLoginAttemptRuntime = {
  resolveRouteKey: () => string | null;
  hasPendingHandoff: () => boolean;
  ensureAuthSessionBootstrapped: () => Promise<void>;
  isNavigationCurrent?: () => boolean;
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

  if (runtime.isNavigationCurrent && !runtime.isNavigationCurrent()) return "skipped";
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

export type RouteWeChatAutoLoginGuardRuntime = Omit<
  RouteWeChatAutoLoginAttemptRuntime,
  "resolveRouteKey" | "isRedirecting" | "setRedirecting" | "getReturnTo"
> & {
  getReturnTo: (route: RouteEntryTarget) => string;
};

type RouteNavigationEpoch = {
  value: number;
};

export type RouteWeChatAutoLoginGuard = (route: RouteEntryTarget) => Promise<boolean>;

export const createRouteWeChatAutoLoginGuard = (
  runtime: RouteWeChatAutoLoginGuardRuntime,
  navigationEpoch: RouteNavigationEpoch = { value: 0 },
): RouteWeChatAutoLoginGuard => {
  let redirecting = false;

  return async (route) => {
    const currentNavigationEpoch = navigationEpoch.value;
    const result = await runRouteWeChatAutoLoginAttempt({
      ...runtime,
      resolveRouteKey: () => resolveAutoLoginRouteKey(route),
      hasPendingHandoff: () => runtime.hasPendingHandoff() || routeHasPendingHandoff(route),
      isNavigationCurrent: () => currentNavigationEpoch === navigationEpoch.value,
      isRedirecting: () => redirecting,
      setRedirecting: (value) => {
        redirecting = value;
      },
      getReturnTo: () => runtime.getReturnTo(route),
    });

    return result !== "redirecting";
  };
};

const resolveRouteReturnTo = (route: RouteEntryTarget): string => {
  if (typeof window === "undefined") return route.fullPath;

  try {
    return new URL(route.fullPath, window.location.origin).toString();
  } catch {
    return window.location.href;
  }
};

export const installRouteWeChatAutoLoginGuard = (
  router: Pick<Router, "beforeEach" | "beforeResolve">,
  pinia: Pinia,
): (() => void) => {
  const navigationEpoch: RouteNavigationEpoch = { value: 0 };
  const removeNavigationEpoch = router.beforeEach(() => {
    navigationEpoch.value += 1;
  });
  const removeAutoLoginGuard = router.beforeResolve(
    createRouteWeChatAutoLoginGuard(
      {
        hasPendingHandoff: hasPendingWeChatOAuthHandoff,
        ensureAuthSessionBootstrapped,
        isAuthenticated: () => useUserSessionStore(pinia).isAuthenticated,
        clearRouteAttempted,
        isWeChatAbilityEnv,
        hasRouteAttempted,
        markRouteAttempted,
        getReturnTo: resolveRouteReturnTo,
        requestLogin: requestWeChatOAuthLogin,
      },
      navigationEpoch,
    ),
  );

  return () => {
    removeNavigationEpoch();
    removeAutoLoginGuard();
  };
};
