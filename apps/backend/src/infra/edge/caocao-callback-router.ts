import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { URL } from "node:url";

export const CAOCAO_CALLBACK_ROUTER_DEFAULT_CALLBACK_PATH =
  "/api/v1/service_provider/caocao/callback/order";
export const CAOCAO_CALLBACK_ROUTER_DEFAULT_HOST = "127.0.0.1";
export const CAOCAO_CALLBACK_ROUTER_DEFAULT_PORT = 6080;
export const CAOCAO_CALLBACK_ROUTER_DEFAULT_MAX_BODY_BYTES = 16 * 1024;
export const CAOCAO_CALLBACK_ROUTER_DEFAULT_UPSTREAM_TIMEOUT_MS = 15_000;
export const CAOCAO_CALLBACK_ROUTER_DEFAULT_STAGING_ORIGIN = "https://test.api-app.partner-up.cn";
export const CAOCAO_CALLBACK_ROUTER_DEFAULT_PRODUCTION_ORIGIN = "https://api-app.partner-up.cn";

export type CaocaoCallbackRouterTargetEnvironment = "production" | "staging";

export type CaocaoCallbackRouterDecision =
  | {
      targetEnvironment: "production";
      reason: "missing-callback-info" | "prod-token";
    }
  | {
      targetEnvironment: "staging";
      reason: "stg-token";
    }
  | {
      targetEnvironment: null;
      reason: "duplicate-callback-info" | "invalid-callback-info";
    };

export type CaocaoCallbackRouterLogEvent = {
  event: "caocao_callback_router_request";
  method: string;
  path: string;
  requestId: string | null;
  routingReason:
    | CaocaoCallbackRouterDecision["reason"]
    | "body-too-large"
    | "method-not-allowed"
    | "not-found"
    | "upstream-error"
    | "upstream-timeout";
  targetEnvironment: CaocaoCallbackRouterTargetEnvironment | null;
  upstreamStatus: number | null;
  responseStatus: number;
  durationMs: number;
};

export type CaocaoCallbackRouterLogger = (event: CaocaoCallbackRouterLogEvent) => void;

export type CaocaoCallbackRouterConfig = {
  callbackPath: string;
  host: string;
  port: number;
  maxBodyBytes: number;
  upstreamTimeoutMs: number;
  stagingOrigin: URL;
  productionOrigin: URL;
  logger: CaocaoCallbackRouterLogger;
};

type CreateCaocaoCallbackRouterInput = Partial<
  Omit<CaocaoCallbackRouterConfig, "stagingOrigin" | "productionOrigin">
> & {
  stagingOrigin?: URL | string;
  productionOrigin?: URL | string;
};

class CaocaoCallbackRouterHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const isHttpOrigin = (url: URL): boolean => url.protocol === "http:" || url.protocol === "https:";

const parseOrigin = (value: string | URL, name: string): URL => {
  const url = value instanceof URL ? value : new URL(value);
  if (!isHttpOrigin(url)) {
    throw new Error(`${name} must use http or https`);
  }
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url;
};

const parsePositiveInteger = (
  value: string | undefined,
  fallback: number,
  name: string,
): number => {
  if (value === undefined || value.trim().length === 0) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
};

const defaultLogger: CaocaoCallbackRouterLogger = (event) => {
  console.info(JSON.stringify(event));
};

export function createCaocaoCallbackRouterConfig(
  input: CreateCaocaoCallbackRouterInput = {},
): CaocaoCallbackRouterConfig {
  return {
    callbackPath: input.callbackPath ?? CAOCAO_CALLBACK_ROUTER_DEFAULT_CALLBACK_PATH,
    host: input.host ?? CAOCAO_CALLBACK_ROUTER_DEFAULT_HOST,
    port: input.port ?? CAOCAO_CALLBACK_ROUTER_DEFAULT_PORT,
    maxBodyBytes: input.maxBodyBytes ?? CAOCAO_CALLBACK_ROUTER_DEFAULT_MAX_BODY_BYTES,
    upstreamTimeoutMs:
      input.upstreamTimeoutMs ?? CAOCAO_CALLBACK_ROUTER_DEFAULT_UPSTREAM_TIMEOUT_MS,
    stagingOrigin: parseOrigin(
      input.stagingOrigin ?? CAOCAO_CALLBACK_ROUTER_DEFAULT_STAGING_ORIGIN,
      "stagingOrigin",
    ),
    productionOrigin: parseOrigin(
      input.productionOrigin ?? CAOCAO_CALLBACK_ROUTER_DEFAULT_PRODUCTION_ORIGIN,
      "productionOrigin",
    ),
    logger: input.logger ?? defaultLogger,
  };
}

