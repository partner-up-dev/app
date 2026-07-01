import assert from "node:assert/strict";
import { once } from "node:events";
import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type Server,
} from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, test } from "vitest";
import {
  createCaocaoCallbackRouterServer,
  resolveCaocaoCallbackRouterDecision,
  type CaocaoCallbackRouterLogEvent,
} from "./caocao-callback-router";

type CapturedRequest = {
  body: Buffer;
  headers: IncomingHttpHeaders;
  method: string;
  url: string;
};

type TestServer = {
  origin: string;
  server: Server;
};

const activeServers: Server[] = [];

const readBody = async (request: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    request.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;
      chunks.push(buffer);
    });

    request.on("end", () => resolve(Buffer.concat(chunks, totalBytes)));
    request.on("error", reject);
  });

const closeServer = async (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const listen = async (server: Server): Promise<TestServer> => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  activeServers.push(server);
  const address = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${address.port}`,
    server,
  };
};

const createUpstream = async (
  name: string,
): Promise<TestServer & { requests: CapturedRequest[] }> => {
  const requests: CapturedRequest[] = [];
  const server = createServer(async (request, response) => {
    requests.push({
      body: await readBody(request),
      headers: request.headers,
      method: request.method ?? "",
      url: request.url ?? "",
    });
    const payload = Buffer.from(JSON.stringify({ upstream: name }));
    response.writeHead(202, {
      "content-length": String(payload.length),
      "content-type": "application/json; charset=utf-8",
    });
    response.end(payload);
  });
  return {
    ...(await listen(server)),
    requests,
  };
};

const createRouter = async (input: {
  logs?: CaocaoCallbackRouterLogEvent[];
  maxBodyBytes?: number;
  productionOrigin: string;
  stagingOrigin: string;
}): Promise<TestServer> =>
  listen(
    createCaocaoCallbackRouterServer({
      logger: (event) => input.logs?.push(event),
      maxBodyBytes: input.maxBodyBytes,
      productionOrigin: input.productionOrigin,
      stagingOrigin: input.stagingOrigin,
    }),
  );

afterEach(async () => {
  const servers = activeServers.splice(0);
  await Promise.all(servers.map((server) => closeServer(server)));
});

test("resolveCaocaoCallbackRouterDecision maps callback_info tokens", () => {
  assert.deepEqual(
    resolveCaocaoCallbackRouterDecision(
      Buffer.from("callback_info=pu.rhc.v1.stg.provider-1&sign=s"),
    ),
    {
      reason: "stg-token",
      targetEnvironment: "staging",
    },
  );
  assert.deepEqual(
    resolveCaocaoCallbackRouterDecision(
      Buffer.from("callback_info=pu.rhc.v1.prod.provider-1&sign=s"),
    ),
    {
      reason: "prod-token",
      targetEnvironment: "production",
    },
  );
  assert.deepEqual(resolveCaocaoCallbackRouterDecision(Buffer.from("sign=s")), {
    reason: "missing-callback-info",
    targetEnvironment: "production",
  });
  assert.deepEqual(
    resolveCaocaoCallbackRouterDecision(Buffer.from("callback_info=pu.rhc.v1.dev.provider-1")),
    {
      reason: "invalid-callback-info",
      targetEnvironment: null,
    },
  );
});

test("router forwards stg callback_info requests to the staging origin with raw body", async () => {
  const staging = await createUpstream("staging");
  const production = await createUpstream("production");
  const logs: CaocaoCallbackRouterLogEvent[] = [];
  const router = await createRouter({
    logs,
    productionOrigin: production.origin,
    stagingOrigin: staging.origin,
  });
  const rawBody = Buffer.from(
    "order_id=caocao-1&callback_info=pu.rhc.v1.stg.provider%2Bencoded&sign=abc",
  );

  const response = await fetch(
    `${router.origin}/api/v1/service_provider/caocao/callback/order?from=caocao`,
    {
      body: rawBody,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        forwarded: "for=203.0.113.10;host=ride-hailing1.sz.partner-up.ltd;proto=https",
        "x-forwarded-for": "203.0.113.10",
        "x-forwarded-host": "ride-hailing1.sz.partner-up.ltd",
        "x-forwarded-port": "443",
        "x-forwarded-proto": "https",
        "x-real-ip": "203.0.113.10",
        "x-request-id": "stg-request",
      },
      method: "POST",
    },
  );

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { upstream: "staging" });
  assert.equal(staging.requests.length, 1);
  assert.equal(production.requests.length, 0);
  assert.equal(
    staging.requests[0].url,
    "/api/v1/service_provider/caocao/callback/order?from=caocao",
  );
  assert.equal(staging.requests[0].method, "POST");
  assert.deepEqual(staging.requests[0].body, rawBody);
  assert.equal(staging.requests[0].headers["content-type"], "application/x-www-form-urlencoded");
  assert.equal(staging.requests[0].headers["x-request-id"], "stg-request");
  assert.equal(staging.requests[0].headers.forwarded, undefined);
  assert.equal(staging.requests[0].headers["x-forwarded-for"], undefined);
  assert.equal(staging.requests[0].headers["x-forwarded-host"], undefined);
  assert.equal(staging.requests[0].headers["x-forwarded-port"], undefined);
  assert.equal(staging.requests[0].headers["x-forwarded-proto"], undefined);
  assert.equal(staging.requests[0].headers["x-real-ip"], undefined);
  assert.equal(logs.at(-1)?.targetEnvironment, "staging");
  assert.equal(logs.at(-1)?.routingReason, "stg-token");
});

test("router forwards prod and missing callback_info requests to production", async () => {
  const staging = await createUpstream("staging");
  const production = await createUpstream("production");
  const router = await createRouter({
    productionOrigin: production.origin,
    stagingOrigin: staging.origin,
  });

  const prodResponse = await fetch(
    `${router.origin}/api/v1/service_provider/caocao/callback/order`,
    {
      body: "callback_info=pu.rhc.v1.prod.provider-1&sign=s",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
  );
  const missingResponse = await fetch(
    `${router.origin}/api/v1/service_provider/caocao/callback/order`,
    {
      body: "order_id=legacy&sign=s",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
  );

  assert.equal(prodResponse.status, 202);
  assert.equal(missingResponse.status, 202);
  assert.equal(production.requests.length, 2);
  assert.equal(staging.requests.length, 0);
});

test("router rejects present but invalid or duplicated callback_info values", async () => {
  const staging = await createUpstream("staging");
  const production = await createUpstream("production");
  const router = await createRouter({
    productionOrigin: production.origin,
    stagingOrigin: staging.origin,
  });

  const invalidResponse = await fetch(
    `${router.origin}/api/v1/service_provider/caocao/callback/order`,
    {
      body: "callback_info=unknown&sign=s",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
  );
  const duplicateResponse = await fetch(
    `${router.origin}/api/v1/service_provider/caocao/callback/order`,
    {
      body: "callback_info=pu.rhc.v1.stg.one&callback_info=pu.rhc.v1.prod.two&sign=s",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
  );

  assert.equal(invalidResponse.status, 400);
  assert.equal(duplicateResponse.status, 400);
  assert.equal(staging.requests.length, 0);
  assert.equal(production.requests.length, 0);
});

test("router applies method, path, and body size guards", async () => {
  const staging = await createUpstream("staging");
  const production = await createUpstream("production");
  const router = await createRouter({
    maxBodyBytes: 8,
    productionOrigin: production.origin,
    stagingOrigin: staging.origin,
  });

  const wrongMethodResponse = await fetch(
    `${router.origin}/api/v1/service_provider/caocao/callback/order`,
  );
  const wrongPathResponse = await fetch(`${router.origin}/healthz`, {
    method: "POST",
  });
  const largeBodyResponse = await fetch(
    `${router.origin}/api/v1/service_provider/caocao/callback/order`,
    {
      body: "callback_info=pu.rhc.v1.stg.provider-1",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
  );

  assert.equal(wrongMethodResponse.status, 405);
  assert.equal(wrongPathResponse.status, 404);
  assert.equal(largeBodyResponse.status, 413);
  assert.equal(staging.requests.length, 0);
  assert.equal(production.requests.length, 0);
});
