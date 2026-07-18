import assert from "node:assert/strict";
import { test } from "vitest";

process.env.DATABASE_URL ??= "postgres://unit:unit@localhost:5432/unit";
process.env.FRONTEND_URL = "https://app.partner-up.cn";
process.env.BACKEND_SCENARIO_DISABLE_BOOTSTRAP = "true";
process.env.BACKEND_SCENARIO_DISABLE_REQUEST_LOGGER = "true";
process.env.BACKEND_SCENARIO_DISABLE_REQUEST_TAIL = "true";

const { app } = await import("./index");

type CorsCase = {
  name: string;
  origin?: string;
  expectedAllowOrigin: string | null;
};

const corsCases: CorsCase[] = [
  {
    name: "paired origin",
    origin: "https://app.partner-up.cn",
    expectedAllowOrigin: "https://app.partner-up.cn",
  },
  {
    name: "arbitrary origin",
    origin: "https://topology-probe.invalid",
    expectedAllowOrigin: null,
  },
  {
    name: "other-environment origin",
    origin: "https://test.app.partner-up.cn",
    expectedAllowOrigin: null,
  },
  {
    name: "no Origin header",
    expectedAllowOrigin: null,
  },
];

const requestHeaders = (method: "GET" | "OPTIONS", origin?: string): Headers => {
  const headers = new Headers();
  if (origin !== undefined) {
    headers.set("Origin", origin);
  }
  if (method === "OPTIONS") {
    headers.set("Access-Control-Request-Method", "GET");
  }
  return headers;
};

for (const corsCase of corsCases) {
  test(`CORS preflight ${corsCase.name}`, async () => {
    const response = await app.request("/health", {
      method: "OPTIONS",
      headers: requestHeaders("OPTIONS", corsCase.origin),
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), corsCase.expectedAllowOrigin);
    if (corsCase.expectedAllowOrigin !== null) {
      assert.equal(response.headers.get("Access-Control-Allow-Credentials"), "true");
    }
  });

  test(`CORS normal request ${corsCase.name}`, async () => {
    const response = await app.request("/health", {
      method: "GET",
      headers: requestHeaders("GET", corsCase.origin),
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), corsCase.expectedAllowOrigin);
    if (corsCase.expectedAllowOrigin !== null) {
      assert.equal(response.headers.get("Access-Control-Allow-Credentials"), "true");
    }
  });
}
