import { resolveApiUrl } from "@/shared/api/base-url";
import {
  clearWeChatOAuthLoginPending,
  markWeChatOAuthLoginPending,
} from "@/processes/wechat/oauth-login-pending";
import {
  appendWeChatOAuthTraceQuery,
  startWeChatOAuthTrace,
  trackWeChatOAuthTrace,
} from "@/processes/wechat/oauth-trace";

let oauthLoginRedirectInProgress = false;

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

export const resolveOAuthLoginUrl = (
  returnTo: string,
  trace?: ReturnType<typeof startWeChatOAuthTrace>,
): string => {
  const query = new URLSearchParams({ returnTo });
  if (trace) {
    appendWeChatOAuthTraceQuery(query, trace);
  }
  return resolveApiUrl("/api/wechat/oauth/login", query);
};

export const requestWeChatOAuthLogin = (returnTo: string): boolean => {
  if (typeof window === "undefined") return false;
  if (oauthLoginRedirectInProgress) return true;

  oauthLoginRedirectInProgress = true;
  const trace = startWeChatOAuthTrace("login");
  trackWeChatOAuthTrace("login_requested");
  markWeChatOAuthLoginPending();
  trackWeChatOAuthTrace("redirect_scheduled");
  scheduleOAuthLoginRedirect(resolveOAuthLoginUrl(returnTo, trace));
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

  const trace = startWeChatOAuthTrace("bind");
  trackWeChatOAuthTrace("bind_requested");
  const query = appendWeChatOAuthTraceQuery(new URLSearchParams({ returnTo }), trace);
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
