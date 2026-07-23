import { randomUUID } from "node:crypto";
import type { Context } from "hono";
import { getRequestJourneyContext } from "./request-journey-context";
import { ingestUserTelemetryEvents } from "./user-ingest.service";
import {
  resolveActiveUserTelemetryEventContract,
  type ActiveUserTelemetryEvent,
} from "./user-event-registry";

export type RequestUserTelemetryEventInput = {
  [TEvent in ActiveUserTelemetryEvent as TEvent["eventName"]]: {
    eventName: TEvent["eventName"];
    occurredAt?: Date;
    traceId?: string | null;
    attributes?: TEvent["attributes"];
    payload?: TEvent["payload"];
  };
}[ActiveUserTelemetryEvent["eventName"]];

export type RequestUserTelemetryOutcome =
  | { outcome: "missing_journey" }
  | { outcome: "accepted"; eventName: string; eventVersion: number }
  | { outcome: "rejected"; eventName: string; reason: "unregistered_event" | "validation_failed" }
  | { outcome: "idempotent"; eventName: string; eventVersion: number }
  | { outcome: "unavailable"; reason: "telemetry_failure" };

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
): Promise<RequestUserTelemetryOutcome> => {
  const { journeyId } = getRequestJourneyContext(c);
  if (!journeyId) return { outcome: "missing_journey" };

  try {
    const contract = resolveActiveUserTelemetryEventContract(input.eventName);
    if (!contract) {
      return {
        outcome: "rejected",
        eventName: input.eventName,
        reason: "unregistered_event",
      };
    }

    const occurredAt = input.occurredAt ?? new Date();
    const result = await ingestUserTelemetryEvents([
      {
        event_id: randomUUID(),
        event_name: input.eventName,
        event_version: contract.eventVersion,
        journey_id: journeyId,
        occurred_at: occurredAt.toISOString(),
        trace_id: input.traceId ?? readTraceId(c),
        attributes: input.attributes ?? {},
        payload: input.payload ?? {},
      },
    ]);

    if (result.accepted === 1) {
      return {
        outcome: "accepted",
        eventName: input.eventName,
        eventVersion: contract.eventVersion,
      };
    }
    if (result.idempotent === 1) {
      return {
        outcome: "idempotent",
        eventName: input.eventName,
        eventVersion: contract.eventVersion,
      };
    }
    if (result.rejected === 1) {
      return {
        outcome: "rejected",
        eventName: input.eventName,
        reason: "validation_failed",
      };
    }
  } catch {
    return { outcome: "unavailable", reason: "telemetry_failure" };
  }

  return { outcome: "unavailable", reason: "telemetry_failure" };
};
