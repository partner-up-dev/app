import { client } from "@/lib/rpc";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { clearWeChatOAuthLoginPending } from "@/processes/wechat/oauth-login-pending";

export const WECHAT_OAUTH_HANDOFF_QUERY_PARAM = "wechatOAuthHandoff";
export const WECHAT_OAUTH_HANDOFF_CLEARED_EVENT = "partnerup:wechat-oauth-handoff-cleared";

type ConsumeWeChatOAuthHandoffOptions = {
  signal?: AbortSignal;
};

export type ConsumeWeChatOAuthHandoffResult = {
  consumed: boolean;
  traceId?: string;
};

const resolveCurrentUrl = (): URL | null => {
  if (typeof window === "undefined") return null;

  try {
    return new URL(window.location.href);
  } catch {
    return null;
  }
};

export const clearWeChatOAuthHandoffFromAddressBar = (): void => {
  if (typeof window === "undefined") return;

  const url = resolveCurrentUrl();
  if (!url) return;

  const hadHandoff = url.searchParams.has(WECHAT_OAUTH_HANDOFF_QUERY_PARAM);
  url.searchParams.delete(WECHAT_OAUTH_HANDOFF_QUERY_PARAM);
  window.history.replaceState(window.history.state, "", url.toString());

  if (hadHandoff) {
    window.dispatchEvent(new Event(WECHAT_OAUTH_HANDOFF_CLEARED_EVENT));
  }
};

export const hasPendingWeChatOAuthHandoff = (): boolean => {
  const url = resolveCurrentUrl();
  if (!url) return false;
  return url.searchParams.has(WECHAT_OAUTH_HANDOFF_QUERY_PARAM);
};

export const consumeWeChatOAuthHandoff = async (
  options: ConsumeWeChatOAuthHandoffOptions = {},
): Promise<ConsumeWeChatOAuthHandoffResult> => {
  const url = resolveCurrentUrl();
  const handoff = url?.searchParams.get(WECHAT_OAUTH_HANDOFF_QUERY_PARAM);
  if (!handoff) return { consumed: false };

  const res = await client.api.wechat.oauth.handoff.$get(
    {
      query: { handoff },
    },
    {
      init: {
        credentials: "include",
        signal: options.signal,
      },
    },
  );

  if (!res.ok) {
    return { consumed: false };
  }

  const payload = await res.json();
  if (!payload.ok) {
    return { consumed: false };
  }

  const userSessionStore = useUserSessionStore();
  userSessionStore.applyAuthSession(payload.auth);
  clearWeChatOAuthHandoffFromAddressBar();
  clearWeChatOAuthLoginPending();
  return {
    consumed: true,
    traceId: payload.traceId ?? undefined,
  };
};
