import assert from "node:assert/strict";
import { test } from "vitest";
import { isWeChatOAuthLoginPending } from "./oauth-login-pending";
import {
  normalizeOAuthReturnTo,
  requestWeChatOAuthLogin,
  resetWeChatOAuthLoginRedirectStateForTest,
} from "./oauth-login";

const installWindow = (
  replace: (url: string) => void,
  currentUrl = "https://partner-up.test/",
): void => {
  const location = new URL(currentUrl);
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        href: location.toString(),
        origin: location.origin,
        replace,
      },
      setTimeout: (callback: () => void) => {
        callback();
        return 0;
      },
    },
  });
};

const uninstallWindow = (): void => {
  Reflect.deleteProperty(globalThis, "window");
};

test("requestWeChatOAuthLogin single-flights redirect attempts", () => {
  const redirects: string[] = [];
  resetWeChatOAuthLoginRedirectStateForTest();
  installWindow((url) => redirects.push(url));

  try {
    assert.equal(requestWeChatOAuthLogin("https://partner-up.test/pr/1"), true);
    assert.equal(isWeChatOAuthLoginPending(), true);
    assert.equal(requestWeChatOAuthLogin("https://partner-up.test/pr/2"), true);

    assert.equal(redirects.length, 1);
    const redirectUrl = new URL(redirects[0], "https://partner-up.test");
    assert.equal(redirectUrl.pathname, "/api/wechat/oauth/login");
    assert.equal(redirectUrl.searchParams.get("returnTo"), "https://partner-up.test/pr/1");
    assert.match(redirectUrl.searchParams.get("traceId") ?? "", /^[0-9a-f-]{36}$/);
    assert.match(redirectUrl.searchParams.get("traceStartedAtMs") ?? "", /^\d+$/);
  } finally {
    resetWeChatOAuthLoginRedirectStateForTest();
    assert.equal(isWeChatOAuthLoginPending(), false);
    uninstallWindow();
  }
});

test("normalizes OAuth returnTo at the login boundary", () => {
  installWindow(() => undefined, "https://app.partner-up.test/pr/42");

  try {
    assert.equal(
      normalizeOAuthReturnTo(
        "https://app.partner-up.test/pr/42?mode=form&code=provider-code&state=provider-state&wechatOAuthHandoff=nonce#access_token=secret",
      ),
      "https://app.partner-up.test/pr/42?mode=form",
    );
    assert.equal(
      normalizeOAuthReturnTo("https://attacker.test/phishing?mode=form"),
      "https://app.partner-up.test/",
    );
    assert.equal(
      normalizeOAuthReturnTo("/me?tab=profile&token=legacy-token"),
      "https://app.partner-up.test/me?tab=profile",
    );
  } finally {
    uninstallWindow();
  }
});
