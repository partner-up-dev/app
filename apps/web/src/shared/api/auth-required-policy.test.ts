import assert from "node:assert/strict";
import { test } from "vitest";
import {
  AUTHENTICATED_REQUIRED_CODE,
  handleAuthenticatedRequiredResponse,
  resetAuthenticatedRequiredRedirectStateForTest,
} from "./auth-required-policy";

const installWindow = (replace: (url: string) => void): void => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
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

test("AUTHENTICATED_REQUIRED policy uses the shared OAuth redirect single-flight", () => {
  const redirects: string[] = [];
  resetAuthenticatedRequiredRedirectStateForTest();
  installWindow((url) => redirects.push(url));

  try {
    const payload = {
      code: AUTHENTICATED_REQUIRED_CODE,
      detail: "Login required",
    };

    assert.equal(
      handleAuthenticatedRequiredResponse(401, payload, "https://partner-up.test/pr/1"),
      true,
    );
    assert.equal(
      handleAuthenticatedRequiredResponse(401, payload, "https://partner-up.test/pr/2"),
      true,
    );

    assert.equal(redirects.length, 1);
    const redirectUrl = new URL(redirects[0], "https://partner-up.test");
    assert.equal(redirectUrl.pathname, "/api/wechat/oauth/login");
    assert.equal(redirectUrl.searchParams.get("returnTo"), "https://partner-up.test/pr/1");
    assert.match(redirectUrl.searchParams.get("traceId") ?? "", /^[0-9a-f-]{36}$/);
    assert.match(redirectUrl.searchParams.get("traceStartedAtMs") ?? "", /^\d+$/);
  } finally {
    resetAuthenticatedRequiredRedirectStateForTest();
    uninstallWindow();
  }
});
