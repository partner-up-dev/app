import type { Context, MiddlewareHandler } from "hono";

export const JOURNEY_ID_HEADER = "x-journey-id";

export type RequestJourneyContext = {
  journeyId: string | null;
  rawJourneyId: string | null;
  valid: boolean;
};

declare module "hono" {
  interface ContextVariableMap {
    journeyContext: RequestJourneyContext;
  }
}

const uuidSchema = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const parseJourneyIdHeader = (
  rawJourneyId: string | null | undefined,
): RequestJourneyContext => {
  const normalized = rawJourneyId?.trim() ?? null;
  if (!normalized) {
    return {
      journeyId: null,
      rawJourneyId: null,
      valid: false,
    };
  }

  const valid = uuidSchema.test(normalized);
  return {
    journeyId: valid ? normalized : null,
    rawJourneyId: normalized,
    valid,
  };
};

export const journeyContextMiddleware: MiddlewareHandler = async (c, next) => {
  c.set("journeyContext", parseJourneyIdHeader(c.req.header(JOURNEY_ID_HEADER)));
  await next();
};

export const getRequestJourneyContext = (c: Context): RequestJourneyContext =>
  c.get("journeyContext") ?? {
    journeyId: null,
    rawJourneyId: null,
    valid: false,
  };
