import { randomUUID } from "node:crypto";
import type { Context } from "hono";
import { getRequestJourneyContext } from "./request-journey-context";
import { ingestUserTelemetryEvents } from "./user-ingest.service";
import type { UserTelemetryAttributes, UserTelemetryPayload } from "./user-event-registry";

export type RequestUserTelemetryEventInput = {
  eventName: string;
  occurredAt?: Date;
  traceId?: string | null;
  attributes?: UserTelemetryAttributes;
  payload?: UserTelemetryPayload;
};

const readTraceId = (c: Context): string | null => {
  const explicitTraceId = c.req.header("x-trace-id")?.trim();
  if (explicitTraceId) return explicitTraceId.slice(0, 128);

  const traceparent = c.req.header("traceparent")?.trim();
  if (traceparent) return traceparent.slice(0, 128);

  return null;
};

export const recordUserTelemetryEventForRequest = async (
  c: Context,
  input: RequestUserTelemetryEventInput,
): Promise<boolean> => {
  const { journeyId } = getRequestJourneyContext(c);
  if (!journeyId) return false;

  const occurredAt = input.occurredAt ?? new Date();
  await ingestUserTelemetryEvents([
    {
      event_id: randomUUID(),
      event_name: input.eventName,
      event_version: 1,
      journey_id: journeyId,
      occurred_at: occurredAt.toISOString(),
      trace_id: input.traceId ?? readTraceId(c),
      attributes: input.attributes ?? {},
      payload: input.payload ?? {},
    },
  ]);

  return true;
};
