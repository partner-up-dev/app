import { ref } from "vue";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";
import { requestWeChatOAuthLogin } from "@/processes/wechat/oauth-login";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";

export type PRCreateAuthGateDependencies = {
  bootstrap?: () => Promise<void>;
  isAuthenticated?: () => boolean;
  requestOAuth?: (returnTo: string) => void;
  getReturnTo?: () => string;
};

export const createPRCreateAuthGate = (dependencies: PRCreateAuthGateDependencies = {}) => {
  const showAuthDisclosure = ref(false);
  let oauthRequested = false;
  const bootstrap = dependencies.bootstrap ?? ensureAuthSessionBootstrapped;
  const isAuthenticated =
    dependencies.isAuthenticated ?? (() => useUserSessionStore().isAuthenticated);
  const requestOAuth = dependencies.requestOAuth ?? requestWeChatOAuthLogin;
  const getReturnTo =
    dependencies.getReturnTo ?? (() => (typeof window === "undefined" ? "" : window.location.href));

  const ensureCreateAuth = async (): Promise<boolean> => {
    await bootstrap();
    if (isAuthenticated()) return true;
    showAuthDisclosure.value = true;
    oauthRequested = false;
    return false;
  };

  const cancelAuth = (): void => {
    showAuthDisclosure.value = false;
    oauthRequested = false;
  };

  const confirmAuth = (): void => {
    if (!showAuthDisclosure.value || oauthRequested) return;
    oauthRequested = true;
    showAuthDisclosure.value = false;
    requestOAuth(getReturnTo());
  };

  return { showAuthDisclosure, ensureCreateAuth, cancelAuth, confirmAuth };
};

export const usePRCreateAuthGate = (dependencies?: PRCreateAuthGateDependencies) =>
  createPRCreateAuthGate(dependencies);