export function createCaocaoCallbackRouterConfigFromEnv(
  env: NodeJS.ProcessEnv,
): CaocaoCallbackRouterConfig {
  return createCaocaoCallbackRouterConfig({
    callbackPath:
      env.CAOCAO_CALLBACK_ROUTER_CALLBACK_PATH ?? CAOCAO_CALLBACK_ROUTER_DEFAULT_CALLBACK_PATH,
    host: env.CAOCAO_CALLBACK_ROUTER_HOST ?? CAOCAO_CALLBACK_ROUTER_DEFAULT_HOST,
    port: parsePositiveInteger(
      env.CAOCAO_CALLBACK_ROUTER_PORT,
      CAOCAO_CALLBACK_ROUTER_DEFAULT_PORT,
      "CAOCAO_CALLBACK_ROUTER_PORT",
    ),
    maxBodyBytes: parsePositiveInteger(
      env.CAOCAO_CALLBACK_ROUTER_MAX_BODY_BYTES,
      CAOCAO_CALLBACK_ROUTER_DEFAULT_MAX_BODY_BYTES,
      "CAOCAO_CALLBACK_ROUTER_MAX_BODY_BYTES",
    ),
    upstreamTimeoutMs: parsePositiveInteger(
      env.CAOCAO_CALLBACK_ROUTER_UPSTREAM_TIMEOUT_MS,
      CAOCAO_CALLBACK_ROUTER_DEFAULT_UPSTREAM_TIMEOUT_MS,
      "CAOCAO_CALLBACK_ROUTER_UPSTREAM_TIMEOUT_MS",
    ),
    stagingOrigin:
      env.CAOCAO_CALLBACK_ROUTER_STAGING_ORIGIN ?? CAOCAO_CALLBACK_ROUTER_DEFAULT_STAGING_ORIGIN,
    productionOrigin:
      env.CAOCAO_CALLBACK_ROUTER_PRODUCTION_ORIGIN ??
      CAOCAO_CALLBACK_ROUTER_DEFAULT_PRODUCTION_ORIGIN,
  });
}

export function resolveCaocaoCallbackRouterDecision(rawBody: Buffer): CaocaoCallbackRouterDecision {
  const params = new URLSearchParams(rawBody.toString("utf8"));
  const callbackInfoValues = params.getAll("callback_info");

  if (callbackInfoValues.length === 0) {
    return {
      targetEnvironment: "production",
      reason: "missing-callback-info",
    };
  }

  if (callbackInfoValues.length > 1) {
    return {
      targetEnvironment: null,
      reason: "duplicate-callback-info",
    };
  }

  const callbackInfo = callbackInfoValues[0];
  if (callbackInfo.startsWith("pu.rhc.v1.stg.")) {
    return {
      targetEnvironment: "staging",
      reason: "stg-token",
    };
  }

  if (callbackInfo.startsWith("pu.rhc.v1.prod.")) {
    return {
      targetEnvironment: "production",
      reason: "prod-token",
    };
  }

  return {
    targetEnvironment: null,
    reason: "invalid-callback-info",
  };
}

const readRequestBody = async (request: IncomingMessage, maxBodyBytes: number): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let rejected = false;

    request.on("data", (chunk: Buffer | string) => {
      if (rejected) return;

      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;

      if (totalBytes > maxBodyBytes) {
        rejected = true;
        chunks.length = 0;
        request.resume();
        reject(new CaocaoCallbackRouterHttpError(413, "Request body is too large"));
        return;
      }

      chunks.push(buffer);
    });

    request.on("end", () => {
      if (rejected) return;
      resolve(Buffer.concat(chunks, totalBytes));
    });

    request.on("error", (error) => {
      if (rejected) return;
      rejected = true;
      reject(error);
    });
  });

const readHeader = (headers: IncomingHttpHeaders, name: string): string | null => {
  const value = headers[name.toLowerCase()];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(", ");
  return null;
};

const buildForwardHeaders = (headers: IncomingHttpHeaders, bodyLength: number): Headers => {
  const forwarded = new Headers();
  const copyHeaderNames = [
    "content-type",
    "user-agent",
    "x-request-id",
    "x-correlation-id",
    "x-real-ip",
    "x-forwarded-for",
    "x-forwarded-proto",
    "x-forwarded-host",
    "x-forwarded-port",
    "forwarded",
  ];

  for (const name of copyHeaderNames) {
    const value = readHeader(headers, name);
    if (value) forwarded.set(name, value);
  }

  forwarded.set("content-length", String(bodyLength));
  return forwarded;
};

const buildUpstreamUrl = (requestUrl: URL, origin: URL): URL =>
  new URL(`${requestUrl.pathname}${requestUrl.search}`, origin);

const writeJson = (
  response: ServerResponse,
  status: number,
  body: Record<string, string | number | boolean>,
): void => {
  const payload = Buffer.from(JSON.stringify(body));
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(payload.length),
  });
  response.end(payload);
};

