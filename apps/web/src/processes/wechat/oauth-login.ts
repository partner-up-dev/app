import { resolveApiUrl } from "@/shared/api/base-url";
import {
  clearWeChatOAuthLoginPending,
  markWeChatOAuthLoginPending,
} from "@/processes/wechat/oauth-login-pending";
import { startWeChatOAuthTrace, trackWeChatOAuthTrace } from "@/processes/wechat/oauth-trace";

const OAUTH_RETURN_TO_SENSITIVE_QUERY_PARAMS = [
  "access_token",
  "code",
  "state",
  "token",
  "wechatOAuthHandoff",
] as const;

let oauthLoginRedirectInProgress = false;

const resolveCurrentBrowserOrigin = (): string | null => {
  if (typeof window === "undefined") return null;

  const origin = window.location?.origin;
  if (typeof origin === "string" && origin.length > 0) {
    return origin;
  }

  try {
    return new URL(window.location.href).origin;
  } catch {
    return null;
  }
};

const clearSensitiveOAuthUrlParts = (url: URL): boolean => {
  let changed = false;
  for (const param of OAUTH_RETURN_TO_SENSITIVE_QUERY_PARAMS) {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      changed = true;
    }
  }

  if (url.hash) {
    url.hash = "";
    changed = true;
  }

  return changed;
};

/**
 * Removes OAuth credentials from the visible callback URL after their values
 * have been read. This prevents browser history, reloads, and copied links
 * from retaining a provider code, state, token, or handoff nonce.
 */
export const clearWeChatOAuthSensitiveParamsFromAddressBar = (): void => {
  if (typeof window === "undefined") return;

  try {
    const url = new URL(window.location.href);
    if (!clearSensitiveOAuthUrlParts(url)) return;
    window.history.replaceState(window.history.state, "", url.toString());
  } catch {
    // A broken browser URL must not prevent the callback flow from resolving.
  }
};

export const normalizeOAuthReturnTo = (returnTo: string): string => {
  const currentOrigin = resolveCurrentBrowserOrigin();
  if (!currentOrigin) return returnTo;

  try {
    const normalized = new URL(returnTo, currentOrigin);
    if (normalized.origin !== currentOrigin) {
      return new URL("/", currentOrigin).toString();
    }

    clearSensitiveOAuthUrlParts(normalized);
    return normalized.toString();
  } catch {
    return new URL("/", currentOrigin).toString();
  }
};

const scheduleOAuthLoginRedirect = (url: string): void => {
  const redirect = (): void => {
    window.location.replace(url);
  };

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => {
      window.setTimeout(redirect, 0);
    });
    return;
  }

  window.setTimeout(redirect, 0);
};

export const resolveOAuthLoginUrl = (returnTo: string): string => {
  const query = new URLSearchParams({ returnTo: normalizeOAuthReturnTo(returnTo) });
  return resolveApiUrl("/api/wechat/oauth/login", query);
};

export const requestWeChatOAuthLogin = (returnTo: string): boolean => {
  if (typeof window === "undefined") return false;
  if (oauthLoginRedirectInProgress) return true;

  oauthLoginRedirectInProgress = true;
  startWeChatOAuthTrace("login");
  trackWeChatOAuthTrace("login_requested");
  markWeChatOAuthLoginPending();
  trackWeChatOAuthTrace("redirect_scheduled");
  scheduleOAuthLoginRedirect(resolveOAuthLoginUrl(returnTo));
  return true;
};

export const redirectToWeChatOAuthLogin = (returnTo: string): void => {
  requestWeChatOAuthLogin(returnTo);
};

export const resetWeChatOAuthLoginRedirectStateForTest = (): void => {
  oauthLoginRedirectInProgress = false;
  clearWeChatOAuthLoginPending();
};

export const redirectToWeChatOAuthBind = async (returnTo: string): Promise<void> => {
  if (typeof window === "undefined") return;

  startWeChatOAuthTrace("bind");
  trackWeChatOAuthTrace("bind_requested");
  const query = new URLSearchParams({ returnTo });
  const res = await fetch(resolveApiUrl("/api/wechat/oauth/bind", query), {
    credentials: "include",
  });

  if (!res.ok) {
    // Fallback to login flow if bind endpoint is temporarily unavailable.
    trackWeChatOAuthTrace("bind_fallback_login", {
      result: "failure",
      failureReason: `bind_status_${res.status}`,
    });
    requestWeChatOAuthLogin(returnTo);
    return;
  }

  const payload = (await res.json()) as { authorizeUrl?: string };
  if (!payload.authorizeUrl) {
    trackWeChatOAuthTrace("bind_fallback_login", {
      result: "failure",
      failureReason: "missing_authorize_url",
    });
    requestWeChatOAuthLogin(returnTo);
    return;
  }

  trackWeChatOAuthTrace("bind_authorize_received");
  window.location.replace(payload.authorizeUrl);
};
