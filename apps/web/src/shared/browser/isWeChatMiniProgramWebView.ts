import { isWeChatBrowser } from "@/shared/browser/isWeChatBrowser";

export const isWeChatMiniProgramWebViewMockingEnabled = (): boolean =>
  import.meta.env.VITE_WECHAT_MINIPROGRAM_WEBVIEW_MOCKING_ENABLED === "true";

export const isWeChatMiniProgramWebViewUserAgent = (
  userAgent: string,
): boolean =>
  /micromessenger/i.test(userAgent) && /miniprogram/i.test(userAgent);

export const isWeChatMiniProgramWebView = (): boolean => {
  if (isWeChatMiniProgramWebViewMockingEnabled()) {
    return true;
  }

  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  if (window.__wxjs_environment === "miniprogram") {
    return true;
  }

  return (
    isWeChatBrowser() &&
    isWeChatMiniProgramWebViewUserAgent(navigator.userAgent)
  );
};
