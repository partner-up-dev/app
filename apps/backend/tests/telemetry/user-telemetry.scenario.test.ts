import assert from "node:assert/strict";
import postgres from "postgres";
import { and, eq } from "drizzle-orm";
import {
  partnerRequests,
  userTelemetryEvents,
  userTelemetryRejectedEvents,
} from "../../src/entities";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import { scenario } from "../_infra/scenario/scenario";
import { givenUser } from "../pr/_kit/builders/users";

const journeyId = "8e1a5720-cb91-4bb0-ae03-3c490f0a69a0";
const occurredAt = "2030-02-01T10:00:00.000Z";

scenario("user_telemetry_ingest_reports_accepted_idempotent_and_rejected", async (ctx) => {
  const user = await givenUser("telemetry-ingest");
  const eventId = "5a2f87a6-79d7-49db-bf38-70f4ca5ca2b5";
  const event = {
    event_id: eventId,
    event_name: "page.viewed",
    event_version: 1,
    journey_id: journeyId,
    occurred_at: occurredAt,
    payload: { page: "/telemetry-test" },
  };

  const accepted = await requestJson("/api/telemetry/user/events", {
    method: "POST",
    token: user.token,
    body: { events: [event] },
  });
  assert.deepEqual(await expectJsonResponse(accepted, 200), {
    total: 1,
    accepted: 1,
    rejected: 0,
    idempotent: 0,
  });

  const duplicate = await requestJson("/api/telemetry/user/events", {
    method: "POST",
    token: user.token,
    body: { events: [event] },
  });
  assert.deepEqual(await expectJsonResponse(duplicate, 200), {
    total: 1,
    accepted: 0,
    rejected: 0,
    idempotent: 1,
  });

  const rejected = await requestJson("/api/telemetry/user/events", {
    method: "POST",
    token: user.token,
    body: {
      events: [
        {
          ...event,
          event_id: "c6d38ef0-19d8-4e17-84fd-1f9c7854cc0d",
          event_name: "not.registered",
        },
      ],
    },
  });
  assert.deepEqual(await expectJsonResponse(rejected, 200), {
    total: 1,
    accepted: 0,
    rejected: 1,
    idempotent: 0,
  });

  const [stored] = await getTestDb()
    .select({ eventId: userTelemetryEvents.eventId })
    .from(userTelemetryEvents)
    .where(eq(userTelemetryEvents.eventId, eventId));
  assert.equal(stored?.eventId, eventId);
  const rejectedRows = await getTestDb()
    .select({ eventId: userTelemetryRejectedEvents.eventId })
    .from(userTelemetryRejectedEvents)
    .where(
      and(
        eq(userTelemetryRejectedEvents.eventId, "c6d38ef0-19d8-4e17-84fd-1f9c7854cc0d"),
        eq(userTelemetryRejectedEvents.failureCode, "UNREGISTERED_EVENT"),
      ),
    );
  assert.equal(rejectedRows.length, 1);
  ctx.record("conservation", { total: 3, accepted: 1, rejected: 1, idempotent: 1 });
});

scenario("pr_create_succeeds_when_telemetry_insert_trigger_fails", async (ctx) => {
  const user = await givenUser("telemetry-trigger");
  const sql = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
  const triggerName = "scenario_fail_user_telemetry_insert";
  try {
    await sql.unsafe(`
      create or replace function scenario_fail_user_telemetry_insert()
      returns trigger language plpgsql as $$
      begin
        raise exception 'scenario telemetry failure';
      end;
      $$;
      drop trigger if exists ${triggerName} on user_telemetry_events;
      create trigger ${triggerName}
      before insert on user_telemetry_events
      for each row execute function scenario_fail_user_telemetry_insert();
    `);

    const response = await requestJson("/api/pr/new/form", {
      method: "POST",
      token: user.token,
      headers: { "x-journey-id": journeyId },
      body: {
        fields: {
          title: "Telemetry failure isolation",
          type: "badminton",
          time: ["2031-02-01T10:00:00.000Z", "2031-02-01T12:00:00.000Z"],
          location: "Scenario telemetry court",
          route: null,
          minPartners: 1,
          maxPartners: 2,
          partners: [],
          budget: null,
          preferences: [],
          notes: null,
          meetingPoint: null,
        },
        createSource: "STRUCTURED_FORM",
      },
    });
    const body = await expectJsonResponse<{ id: number }>(response, 201);
    const rows = await getTestDb()
      .select({ id: userTelemetryEvents.eventId })
      .from(userTelemetryEvents)
      .where(
        and(
          eq(userTelemetryEvents.journeyId, journeyId),
          eq(userTelemetryEvents.eventName, "pr.created"),
        ),
      );
    assert.equal(rows.length, 0);
    const createdRows = await getTestDb()
      .select({ id: partnerRequests.id, createdBy: partnerRequests.createdBy })
      .from(partnerRequests)
      .where(and(eq(partnerRequests.id, body.id), eq(partnerRequests.createdBy, user.user.id)));
    assert.equal(createdRows.length, 1);
    ctx.record("createdPrId", body.id);
  } finally {
    await sql.unsafe(`
      drop trigger if exists ${triggerName} on user_telemetry_events;
      drop function if exists scenario_fail_user_telemetry_insert();
    `);
    await sql.end({ timeout: 5 });
  }
});
