import { db } from "../../lib/db";
import { userTelemetryEvents, userTelemetryRejectedEvents } from "../../entities/user-telemetry";
import type { UserTelemetryAttributes, UserTelemetryPayload } from "./contracts";
import { validateRegisteredUserTelemetryEvent } from "./user-event-registry";

export type RawUserTelemetryEventInput = {
  event_id: string;
  event_name: string;
  event_version: number;
  journey_id: string;
  occurred_at: string;
  trace_id?: string | null;
  event_family?: string | null;
  attributes?: UserTelemetryAttributes;
  payload?: UserTelemetryPayload;
};

export type UserTelemetryIngestResult = {
  total: number;
  accepted: number;
  rejected: number;
  idempotent: number;
};

type AcceptedUserTelemetryEvent = {
  eventId: string;
  eventName: string;
  eventVersion: number;
  eventFamily: string;
  journeyId: string;
  occurredAt: Date;
  traceId: string | null;
  attributes: UserTelemetryAttributes;
  payload: UserTelemetryPayload;
};

type RejectedUserTelemetryEvent = {
  eventId: string | null;
  eventName: string | null;
  eventVersion: number | null;
  journeyId: string | null;
  occurredAt: Date | null;
  failureCode: string;
  failureMessage: string;
  rawEvent: Record<string, unknown>;
};

const parseDate = (value: string): Date => new Date(value);

const parseOptionalDate = (value: string): Date | null => {
  const parsed = parseDate(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeRawEvent = (event: RawUserTelemetryEventInput): Record<string, unknown> => ({
  event_id: event.event_id,
  event_name: event.event_name,
  event_version: event.event_version,
  journey_id: event.journey_id,
  occurred_at: event.occurred_at,
  trace_id: event.trace_id ?? null,
  event_family: event.event_family ?? null,
  attributes: event.attributes ?? {},
  payload: event.payload ?? {},
});

export async function ingestUserTelemetryEvents(
  events: RawUserTelemetryEventInput[],
): Promise<UserTelemetryIngestResult> {
  if (events.length === 0) {
    return { total: 0, accepted: 0, rejected: 0, idempotent: 0 };
  }

  return await db.transaction(async (tx) => {
    const acceptedEvents: AcceptedUserTelemetryEvent[] = [];
    const rejectedEvents: RejectedUserTelemetryEvent[] = [];

    for (const event of events) {
      const validation = validateRegisteredUserTelemetryEvent({
        eventName: event.event_name,
        eventVersion: event.event_version,
        eventFamily: event.event_family,
        attributes: event.attributes,
        payload: event.payload,
      });

      if (!validation.ok) {
        rejectedEvents.push({
          eventId: event.event_id,
          eventName: event.event_name,
          eventVersion: event.event_version,
          journeyId: event.journey_id,
          occurredAt: parseOptionalDate(event.occurred_at),
          failureCode: validation.failureCode,
          failureMessage: validation.failureMessage,
          rawEvent: normalizeRawEvent(event),
        });
        continue;
      }

      acceptedEvents.push({
        eventId: event.event_id,
        eventName: event.event_name,
        eventVersion: event.event_version,
        eventFamily: validation.contract.eventFamily,
        journeyId: event.journey_id,
        occurredAt: parseDate(event.occurred_at),
        traceId: event.trace_id ?? null,
        attributes: validation.attributes,
        payload: validation.payload,
      });
    }

    if (rejectedEvents.length > 0) {
      await tx.insert(userTelemetryRejectedEvents).values(rejectedEvents);
    }

    if (acceptedEvents.length === 0) {
      return {
        total: events.length,
        accepted: 0,
        rejected: rejectedEvents.length,
        idempotent: 0,
      };
    }

    const insertedEvents = await tx
      .insert(userTelemetryEvents)
      .values(
        acceptedEvents.map((event) => ({
          eventId: event.eventId,
          eventName: event.eventName,
          eventVersion: event.eventVersion,
          eventFamily: event.eventFamily,
          journeyId: event.journeyId,
          traceId: event.traceId,
          attributes: event.attributes,
          payload: event.payload,
          occurredAt: event.occurredAt,
        })),
      )
      .onConflictDoNothing()
      .returning({ eventId: userTelemetryEvents.eventId });

    const accepted = insertedEvents.length;
    const idempotent = acceptedEvents.length - accepted;
    return {
      total: events.length,
      accepted,
      rejected: rejectedEvents.length,
      idempotent,
    };
  });
}
