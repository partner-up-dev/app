import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const userTelemetryEvents = pgTable(
  "user_telemetry_events",
  {
    eventId: uuid("event_id").primaryKey(),
    eventName: text("event_name").notNull(),
    eventVersion: integer("event_version").notNull(),
    eventFamily: text("event_family").notNull(),
    journeyId: uuid("journey_id").notNull(),
    traceId: text("trace_id"),
    attributes: jsonb("attributes")
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventNameOccurredAtIdx: index("user_telemetry_events_name_occurred_at_idx").on(
      table.eventName,
      table.occurredAt,
    ),
    eventFamilyOccurredAtIdx: index("user_telemetry_events_family_occurred_at_idx").on(
      table.eventFamily,
      table.occurredAt,
    ),
    journeyOccurredAtIdx: index("user_telemetry_events_journey_occurred_at_idx").on(
      table.journeyId,
      table.occurredAt,
    ),
    traceIdIdx: index("user_telemetry_events_trace_id_idx").on(table.traceId),
    receivedAtIdx: index("user_telemetry_events_received_at_idx").on(table.receivedAt),
  }),
);

export const userTelemetryRejectedEvents = pgTable(
  "user_telemetry_rejected_events",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventId: text("event_id"),
    eventName: text("event_name"),
    eventVersion: integer("event_version"),
    journeyId: text("journey_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    failureCode: text("failure_code").notNull(),
    failureMessage: text("failure_message").notNull(),
    rawEvent: jsonb("raw_event").$type<Record<string, unknown>>().notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventNameReceivedAtIdx: index("user_telemetry_rejected_events_name_received_at_idx").on(
      table.eventName,
      table.receivedAt,
    ),
    failureCodeReceivedAtIdx: index("user_telemetry_rejected_events_failure_received_at_idx").on(
      table.failureCode,
      table.receivedAt,
    ),
  }),
);

export const insertUserTelemetryEventSchema = createInsertSchema(userTelemetryEvents);
export const selectUserTelemetryEventSchema = createSelectSchema(userTelemetryEvents);
export const insertUserTelemetryRejectedEventSchema = createInsertSchema(
  userTelemetryRejectedEvents,
);
export const selectUserTelemetryRejectedEventSchema = createSelectSchema(
  userTelemetryRejectedEvents,
);

export type UserTelemetryEvent = typeof userTelemetryEvents.$inferSelect;
export type NewUserTelemetryEvent = typeof userTelemetryEvents.$inferInsert;
export type UserTelemetryRejectedEvent = typeof userTelemetryRejectedEvents.$inferSelect;
export type NewUserTelemetryRejectedEvent = typeof userTelemetryRejectedEvents.$inferInsert;
