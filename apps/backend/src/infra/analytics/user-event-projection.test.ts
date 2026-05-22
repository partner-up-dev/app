import assert from "node:assert/strict";
import { test, vi } from "vitest";
import {
  normalizeUserTelemetryEnrichedEventRow,
  type UserTelemetryEnrichedEventQueryRow,
} from "./user-event-projection";

vi.mock("../../lib/db", () => ({
  db: {
    execute: async () => [],
  },
}));

const buildQueryRow = (
  overrides: Partial<UserTelemetryEnrichedEventQueryRow> = {},
): UserTelemetryEnrichedEventQueryRow => ({
  event_id: "00000000-0000-4000-8000-000000000001",
  event_name: "page.viewed",
  event_version: 1,
  event_family: "page.lifecycle",
  event_owner: "test",
  bi_usage: ["retention"],
  journey_id: "00000000-0000-4000-8000-000000000002",
  trace_id: null,
  attributes: {},
  payload: {},
  occurred_at: "2026-05-01T04:00:00.000Z",
  route_path: "/",
  route_name: null,
  spm: null,
  source_qr: null,
  anonymous_id: "anonymous",
  authenticated_user_hash: null,
  route_context_status: "context_complete",
  auth_context_status: "context_complete",
  ...overrides,
});

test("normalizeUserTelemetryEnrichedEventRow keeps Date occurred_at values usable by BI models", () => {
  const occurredAt = new Date("2026-05-01T04:00:00.000Z");
  const row = normalizeUserTelemetryEnrichedEventRow(
    buildQueryRow({ occurred_at: occurredAt }),
  );

  assert.equal(row.occurredAt, occurredAt);
  assert.equal(row.occurredAt.getTime(), occurredAt.getTime());
});

test("normalizeUserTelemetryEnrichedEventRow parses ISO occurred_at strings into Date values", () => {
  const row = normalizeUserTelemetryEnrichedEventRow(
    buildQueryRow({ occurred_at: "2026-05-01T04:00:00.000Z" }),
  );

  assert.equal(row.occurredAt.toISOString(), "2026-05-01T04:00:00.000Z");
});

test("normalizeUserTelemetryEnrichedEventRow parses postgres timestamp strings as UTC", () => {
  const row = normalizeUserTelemetryEnrichedEventRow(
    buildQueryRow({ occurred_at: "2026-05-01 04:00:00.123456" }),
  );

  assert.equal(row.occurredAt.toISOString(), "2026-05-01T04:00:00.123Z");
});

test("normalizeUserTelemetryEnrichedEventRow rejects invalid occurred_at values at the query boundary", () => {
  assert.throws(
    () =>
      normalizeUserTelemetryEnrichedEventRow(
        buildQueryRow({ occurred_at: "not-a-date" }),
      ),
    /Invalid occurred_at returned from user telemetry projection/,
  );
});
