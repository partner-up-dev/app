import assert from "node:assert/strict";
import { test } from "vitest";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://unit:unit@localhost:5432/unit";
process.env.FRONTEND_URL = "https://app.partner-up.test";
process.env.AUTH_JWT_SECRET = "test-auth-secret-with-at-least-16-chars";
process.env.WECHAT_ABILITY_MOCKING_ENABLED = "true";
process.env.WECHAT_ABILITY_MOCK_OPEN_ID = "test-open-id";

const { wechatRoute } = await import("./wechat.controller");

const FRONTEND_URL = "https://app.partner-up.test";

type OAuthStatePayload = {
  returnTo: string;
};

const readStatePayload = (response: Response): OAuthStatePayload => {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/(?:^|,\s*)wechat_oauth_state=([^;]+)/);
  assert.ok(match, "expected the base OAuth state cookie");

  const [encodedPayload] = decodeURIComponent(match[1]).split(".");
  return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as OAuthStatePayload;
};

const requestLogin = async (
  returnTo: string | undefined,
  headers: Record<string, string> = {},
): Promise<Response> => {
  const query = new URLSearchParams();
  if (returnTo !== undefined) {
    query.set("returnTo", returnTo);
  }

  const suffix = query.toString().length > 0 ? `?${query.toString()}` : "";
  return wechatRoute.request(`https://api.partner-up.test/oauth/login${suffix}`, {
    headers,
  });
};

test("trusted returnTo stays trusted even when request headers are hostile", async () => {
  const returnTo = `${FRONTEND_URL}/pr/42?tab=detail`;
  const response = await requestLogin(returnTo, {
    Origin: "https://attacker.test",
    Referer: "https://attacker.test/phishing",
  });

  assert.equal(response.status, 302);
  assert.equal(readStatePayload(response).returnTo, returnTo);
});

test("hostile returnTo is rejected even when Origin and Referer agree", async () => {
  const hostileOrigin = "https://attacker.test";
  const response = await requestLogin(`${hostileOrigin}/phishing`, {
    Origin: hostileOrigin,
    Referer: `${hostileOrigin}/start`,
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "returnTo origin is not allowed",
  });
});

test("bind rejects hostile returnTo before authentication or caller headers can widen trust", async () => {
  const hostileOrigin = "https://attacker.test";
  const query = new URLSearchParams({
    returnTo: `${hostileOrigin}/phishing`,
  });
  const response = await wechatRoute.request(
    `https://api.partner-up.test/oauth/bind?${query.toString()}`,
    {
      headers: {
        Origin: hostileOrigin,
        Referer: `${hostileOrigin}/start`,
      },
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "returnTo origin is not allowed",
  });
});

test("relative and absent returnTo values normalize to FRONTEND_URL", async () => {
  const relativeResponse = await requestLogin("/pr/42?tab=detail", {
    Origin: "https://attacker.test",
    Referer: "https://attacker.test/start",
  });
  assert.equal(relativeResponse.status, 302);
  assert.equal(readStatePayload(relativeResponse).returnTo, `${FRONTEND_URL}/pr/42?tab=detail`);

  const absentResponse = await requestLogin(undefined, {
    Origin: "https://attacker.test",
    Referer: "https://attacker.test/start",
  });
  assert.equal(absentResponse.status, 302);
  assert.equal(readStatePayload(absentResponse).returnTo, `${FRONTEND_URL}/`);
});