const writeUpstreamResponse = async (
  response: ServerResponse,
  upstreamResponse: Response,
): Promise<void> => {
  const payload = Buffer.from(await upstreamResponse.arrayBuffer());
  const headers: Record<string, string> = {
    "content-length": String(payload.length),
  };
  const contentType = upstreamResponse.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  response.writeHead(upstreamResponse.status, headers);
  response.end(payload);
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

const forwardToUpstream = async (input: {
  body: Buffer;
  config: CaocaoCallbackRouterConfig;
  origin: URL;
  request: IncomingMessage;
  requestUrl: URL;
}): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.config.upstreamTimeoutMs);
  timeout.unref();

  try {
    return await fetch(buildUpstreamUrl(input.requestUrl, input.origin), {
      body: input.body,
      headers: buildForwardHeaders(input.request.headers, input.body.length),
      method: "POST",
      redirect: "manual",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const getRequestId = (headers: IncomingHttpHeaders): string | null =>
  readHeader(headers, "x-request-id") ?? readHeader(headers, "x-correlation-id");

const logRequest = (input: {
  config: CaocaoCallbackRouterConfig;
  startedAtMs: number;
  method: string;
  requestUrl: URL;
  requestId: string | null;
  routingReason: CaocaoCallbackRouterLogEvent["routingReason"];
  targetEnvironment: CaocaoCallbackRouterTargetEnvironment | null;
  upstreamStatus: number | null;
  responseStatus: number;
}): void => {
  input.config.logger({
    event: "caocao_callback_router_request",
    method: input.method,
    path: input.requestUrl.pathname,
    requestId: input.requestId,
    routingReason: input.routingReason,
    targetEnvironment: input.targetEnvironment,
    upstreamStatus: input.upstreamStatus,
    responseStatus: input.responseStatus,
    durationMs: Date.now() - input.startedAtMs,
  });
};

export function createCaocaoCallbackRouterHandler(
  configInput: CreateCaocaoCallbackRouterInput = {},
): (request: IncomingMessage, response: ServerResponse) => void {
  const config = createCaocaoCallbackRouterConfig(configInput);

  return (request, response) => {
    const startedAtMs = Date.now();
    const method = request.method ?? "";
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    const requestId = getRequestId(request.headers);

    void (async () => {
      if (requestUrl.pathname !== config.callbackPath) {
        writeJson(response, 404, {
          code: 404,
          success: false,
          message: "Not found",
        });
        logRequest({
          config,
          startedAtMs,
          method,
          requestUrl,
          requestId,
          routingReason: "not-found",
          targetEnvironment: null,
          upstreamStatus: null,
          responseStatus: 404,
        });
        return;
      }

      if (method !== "POST") {
        response.setHeader("allow", "POST");
        writeJson(response, 405, {
          code: 405,
          success: false,
          message: "Method not allowed",
        });
        logRequest({
          config,
          startedAtMs,
          method,
          requestUrl,
          requestId,
          routingReason: "method-not-allowed",
          targetEnvironment: null,
          upstreamStatus: null,
          responseStatus: 405,
        });
        return;
      }

      const rawBody = await readRequestBody(request, config.maxBodyBytes);
      const decision = resolveCaocaoCallbackRouterDecision(rawBody);
      if (!decision.targetEnvironment) {
        writeJson(response, 400, {
          code: 400,
          success: false,
          message: "Invalid callback_info",
        });
        logRequest({
          config,
          startedAtMs,
          method,
          requestUrl,
          requestId,
          routingReason: decision.reason,
          targetEnvironment: null,
          upstreamStatus: null,
          responseStatus: 400,
        });
        return;
      }

      const origin =
        decision.targetEnvironment === "staging" ? config.stagingOrigin : config.productionOrigin;
      const upstreamResponse = await forwardToUpstream({
        body: rawBody,
        config,
        origin,
        request,
        requestUrl,
      });
      await writeUpstreamResponse(response, upstreamResponse);
      logRequest({
        config,
        startedAtMs,
        method,
        requestUrl,
        requestId,
        routingReason: decision.reason,
        targetEnvironment: decision.targetEnvironment,
        upstreamStatus: upstreamResponse.status,
        responseStatus: upstreamResponse.status,
      });
    })().catch((error: unknown) => {
      const responseStatus =
        error instanceof CaocaoCallbackRouterHttpError
          ? error.status
          : isAbortError(error)
            ? 504
            : 502;
      const message =
        error instanceof CaocaoCallbackRouterHttpError
          ? error.message
          : isAbortError(error)
            ? "Upstream request timed out"
            : "Upstream request failed";
      const routingReason =
        error instanceof CaocaoCallbackRouterHttpError && error.status === 413
          ? "body-too-large"
          : isAbortError(error)
            ? "upstream-timeout"
            : "upstream-error";

      if (!response.headersSent) {
        writeJson(response, responseStatus, {
          code: responseStatus,
          success: false,
          message,
        });
      } else {
        response.end();
      }

      logRequest({
        config,
        startedAtMs,
        method,
        requestUrl,
        requestId,
        routingReason,
        targetEnvironment: null,
        upstreamStatus: null,
        responseStatus,
      });
    });
  };
}

export function createCaocaoCallbackRouterServer(
  configInput: CreateCaocaoCallbackRouterInput = {},
): Server {
  return createServer(createCaocaoCallbackRouterHandler(configInput));
}
