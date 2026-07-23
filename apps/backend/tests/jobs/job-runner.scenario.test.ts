import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { jobs } from "../../src/entities/job";
import { createTransactionBoundJobWriter, NO_LATE_TOLERANCE_UNITS } from "../../src/infra/jobs";
import { PostgresJobStore } from "../../src/infra/jobs/postgres-job-store";
import { db } from "../../src/lib/db";
import { scenario } from "../_infra/scenario/scenario";

const JOB_TYPE = "scenario.jobrunner.execution-foundation";
const runAt = new Date("2036-04-12T09:00:00.000Z");

const scheduleConfig = (payload: Record<string, unknown> = {}) => ({
  jobType: JOB_TYPE,
  jobVersion: 1,
  runAt,
  resolutionMs: 60_000,
  earlyToleranceUnits: 0,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
  payload,
});

const loadJob = async (jobId: number) => {
  const rows = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  assert.ok(rows[0], `expected Job ${jobId} to exist`);
  return rows[0];
};

scenario(
  "jobrunner_execution_foundation_preserves_control_history_and_fences_stale_claims",
  async (ctx) => {
    const store = new PostgresJobStore();

    const legacyRows = await db
      .insert(jobs)
      .values({
        jobType: JOB_TYPE,
        payload: { source: "pre-6-1-shape" },
        runAt,
        resolutionMs: 60_000,
        earlyToleranceUnits: 0,
        lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
      })
      .returning();
    const legacyRow = legacyRows[0];
    assert.ok(legacyRow);
    assert.equal(legacyRow.jobVersion, 1);
    assert.equal(legacyRow.creationMode, "ONCE");
    assert.equal(legacyRow.reservationState, null);

    const dedupeKey = `scenario:dedupe:${randomUUID()}`;
    const firstOnce = await store.scheduleOnce({ ...scheduleConfig(), dedupeKey });
    assert.equal(firstOnce.inserted, true);
    assert.ok(firstOnce.jobId);
    const canceled = await store.cancelPendingJobsByDedupe({
      jobType: JOB_TYPE,
      dedupeKey,
    });
    assert.equal(canceled, 1);
    const canceledRow = await loadJob(firstOnce.jobId);
    assert.equal(canceledRow.status, "CANCELED");
    assert.equal(canceledRow.lastReason, "CANCELED_BY_DEDUPE_INVALIDATION");

    const replacementPrefix = `scenario:replace:${randomUUID()}:`;
    const firstReplacement = await store.replacePendingByDedupe({
      ...scheduleConfig({ activityStartAt: "2036-04-12T10:00:00.000Z" }),
      coordinationKey: replacementPrefix,
      activeKeyPrefix: replacementPrefix,
      scheduleKey: `${replacementPrefix}2036-04-12T10:00:00.000Z`,
    });
    assert.equal(firstReplacement.inserted, true);
    assert.equal(firstReplacement.canceled, 0);
    const sameReplacement = await store.replacePendingByDedupe({
      ...scheduleConfig({ activityStartAt: "2036-04-12T10:00:00.000Z" }),
      coordinationKey: replacementPrefix,
      activeKeyPrefix: replacementPrefix,
      scheduleKey: `${replacementPrefix}2036-04-12T10:00:00.000Z`,
    });
    assert.deepEqual(sameReplacement, {
      inserted: false,
      deduped: true,
      jobId: firstReplacement.jobId,
      canceled: 0,
    });

    const changedReplacement = await store.replacePendingByDedupe({
      ...scheduleConfig({ activityStartAt: "2036-04-12T11:00:00.000Z" }),
      coordinationKey: replacementPrefix,
      activeKeyPrefix: replacementPrefix,
      scheduleKey: `${replacementPrefix}2036-04-12T11:00:00.000Z`,
    });
    assert.equal(changedReplacement.inserted, true);
    assert.equal(changedReplacement.canceled, 1);
    assert.ok(firstReplacement.jobId);
    assert.equal((await loadJob(firstReplacement.jobId)).status, "CANCELED");

    const concurrentReplacementPrefix = `scenario:replace-concurrent:${randomUUID()}:`;
    await Promise.all(
      ["12:00", "13:00", "14:00"].map((time) =>
        store.replacePendingByDedupe({
          ...scheduleConfig({ activityStartAt: `2036-04-12T${time}:00.000Z` }),
          coordinationKey: concurrentReplacementPrefix,
          activeKeyPrefix: concurrentReplacementPrefix,
          scheduleKey: `${concurrentReplacementPrefix}${time}`,
        }),
      ),
    );
    const concurrentActiveRows = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        and(
          eq(jobs.jobType, JOB_TYPE),
          inArray(jobs.status, ["PENDING", "RETRY", "RUNNING"]),
          sql`left(${jobs.dedupeKey}, length(${concurrentReplacementPrefix})) = ${concurrentReplacementPrefix}`,
        ),
      );
    assert.equal(concurrentActiveRows.length, 1);

    const cancelRaceCoordinationKey = `scenario:replace-cancel:${randomUUID()}:`;
    const cancelRaceAggregatePrefix = `${cancelRaceCoordinationKey}42:`;
    let releaseReplacement!: () => void;
    let replacementWritten!: () => void;
    const replacementGate = new Promise<void>((resolve) => {
      releaseReplacement = resolve;
    });
    const replacementReady = new Promise<void>((resolve) => {
      replacementWritten = resolve;
    });
    const heldReplacement = db.transaction(async (tx) => {
      const result = await createTransactionBoundJobWriter(tx).replacePendingByDedupe({
        ...scheduleConfig({ activityStartAt: "2036-04-12T15:00:00.000Z" }),
        coordinationKey: cancelRaceCoordinationKey,
        activeKeyPrefix: cancelRaceAggregatePrefix,
        scheduleKey: `${cancelRaceAggregatePrefix}2036-04-12T15:00:00.000Z`,
      });
      replacementWritten();
      await replacementGate;
      return result;
    });
    await replacementReady;
    const recipientCancellation = store.cancelPendingByDedupeSerialized({
      jobType: JOB_TYPE,
      coordinationKey: cancelRaceCoordinationKey,
      activeKeyPrefix: cancelRaceCoordinationKey,
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
    releaseReplacement();
    await Promise.all([heldReplacement, recipientCancellation]);
    const activeAfterRecipientCancellation = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        and(
          eq(jobs.jobType, JOB_TYPE),
          inArray(jobs.status, ["PENDING", "RETRY", "RUNNING"]),
          sql`left(${jobs.dedupeKey}, length(${cancelRaceCoordinationKey})) = ${cancelRaceCoordinationKey}`,
        ),
      );
    assert.equal(activeAfterRecipientCancellation.length, 0);

    const causeKey = `scenario:cause:${randomUUID()}`;
    const firstCause = await store.scheduleOncePerCause({
      ...scheduleConfig(),
      creationKey: causeKey,
    });
    assert.ok(firstCause.jobId);
    await db
      .update(jobs)
      .set({ status: "SUCCEEDED", completedAt: new Date() })
      .where(eq(jobs.id, firstCause.jobId));
    const repeatedCause = await store.scheduleOncePerCause({
      ...scheduleConfig(),
      creationKey: causeKey,
    });
    assert.deepEqual(repeatedCause, {
      inserted: false,
      deduped: true,
      jobId: firstCause.jobId,
    });

    const heldKey = `scenario:held:${randomUUID()}`;
    const heldResults = await Promise.all(
      [3, 9, 5, 7].map((highWaterCursor) =>
        store.scheduleUntilAcknowledged({
          ...scheduleConfig(),
          creationKey: heldKey,
          windowStartCursor: 3,
          highWaterCursor,
        }),
      ),
    );
    const heldJobIds = new Set(heldResults.map((result) => result.jobId));
    assert.equal(heldJobIds.size, 1);
    const heldJobId = heldResults[0]?.jobId;
    assert.ok(heldJobId);
    const heldRow = await loadJob(heldJobId);
    assert.equal(heldRow.creationMode, "UNTIL_ACKNOWLEDGED");
    assert.equal(heldRow.reservationState, "HELD");
    assert.equal(heldRow.highWaterCursor, 9);

    const staleAck = await store.acknowledgeUntilAcknowledged({
      jobType: JOB_TYPE,
      creationKey: heldKey,
      throughCursor: 8,
    });
    assert.deepEqual(staleAck, {
      jobId: heldJobId,
      released: false,
      canceled: false,
      stale: true,
    });

    await db
      .update(jobs)
      .set({ status: "SUCCEEDED", completedAt: new Date() })
      .where(eq(jobs.id, heldJobId));
    const coalescedTerminal = await store.scheduleUntilAcknowledged({
      ...scheduleConfig(),
      creationKey: heldKey,
      windowStartCursor: 3,
      highWaterCursor: 12,
    });
    assert.equal(coalescedTerminal.jobId, heldJobId);
    const terminalHeldRow = await loadJob(heldJobId);
    assert.equal(terminalHeldRow.status, "SUCCEEDED");
    assert.equal(terminalHeldRow.reservationState, "HELD");
    assert.equal(terminalHeldRow.highWaterCursor, 12);

    const coveringAck = await store.acknowledgeUntilAcknowledged({
      jobType: JOB_TYPE,
      creationKey: heldKey,
      throughCursor: 12,
    });
    assert.deepEqual(coveringAck, {
      jobId: heldJobId,
      released: true,
      canceled: false,
      stale: false,
    });
    const releasedRow = await loadJob(heldJobId);
    assert.equal(releasedRow.reservationState, "RELEASED");
    assert.ok(releasedRow.releasedAt);

    const reopened = await store.scheduleUntilAcknowledged({
      ...scheduleConfig(),
      creationKey: heldKey,
      windowStartCursor: 13,
      highWaterCursor: 13,
    });
    assert.ok(reopened.jobId);
    assert.notEqual(reopened.jobId, heldJobId);

    const fenced = await store.scheduleOnce({
      ...scheduleConfig({ purpose: "lease-fencing" }),
      jobVersion: 2,
    });
    assert.ok(fenced.jobId);
    await db
      .update(jobs)
      .set({
        attempts: 2,
        leaseToken: "new-lease-token",
        leaseUntil: new Date(Date.now() + 60_000),
        leasedBy: "new-runner",
        status: "RUNNING",
      })
      .where(eq(jobs.id, fenced.jobId));
    const staleApplied = await store.transitionClaim({
      jobId: fenced.jobId,
      runnerId: "old-runner",
      leaseToken: "old-lease-token",
      status: "SUCCEEDED",
      disposition: "SUCCEEDED",
      reason: "SHOULD_NOT_APPLY",
    });
    assert.equal(staleApplied, false);
    const currentApplied = await store.transitionClaim({
      jobId: fenced.jobId,
      runnerId: "new-runner",
      leaseToken: "new-lease-token",
      status: "SUCCEEDED",
      disposition: "SUCCEEDED",
      reason: "COMPLETED_BY_CURRENT_CLAIM",
    });
    assert.equal(currentApplied, true);
    const fencedRow = await loadJob(fenced.jobId);
    assert.equal(fencedRow.status, "SUCCEEDED");
    assert.equal(fencedRow.jobVersion, 2);
    assert.equal(fencedRow.lastReason, "COMPLETED_BY_CURRENT_CLAIM");
    assert.equal(fencedRow.leaseToken, null);

    const rolledBackKey = `scenario:tx-rollback:${randomUUID()}`;
    await assert.rejects(
      db.transaction(async (tx) => {
        const writer = createTransactionBoundJobWriter(tx);
        await writer.scheduleUntilAcknowledged({
          ...scheduleConfig(),
          creationKey: rolledBackKey,
          windowStartCursor: 1,
          highWaterCursor: 1,
        });
        throw new Error("force owner transaction rollback");
      }),
      /force owner transaction rollback/,
    );
    const rolledBackRows = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.jobType, JOB_TYPE), eq(jobs.creationKey, rolledBackKey)));
    assert.equal(rolledBackRows.length, 0);

    ctx.record("heldJobId", heldJobId);
    ctx.record("reopenedJobId", reopened.jobId);
    ctx.record("fencedJobId", fenced.jobId);
    ctx.record("heldHighWaterCursor", terminalHeldRow.highWaterCursor ?? null);
  },
);
