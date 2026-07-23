import assert from "node:assert/strict";
import { jobs } from "../../src/entities/job";
import { db } from "../../src/lib/db";
import { env } from "../../src/lib/env";
import { scenario } from "../_infra/scenario/scenario";
import { readJsonResponse, requestJson } from "../_infra/http/backend-app";

type DiagnosticsBody = {
  runner?: { registeredJobTypes?: unknown[]; lastError?: unknown };
  database?: {
    activeCount?: number;
    pendingCount?: number;
    retryCount?: number;
    runningCount?: number;
    dueCount?: number;
    expiredLeaseCount?: number;
    failedCount?: number;
    retryExhaustedCount?: number;
    missedCount?: number;
    heldReservationCount?: number;
  };
};

scenario("maintenance_diagnostics_are_bounded_and_exclude_job_payloads", async (ctx) => {
  const internalToken = env.JOB_RUNNER_INTERNAL_TOKEN;
  assert.ok(internalToken, "scenario requires JOB_RUNNER_INTERNAL_TOKEN");
  const readDiagnostics = async (): Promise<DiagnosticsBody> => {
    const response = await requestJson("/internal/maintenance/diagnostics", {
      headers: { "x-internal-token": internalToken },
    });
    assert.equal(response.status, 200);
    return readJsonResponse<DiagnosticsBody>(response);
  };
  const baseline = await readDiagnostics();
  const now = new Date();
  const dueAt = new Date(now.getTime() - 60_000);
  const expiredLeaseAt = new Date(now.getTime() - 30_000);
  const secretPayload = "diagnostic-payload-must-not-leak";

  await db.insert(jobs).values([
    {
      jobType: "scenario.maintenance.pending",
      payload: { secretPayload },
      runAt: dueAt,
      resolutionMs: 60_000,
      earlyToleranceUnits: 0,
      lateToleranceUnits: 0,
      status: "PENDING",
    },
    {
      jobType: "scenario.maintenance.retry",
      payload: { secretPayload },
      runAt: dueAt,
      resolutionMs: 60_000,
      earlyToleranceUnits: 0,
      lateToleranceUnits: 0,
      status: "RETRY",
    },
    {
      jobType: "scenario.maintenance.running",
      payload: { secretPayload },
      runAt: dueAt,
      resolutionMs: 60_000,
      earlyToleranceUnits: 0,
      lateToleranceUnits: 0,
      status: "RUNNING",
      leaseUntil: expiredLeaseAt,
    },
    {
      jobType: "scenario.maintenance.failed",
      payload: { secretPayload },
      runAt: dueAt,
      resolutionMs: 60_000,
      earlyToleranceUnits: 0,
      lateToleranceUnits: 0,
      status: "FAILED",
      lastReason: "RETRY_EXHAUSTED",
    },
    {
      jobType: "scenario.maintenance.missed",
      payload: { secretPayload },
      runAt: dueAt,
      resolutionMs: 60_000,
      earlyToleranceUnits: 0,
      lateToleranceUnits: 0,
      status: "MISSED",
    },
    {
      jobType: "scenario.maintenance.held",
      payload: { secretPayload },
      runAt: dueAt,
      resolutionMs: 60_000,
      earlyToleranceUnits: 0,
      lateToleranceUnits: 0,
      status: "PENDING",
      creationMode: "UNTIL_ACKNOWLEDGED",
      creationKey: "scenario.maintenance.held.key",
      reservationState: "HELD",
      windowStartCursor: 0,
      highWaterCursor: 0,
    },
  ]);

  const body = await readDiagnostics();
  const expectedDelta: Record<string, number> = {
    activeCount: 4,
    pendingCount: 2,
    retryCount: 1,
    runningCount: 1,
    dueCount: 3,
    expiredLeaseCount: 1,
    failedCount: 1,
    retryExhaustedCount: 1,
    missedCount: 1,
    heldReservationCount: 1,
  };
  for (const [key, delta] of Object.entries(expectedDelta)) {
    const before = baseline.database?.[key as keyof NonNullable<DiagnosticsBody["database"]>];
    const after = body.database?.[key as keyof NonNullable<DiagnosticsBody["database"]>];
    assert.equal(after, Number(before ?? 0) + delta, `${key} delta`);
  }
  assert.equal(body.runner?.lastError, undefined);
  assert.ok(Array.isArray(body.runner?.registeredJobTypes));
  assert.doesNotMatch(JSON.stringify(body), new RegExp(secretPayload));
  ctx.record("diagnostics_counts", body.database ?? null);
});
