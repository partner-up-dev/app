import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { scenario } from "../_infra/scenario/scenario";
import { readJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import { users } from "../../src/entities/user";
import { givenUser } from "../pr/_kit/builders/users";

const API_ORIGIN = "https://api.partner-up.test";
const HANDOFF_QUERY_PARAM = "wechatOAuthHandoff";
const MOCK_OPEN_ID = process.env.WECHAT_ABILITY_MOCK_OPEN_ID?.trim() || "dev-mock-openid";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:4002";

type ProblemDetails = {
  status: number;
  code?: string;
  detail: string;
};

type NavigationHandoff = {
  cookie: string;
  handoff: string;
};

type OAuthCallbackRequest = {
  callbackUrl: URL;
  stateCookie: string;
};

const readRedirectLocation = (response: Response): URL => {
  const location = response.headers.get("location");
  assert.ok(location, "expected redirect location");
  return new URL(location, API_ORIGIN);
};

const readCookie = (response: Response, name: string): string => {
  const cookie = response.headers
    .getSetCookie()
    .find((candidate) => candidate.startsWith(`${name}=`));
  assert.ok(cookie, `expected ${name} cookie`);
  return cookie.slice(0, cookie.indexOf(";"));
};

const readNamedCookie = (response: Response, prefix: string): string => {
  const cookie = response.headers.getSetCookie().find((candidate) => candidate.startsWith(prefix));
  assert.ok(cookie, `expected cookie beginning with ${prefix}`);
  return cookie.slice(0, cookie.indexOf(";"));
};

const clearMockOpenId = async (): Promise<void> => {
  await getTestDb().update(users).set({ openId: null }).where(eq(users.openId, MOCK_OPEN_ID));
};

const startLoginCallback = async (returnTo: string): Promise<OAuthCallbackRequest> => {
  const loginResponse = await requestJson(
    `${API_ORIGIN}/api/wechat/oauth/login?${new URLSearchParams({ returnTo }).toString()}`,
    { method: "GET" },
  );
  assert.equal(loginResponse.status, 302);
  const stateCookie = readCookie(loginResponse, "wechat_oauth_state");

  const mockAuthorizeResponse = await requestJson(readRedirectLocation(loginResponse).toString(), {
    method: "GET",
    headers: { cookie: stateCookie },
  });
  assert.equal(mockAuthorizeResponse.status, 302);

  return {
    callbackUrl: readRedirectLocation(mockAuthorizeResponse),
    stateCookie,
  };
};

const startNavigationHandoff = async (returnTo: string): Promise<NavigationHandoff> => {
  const callback = await startLoginCallback(returnTo);
  const callbackResponse = await requestJson(callback.callbackUrl.toString(), {
    method: "GET",
    headers: {
      accept: "text/html",
      cookie: callback.stateCookie,
      "sec-fetch-mode": "navigate",
    },
  });
  assert.equal(callbackResponse.status, 302);

  const callbackLocation = readRedirectLocation(callbackResponse);
  const handoff = callbackLocation.searchParams.get(HANDOFF_QUERY_PARAM);
  assert.ok(handoff, "expected navigation callback handoff nonce");
  assert.equal(callbackLocation.searchParams.get("access_token"), null);
  assert.equal(callbackLocation.searchParams.get("code"), null);
  assert.equal(callbackLocation.searchParams.get("state"), null);
  assert.equal(callbackLocation.searchParams.get("token"), null);

  return {
    cookie: readNamedCookie(callbackResponse, "wechat_oauth_handoff_"),
    handoff,
  };
};

const startBindCallback = async (
  returnTo: string,
  token: string,
): Promise<{ callbackUrl: URL; stateCookie: string }> => {
  const bindResponse = await requestJson(
    `${API_ORIGIN}/api/wechat/oauth/bind?${new URLSearchParams({ returnTo }).toString()}`,
    {
      method: "GET",
      token,
    },
  );
  assert.equal(bindResponse.status, 200);
  const { authorizeUrl } = await readJsonResponse<{ authorizeUrl: string }>(bindResponse);
  assert.ok(authorizeUrl, "expected mock OAuth authorize URL");
  const stateCookie = readCookie(bindResponse, "wechat_oauth_state");

  const mockAuthorizeResponse = await requestJson(authorizeUrl, {
    method: "GET",
    headers: { cookie: stateCookie },
  });
  assert.equal(mockAuthorizeResponse.status, 302);

  return {
    callbackUrl: readRedirectLocation(mockAuthorizeResponse),
    stateCookie,
  };
};

scenario("wechat_oauth_handoff_rejects_non_public_identity_without_token", async (ctx) => {
  await clearMockOpenId();
  const user = await givenUser("wechat-oauth-handoff-public-identity");
  await getTestDb().update(users).set({ openId: MOCK_OPEN_ID }).where(eq(users.id, user.user.id));

  const returnTo = new URL("/me", FRONTEND_URL).toString();
  const healthyHandoff = await startNavigationHandoff(returnTo);
  const healthyResponse = await requestJson(
    `${API_ORIGIN}/api/wechat/oauth/handoff?${new URLSearchParams({
      handoff: healthyHandoff.handoff,
    }).toString()}`,
    {
      method: "GET",
      headers: { cookie: healthyHandoff.cookie },
    },
  );
  assert.equal(healthyResponse.status, 200);
  assert.equal(healthyResponse.headers.get("cache-control"), "no-store");
  assert.ok(healthyResponse.headers.get("x-access-token"));
  const healthyPayload = await readJsonResponse<{
    ok: true;
    auth: { role: string; userId: string; accessToken: string };
  }>(healthyResponse);
  assert.equal(healthyPayload.auth.role, "authenticated");
  assert.equal(healthyPayload.auth.userId, user.user.id);
  assert.ok(healthyPayload.auth.accessToken.length > 0);

  const rejectedHandoff = await startNavigationHandoff(returnTo);

  await getTestDb()
    .update(users)
    .set({ role: ["service"] })
    .where(eq(users.id, user.user.id));

  const handoffResponse = await requestJson(
    `${API_ORIGIN}/api/wechat/oauth/handoff?${new URLSearchParams({
      handoff: rejectedHandoff.handoff,
    }).toString()}`,
    {
      method: "GET",
      headers: { cookie: rejectedHandoff.cookie },
    },
  );
  assert.equal(handoffResponse.status, 403);
  assert.match(handoffResponse.headers.get("content-type") ?? "", /application\/problem\+json/);
  assert.equal(handoffResponse.headers.get("cache-control"), "no-store");
  assert.equal(handoffResponse.headers.get("x-access-token"), null);
  const handoffProblem = await readJsonResponse<ProblemDetails>(handoffResponse);
  assert.equal(handoffProblem.status, 403);
  assert.equal(handoffProblem.code, "WECHAT_OAUTH_PUBLIC_IDENTITY_NOT_ALLOWED");
  assert.doesNotMatch(JSON.stringify(handoffProblem), /accessToken|token/i);

  const replayResponse = await requestJson(
    `${API_ORIGIN}/api/wechat/oauth/handoff?${new URLSearchParams({
      handoff: rejectedHandoff.handoff,
    }).toString()}`,
    { method: "GET" },
  );
  assert.equal(replayResponse.status, 400);
  assert.equal(replayResponse.headers.get("x-access-token"), null);
  const replayProblem = await readJsonResponse<ProblemDetails>(replayResponse);
  assert.equal(replayProblem.code, "WECHAT_OAUTH_HANDOFF_INVALID");

  ctx.record("handoff", rejectedHandoff.handoff);
  ctx.record("terminalStatus", handoffProblem.status);
  ctx.record("terminalCode", handoffProblem.code ?? null);
});

scenario("wechat_oauth_callback_preserves_direct_json_compatibility", async (ctx) => {
  await clearMockOpenId();
  const user = await givenUser("wechat-oauth-direct-callback");
  await getTestDb().update(users).set({ openId: MOCK_OPEN_ID }).where(eq(users.id, user.user.id));

  const returnTo = new URL("/me?tab=profile", FRONTEND_URL).toString();
  const healthyCallback = await startLoginCallback(returnTo);
  const healthyResponse = await requestJson(healthyCallback.callbackUrl.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      cookie: healthyCallback.stateCookie,
      "sec-fetch-mode": "cors",
    },
  });
  assert.equal(healthyResponse.status, 200);
  assert.ok(healthyResponse.headers.get("x-access-token"));
  const healthyPayload = await readJsonResponse<{
    ok: true;
    returnTo: string;
    auth: { role: string; userId: string; accessToken: string };
  }>(healthyResponse);
  assert.equal(healthyPayload.ok, true);
  assert.equal(healthyPayload.returnTo, returnTo);
  assert.equal(healthyPayload.auth.role, "authenticated");
  assert.equal(healthyPayload.auth.userId, user.user.id);
  assert.ok(healthyPayload.auth.accessToken.length > 0);

  const rejectedCallback = await startLoginCallback(returnTo);
  await getTestDb()
    .update(users)
    .set({ role: ["service"] })
    .where(eq(users.id, user.user.id));

  const rejectedResponse = await requestJson(rejectedCallback.callbackUrl.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      cookie: rejectedCallback.stateCookie,
      "sec-fetch-mode": "cors",
    },
  });
  assert.equal(rejectedResponse.status, 403);
  assert.equal(rejectedResponse.headers.get("x-access-token"), null);
  const rejectedPayload = await readJsonResponse<{
    ok: false;
    error: string;
    returnTo?: string;
  }>(rejectedResponse);
  assert.equal(rejectedPayload.ok, false);
  assert.equal(rejectedPayload.returnTo, returnTo);
  assert.doesNotMatch(JSON.stringify(rejectedPayload), /accessToken|token/i);

  ctx.record("directSuccessRole", healthyPayload.auth.role);
  ctx.record("directFailureStatus", rejectedResponse.status);
});

