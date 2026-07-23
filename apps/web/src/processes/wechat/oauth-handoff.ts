import { client } from "@/lib/rpc";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { readApiErrorPayload } from "@/shared/api/error";
import { clearWeChatOAuthLoginPending } from "@/processes/wechat/oauth-login-pending";

export const WECHAT_OAUTH_HANDOFF_QUERY_PARAM = "wechatOAuthHandoff";
export const WECHAT_OAUTH_HANDOFF_CLEARED_EVENT = "partnerup:wechat-oauth-handoff-cleared";

type ConsumeWeChatOAuthHandoffOptions = {
  signal?: AbortSignal;
};

export type ConsumeWeChatOAuthHandoffResult =
  | {
      kind: "success";
    }
  | {
      kind: "terminal-failure";
      status: number;
      code?: string;
    }
  | {
      kind: "retryable-failure";
      status?: number;
    }
  | {
      kind: "absent";
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
  if (!handoff) return { kind: "absent" };

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
    const errorPayload = await readApiErrorPayload(res);
    if (res.status >= 500) {
      return { kind: "retryable-failure", status: res.status };
    }
    return {
      kind: "terminal-failure",
      status: res.status,
      ...(errorPayload?.code ? { code: errorPayload.code } : {}),
    };
  }

  let payload: Awaited<ReturnType<typeof res.json>>;
  try {
    payload = await res.json();
  } catch {
    return { kind: "terminal-failure", status: res.status };
  }

  if (!payload.ok || !payload.auth) {
    return { kind: "terminal-failure", status: res.status };
  }

  const userSessionStore = useUserSessionStore();
  userSessionStore.applyAuthSession(payload.auth);
  clearWeChatOAuthHandoffFromAddressBar();
  clearWeChatOAuthLoginPending();
  return { kind: "success" };
};
