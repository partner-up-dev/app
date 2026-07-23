import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { test } from "vitest";
import { jobs } from "../../src/entities/job";
import { PostgresJobStore } from "../../src/infra/jobs/postgres-job-store";
import { NO_LATE_TOLERANCE_UNITS } from "../../src/infra/jobs/schedule-timing";
import { db } from "../../src/lib/db";

const jobType = `scenario.reservation-release.${randomUUID()}`;
const runAt = new Date("2036-04-12T09:00:00.000Z");

const schedule = (creationKey: string) =>
  new PostgresJobStore().scheduleUntilAcknowledged({
    jobType,
    creationKey,
    windowStartCursor: 1,
    highWaterCursor: 1,
    runAt,
    resolutionMs: 60_000,
    earlyToleranceUnits: 0,
    lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
  });

const load = async (jobId: number) => {
  const rows = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  assert.ok(rows[0]);
  return rows[0];
};

test("held reservation release cancels only pending/retry execution", async () => {
  const store = new PostgresJobStore();
  const pendingKey = `${jobType}:pending:${randomUUID()}`;
  const pending = await schedule(pendingKey);
  assert.ok(pending.jobId);

  const pendingResult = await store.releaseHeldReservation({
    jobType,
    creationKey: pendingKey,
  });
  assert.deepEqual(pendingResult, { jobId: pending.jobId, released: true, canceled: true });
  const pendingRow = await load(pending.jobId);
  assert.equal(pendingRow.status, "CANCELED");
  assert.equal(pendingRow.reservationState, "RELEASED");

  const retryKey = `${jobType}:retry:${randomUUID()}`;
  const retry = await schedule(retryKey);
  assert.ok(retry.jobId);
  await db.update(jobs).set({ status: "RETRY" }).where(eq(jobs.id, retry.jobId));
  const retryResult = await store.releaseHeldReservation({ jobType, creationKey: retryKey });
  assert.deepEqual(retryResult, { jobId: retry.jobId, released: true, canceled: true });
  assert.equal((await load(retry.jobId)).status, "CANCELED");

  const runningKey = `${jobType}:running:${randomUUID()}`;
  const running = await schedule(runningKey);
  assert.ok(running.jobId);
  await db.update(jobs).set({ status: "RUNNING" }).where(eq(jobs.id, running.jobId));
  const runningResult = await store.releaseHeldReservation({ jobType, creationKey: runningKey });
  assert.deepEqual(runningResult, { jobId: running.jobId, released: true, canceled: false });
  assert.equal((await load(running.jobId)).status, "RUNNING");

  const terminalKey = `${jobType}:terminal:${randomUUID()}`;
  const terminal = await schedule(terminalKey);
  assert.ok(terminal.jobId);
  await db
    .update(jobs)
    .set({ status: "SUCCEEDED", completedAt: new Date() })
    .where(eq(jobs.id, terminal.jobId));
  const terminalResult = await store.releaseHeldReservation({ jobType, creationKey: terminalKey });
  assert.deepEqual(terminalResult, { jobId: terminal.jobId, released: true, canceled: false });
  assert.equal((await load(terminal.jobId)).status, "SUCCEEDED");

  const noHeld = await store.releaseHeldReservation({ jobType, creationKey: terminalKey });
  assert.deepEqual(noHeld, { jobId: null, released: false, canceled: false });

  const reopened = await schedule(terminalKey);
  assert.ok(reopened.jobId);
  assert.notEqual(reopened.jobId, terminal.jobId);
});

test("prefix release enumerates keys in stable order and reuses exact-key locks", async () => {
  const store = new PostgresJobStore();
  const prefix = `${jobType}:prefix:${randomUUID()}:`;
  const firstKey = `${prefix}b`;
  const secondKey = `${prefix}a`;
  const thirdKey = `${prefix}c`;
  const first = await schedule(firstKey);
  const second = await schedule(secondKey);
  const third = await schedule(thirdKey);
  assert.ok(first.jobId && second.jobId && third.jobId);
  await db.update(jobs).set({ status: "RETRY" }).where(eq(jobs.id, first.jobId));
  await db.update(jobs).set({ status: "RUNNING" }).where(eq(jobs.id, second.jobId));
  await db
    .update(jobs)
    .set({ status: "SUCCEEDED", completedAt: new Date() })
    .where(and(eq(jobs.id, third.jobId), eq(jobs.reservationState, "HELD")));

  const result = await store.releaseHeldReservationsByCreationKeyPrefix({
    jobType,
    creationKeyPrefix: prefix,
  });
  assert.deepEqual(result, {
    released: 3,
    canceled: 1,
    jobIds: [second.jobId, first.jobId, third.jobId],
  });
  assert.equal((await load(first.jobId)).reservationState, "RELEASED");
  assert.equal((await load(second.jobId)).reservationState, "RELEASED");
  assert.equal((await load(third.jobId)).reservationState, "RELEASED");
});
