import { ref } from "vue";

const WECHAT_OAUTH_LOGIN_PENDING_STORAGE_KEY =
  "partner_up_wechat_oauth_login_pending";

const readStoredPending = (): boolean => {
  if (typeof window === "undefined") return false;

  try {
    return (
      window.sessionStorage.getItem(WECHAT_OAUTH_LOGIN_PENDING_STORAGE_KEY) ===
      "1"
    );
  } catch {
    return false;
  }
};

const writeStoredPending = (pending: boolean): void => {
  if (typeof window === "undefined") return;

  try {
    if (pending) {
      window.sessionStorage.setItem(WECHAT_OAUTH_LOGIN_PENDING_STORAGE_KEY, "1");
      return;
    }

    window.sessionStorage.removeItem(WECHAT_OAUTH_LOGIN_PENDING_STORAGE_KEY);
  } catch {
    // Keep the in-memory state useful when sessionStorage is unavailable.
  }
};

const wechatOAuthLoginPending = ref(readStoredPending());

export const markWeChatOAuthLoginPending = (): void => {
  wechatOAuthLoginPending.value = true;
  writeStoredPending(true);
};

export const clearWeChatOAuthLoginPending = (): void => {
  wechatOAuthLoginPending.value = false;
  writeStoredPending(false);
};

export const isWeChatOAuthLoginPending = (): boolean =>
  wechatOAuthLoginPending.value;

export const useWeChatOAuthLoginPending = () => ({
  pending: wechatOAuthLoginPending,
});