scenario("wechat_oauth_bind_never_announces_success_for_non_public_identity", async (ctx) => {
  await clearMockOpenId();
  const user = await givenUser("wechat-oauth-bind-public-identity");
  const returnTo = new URL("/settings", FRONTEND_URL).toString();
  const bind = await startBindCallback(returnTo, user.token);

  await getTestDb()
    .update(users)
    .set({ role: ["service"] })
    .where(eq(users.id, user.user.id));

  const callbackResponse = await requestJson(bind.callbackUrl.toString(), {
    method: "GET",
    headers: {
      accept: "text/html",
      cookie: bind.stateCookie,
      "sec-fetch-mode": "navigate",
    },
  });
  assert.equal(callbackResponse.status, 302);
  assert.equal(callbackResponse.headers.get("x-access-token"), null);
  assert.equal(
    callbackResponse.headers
      .getSetCookie()
      .some((candidate) => candidate.startsWith("wechat_oauth_handoff_")),
    false,
  );

  const callbackLocation = readRedirectLocation(callbackResponse);
  assert.equal(callbackLocation.searchParams.get("wechatBind"), "failed");
  assert.equal(callbackLocation.searchParams.get("wechatOAuthHandoff"), null);
  assert.notEqual(callbackLocation.searchParams.get("wechatBind"), "success");

  ctx.record("bindResult", callbackLocation.searchParams.get("wechatBind") ?? null);
});
