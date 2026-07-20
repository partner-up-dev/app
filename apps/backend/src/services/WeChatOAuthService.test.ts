import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";
process.env.WECHAT_OFFICIAL_ACCOUNT_APP_ID = "test-app-id";
process.env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET = "test-app-secret";
process.env.WECHAT_AUTH_SESSION_SECRET = "test-session-secret";

type ProxyFetch = (url: URL, init?: RequestInit) => Promise<Response>;

const { proxyFetchMock } = vi.hoisted(() => ({
  proxyFetchMock: vi.fn<ProxyFetch>(),
}));

vi.mock("../lib/proxy-fetch", () => ({
  proxyFetch: proxyFetchMock,
}));

const { WeChatOAuthService } = await import("./WeChatOAuthService");

const providerResponse = (payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status: 200,
  });

beforeEach(() => {
  proxyFetchMock.mockReset();
});

test("exchangeCodeForSession trims a padded provider openid", async () => {
  proxyFetchMock.mockResolvedValueOnce(
    providerResponse({
      access_token: "oauth-token",
      expires_in: 7200,
      openid: "  padded-openid  ",
      scope: "snsapi_base",
    }),
  );

  const service = new WeChatOAuthService();
  const session = await service.exchangeCodeForSession("oauth-code");

  assert.deepEqual(session, {
    openId: "padded-openid",
    oauthAccessToken: "oauth-token",
    scope: "snsapi_base",
  });
});

test("exchangeCodeForSession rejects a whitespace-only provider openid", async () => {
  proxyFetchMock.mockResolvedValueOnce(
    providerResponse({
      access_token: "oauth-token",
      openid: " \t\n ",
    }),
  );

  const service = new WeChatOAuthService();

  await assert.rejects(
    service.exchangeCodeForSession("oauth-code"),
    /WeChat oauth2\/access_token response invalid/,
  );
});

test("fetchUserInfo compares the normalized provider openid to the session identity", async () => {
  proxyFetchMock.mockResolvedValueOnce(
    providerResponse({
      openid: "  normalized-openid  ",
      nickname: "搭子",
      sex: 1,
      headimgurl: " https://example.test/avatar.png ",
    }),
  );

  const service = new WeChatOAuthService();
  const profile = await service.fetchUserInfo(
    "oauth-token",
    "normalized-openid",
    "snsapi_userinfo",
  );

  assert.deepEqual(profile, {
    nickname: "搭子",
    sex: 1,
    avatar: "https://example.test/avatar.png",
  });

  const requestUrl = proxyFetchMock.mock.calls[0]?.[0];
  assert.ok(requestUrl);
  assert.equal(requestUrl.searchParams.get("openid"), "normalized-openid");
});

test("fetchUserInfo still rejects an identity mismatch", async () => {
  proxyFetchMock.mockResolvedValueOnce(providerResponse({ openid: "other-openid" }));

  const service = new WeChatOAuthService();

  await assert.rejects(
    service.fetchUserInfo("oauth-token", "normalized-openid", "snsapi_userinfo"),
    /WeChat sns\/userinfo openid mismatch/,
  );
});
