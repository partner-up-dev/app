import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";

type HandoffGet = (
  input: { query: { handoff: string } },
  options: { init: { credentials: "include"; signal?: AbortSignal } },
) => Promise<Response>;

const testState = vi.hoisted(() => ({
  applyAuthSession: vi.fn<(payload: unknown) => void>(),
  clearLoginPending: vi.fn<() => void>(),
  handoffGet: vi.fn<HandoffGet>(),
}));

vi.mock("@/lib/rpc", () => ({
  client: {
    api: {
      wechat: {
        oauth: {
          handoff: {
            $get: testState.handoffGet,
          },
        },
      },
    },
  },
}));

vi.mock("@/shared/auth/useUserSessionStore", () => ({
  useUserSessionStore: () => ({
    applyAuthSession: testState.applyAuthSession,
  }),
}));

vi.mock("@/processes/wechat/oauth-login-pending", () => ({
  clearWeChatOAuthLoginPending: testState.clearLoginPending,
}));

import { consumeWeChatOAuthHandoff } from "./oauth-handoff";

const installWindow = (href: string): { replacedUrls: string[] } => {
  const replacedUrls: string[] = [];
  const location = { href };
  const windowStub = {
    dispatchEvent: () => true,
    history: {
      state: null,
      replaceState: (_state: unknown, _unused: string, url: string | URL | null) => {
        if (url === null) return;
        location.href = new URL(String(url), location.href).toString();
        replacedUrls.push(location.href);
      },
    },
    location,
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: windowStub,
  });
  return { replacedUrls };
};

const uninstallWindow = (): void => {
  Reflect.deleteProperty(globalThis, "window");
};

afterEach(() => {
  uninstallWindow();
  vi.clearAllMocks();
});

test("classifies received 4xx handoff responses as terminal without applying auth", async () => {
  installWindow("https://app.partner-up.test/me?wechatOAuthHandoff=nonce-1");
  testState.handoffGet.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        code: "WECHAT_OAUTH_PUBLIC_IDENTITY_NOT_ALLOWED",
        detail: "OAuth identity is not eligible for a public session",
        status: 403,
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/problem+json" },
      },
    ),
  );

  const controller = new AbortController();
  const result = await consumeWeChatOAuthHandoff({ signal: controller.signal });

  assert.deepEqual(result, {
    kind: "terminal-failure",
    status: 403,
    code: "WECHAT_OAUTH_PUBLIC_IDENTITY_NOT_ALLOWED",
  });
  assert.equal(testState.applyAuthSession.mock.calls.length, 0);
  assert.equal(testState.clearLoginPending.mock.calls.length, 0);
  assert.deepEqual(testState.handoffGet.mock.calls[0]?.[0], {
    query: { handoff: "nonce-1" },
  });
  assert.equal(testState.handoffGet.mock.calls[0]?.[1]?.init.credentials, "include");
  assert.equal(testState.handoffGet.mock.calls[0]?.[1]?.init.signal, controller.signal);
});

test("keeps a 5xx handoff response retryable because cookie consumption is unknown", async () => {
  installWindow("https://app.partner-up.test/me?wechatOAuthHandoff=nonce-2");
  testState.handoffGet.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));

  const result = await consumeWeChatOAuthHandoff();

  assert.deepEqual(result, { kind: "retryable-failure", status: 503 });
  assert.equal(testState.applyAuthSession.mock.calls.length, 0);
});

test("treats a malformed successful response as terminal after the cookie may have been consumed", async () => {
  installWindow("https://app.partner-up.test/me?wechatOAuthHandoff=nonce-malformed");
  testState.handoffGet.mockResolvedValueOnce(new Response("not-json", { status: 200 }));

  const result = await consumeWeChatOAuthHandoff();

  assert.deepEqual(result, { kind: "terminal-failure", status: 200 });
  assert.equal(testState.applyAuthSession.mock.calls.length, 0);
  assert.equal(testState.clearLoginPending.mock.calls.length, 0);
});

test("applies a successful handoff session and removes the nonce", async () => {
  const browser = installWindow(
    "https://app.partner-up.test/me?tab=profile&wechatOAuthHandoff=nonce-3",
  );
  testState.handoffGet.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        ok: true,
        auth: {
          accessToken: "public-token",
          role: "authenticated",
          userId: "user-1",
        },
      }),
      { status: 200 },
    ),
  );

  const result = await consumeWeChatOAuthHandoff();

  assert.deepEqual(result, { kind: "success" });
  assert.deepEqual(testState.applyAuthSession.mock.calls[0]?.[0], {
    accessToken: "public-token",
    role: "authenticated",
    userId: "user-1",
  });
  assert.equal(testState.clearLoginPending.mock.calls.length, 1);
  assert.equal(browser.replacedUrls.length, 1);
  assert.equal(browser.replacedUrls[0], "https://app.partner-up.test/me?tab=profile");
});

test("returns absent when no handoff nonce is present", async () => {
  installWindow("https://app.partner-up.test/me");

  const result = await consumeWeChatOAuthHandoff();

  assert.deepEqual(result, { kind: "absent" });
  assert.equal(testState.handoffGet.mock.calls.length, 0);
});
