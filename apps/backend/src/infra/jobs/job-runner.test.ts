import assert from "node:assert/strict";
import { test } from "vitest";
import { z } from "zod";
import { createJobRunner } from "./job-runner";
import type {
  AcknowledgeUntilAcknowledgedConfig,
  AcknowledgeUntilAcknowledgedResult,
  CancelPendingByDedupeSerializedConfig,
  DeletePendingJobsByDedupeConfig,
  ReplacePendingByDedupeConfig,
  ReplacePendingByDedupeResult,
  ScheduleOnceConfig,
  ScheduleOncePerCauseConfig,
  ScheduleOnceResult,
  ScheduleUntilAcknowledgedConfig,
} from "./contracts";
import type {
  ClaimDueBatchInput,
  ClaimDueBatchResult,
  ClaimedJob,
  JobStore,
  TransitionClaimInput,
} from "./job-store";
import {
  NO_LATE_TOLERANCE_UNITS,
  getBucketIndex,
  getBucketStartMs,
  getClaimWindowBounds,
  resolveScheduleTiming,
} from "./schedule-timing";

class FakeJobStore implements JobStore {
  readonly transitions: TransitionClaimInput[] = [];
  readonly claims: ClaimDueBatchResult[];
  transitionResults: boolean[] = [];
  reservationHeld = true;

  constructor(claims: ClaimDueBatchResult[]) {
    this.claims = claims;
  }

  async scheduleOnce(_config: ScheduleOnceConfig): Promise<ScheduleOnceResult> {
    return { inserted: true, deduped: false, jobId: 1 };
  }

  async replacePendingByDedupe(
    _config: ReplacePendingByDedupeConfig,
  ): Promise<ReplacePendingByDedupeResult> {
    return { inserted: true, deduped: false, jobId: 1, canceled: 0 };
  }

  async cancelPendingByDedupeSerialized(
    _config: CancelPendingByDedupeSerializedConfig,
  ): Promise<number> {
    return 1;
  }

  async scheduleOncePerCause(_config: ScheduleOncePerCauseConfig): Promise<ScheduleOnceResult> {
    return { inserted: true, deduped: false, jobId: 1 };
  }

  async scheduleUntilAcknowledged(
    _config: ScheduleUntilAcknowledgedConfig,
  ): Promise<ScheduleOnceResult> {
    return { inserted: true, deduped: false, jobId: 1 };
  }

  async acknowledgeUntilAcknowledged(
    _config: AcknowledgeUntilAcknowledgedConfig,
  ): Promise<AcknowledgeUntilAcknowledgedResult> {
    return { jobId: 1, released: true, canceled: false, stale: false };
  }

  async releaseHeldReservation(): Promise<{
    jobId: number | null;
    released: boolean;
    canceled: boolean;
  }> {
    return { jobId: null, released: false, canceled: false };
  }

  async releaseHeldReservationsByCreationKeyPrefix(): Promise<{
    released: number;
    canceled: number;
    jobIds: number[];
  }> {
    return { released: 0, canceled: 0, jobIds: [] };
  }

  async cancelPendingJobsByDedupe(_config: DeletePendingJobsByDedupeConfig): Promise<number> {
    return 1;
  }

  async claimDueBatch(_input: ClaimDueBatchInput): Promise<ClaimDueBatchResult> {
    return this.claims.shift() ?? { lockSkipped: false, missed: 0, jobs: [] };
  }

  async transitionClaim(input: TransitionClaimInput): Promise<boolean> {
    this.transitions.push(input);
    return this.transitionResults.shift() ?? true;
  }

  async isCreationReservationHeld(): Promise<boolean> {
    return this.reservationHeld;
  }
}

const claimedJob = (overrides: Partial<ClaimedJob> = {}): ClaimedJob => ({
  id: 1,
  jobType: "test.job",
  payload: { value: "ok" },
  jobVersion: 1,
  attempts: 1,
  maxAttempts: 3,
  runAt: new Date("2026-04-12T09:00:00.000Z"),
  windowStartCursor: null,
  leaseToken: "lease-1",
  ...overrides,
});

const singleClaim = (job: ClaimedJob): ClaimDueBatchResult => ({
  lockSkipped: false,
  missed: 0,
  jobs: [job],
});

test("getBucketStartMs aligns timestamps to the current resolution bucket", () => {
  const timestampMs = Date.UTC(2026, 3, 12, 9, 4, 59, 999);
  const resolutionMs = 5 * 60 * 1_000;
  const expectedBucketStartMs = Date.UTC(2026, 3, 12, 9, 0, 0, 0);

  assert.equal(getBucketStartMs(timestampMs, resolutionMs), expectedBucketStartMs);
  assert.equal(getBucketIndex(timestampMs, resolutionMs), expectedBucketStartMs / resolutionMs);
});

test("resolveScheduleTiming returns canonical bucket-based timing fields", () => {
  const resolved = resolveScheduleTiming({
    resolutionMs: 5 * 60 * 1_000,
    earlyToleranceUnits: 3,
    lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
  });

  assert.deepEqual(resolved, {
    resolutionMs: 5 * 60 * 1_000,
    earlyToleranceUnits: 3,
    lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
  });
});

test("resolveScheduleTiming rejects values that exceed integer storage", () => {
  assert.throws(
    () =>
      resolveScheduleTiming({
        resolutionMs: 2_147_483_648,
      }),
    /resolutionMs exceeds integer storage limit/,
  );
});

test("getClaimWindowBounds uses the full due bucket when tolerances are zero", () => {
  const resolutionMs = 5 * 60 * 1_000;
  const dueBucketStartMs = Date.UTC(2026, 3, 12, 9, 0, 0, 0);
  const bounds = getClaimWindowBounds({
    runAt: new Date(Date.UTC(2026, 3, 12, 9, 4, 59, 999)),
    resolutionMs,
    earlyToleranceUnits: 0,
    lateToleranceUnits: 0,
  });

  assert.deepEqual(bounds, {
    dueBucket: dueBucketStartMs / resolutionMs,
    earliestClaimAtMs: dueBucketStartMs,
    latestClaimExclusiveAtMs: dueBucketStartMs + resolutionMs,
  });
});

test("getClaimWindowBounds keeps the late side unbounded when tolerance is infinite", () => {
  const bounds = getClaimWindowBounds({
    runAt: new Date(Date.UTC(2026, 3, 12, 9, 0, 1, 0)),
    resolutionMs: 5 * 60 * 1_000,
    earlyToleranceUnits: 3,
    lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
  });

  assert.equal(bounds.earliestClaimAtMs, Date.UTC(2026, 3, 12, 8, 45, 0, 0));
  assert.equal(bounds.latestClaimExclusiveAtMs, null);
});

test("typed definition records generic success", async () => {
  const store = new FakeJobStore([singleClaim(claimedJob())]);
  const runner = createJobRunner({
    store,
    runnerId: "runner-1",
    now: () => new Date("2026-04-12T09:01:00.000Z"),
  });
  runner.registerDefinition({
    jobType: "test.job",
    version: 1,
    payloadSchema: z.object({ value: z.string() }),
    async execute(payload, context) {
      assert.equal(payload.value, "ok");
      assert.equal(context.leaseToken, "lease-1");
      assert.equal(await context.isCreationReservationHeld(), true);
      return { disposition: "SUCCEEDED", reason: "SENT" };
    },
  });

  const summary = await runner.runDueJobs({ maxBatches: 1 });

  assert.equal(summary.succeeded, 1);
  assert.equal(store.transitions.length, 1);
  assert.deepEqual(store.transitions[0], {
    jobId: 1,
    runnerId: "runner-1",
    leaseToken: "lease-1",
    status: "SUCCEEDED",
    disposition: "SUCCEEDED",
    reason: "SENT",
    retryAt: undefined,
  });
});

test("typed definition receives the immutable creation-window start cursor", async () => {
  const store = new FakeJobStore([singleClaim(claimedJob({ windowStartCursor: 101 }))]);
  const runner = createJobRunner({ store });
  runner.registerDefinition({
    jobType: "test.job",
    version: 1,
    payloadSchema: z.object({ value: z.string() }),
    async execute(_payload, context) {
      assert.equal(context.windowStartCursor, 101);
      return { disposition: "SKIPPED", reason: "WINDOW_PROJECTION_EMPTY" };
    },
  });

  const summary = await runner.runDueJobs({ maxBatches: 1 });

  assert.equal(summary.skipped, 1);
  assert.equal(store.transitions[0]?.reason, "WINDOW_PROJECTION_EMPTY");
});

test("typed disposition matrix preserves retry budget and explicit skip", async () => {
  const retryStore = new FakeJobStore([singleClaim(claimedJob({ attempts: 2, maxAttempts: 3 }))]);
  const retryRunner = createJobRunner({
    store: retryStore,
    now: () => new Date("2026-04-12T09:01:00.000Z"),
  });
  retryRunner.registerDefinition({
    jobType: "test.job",
    version: 1,
    payloadSchema: z.object({ value: z.string() }),
    async execute() {
      return { disposition: "RETRYABLE_FAILURE", reason: "PROVEN_NOT_APPLIED" };
    },
  });
  const retrySummary = await retryRunner.runDueJobs({ maxBatches: 1 });
  assert.equal(retrySummary.retried, 1);
  assert.equal(retryStore.transitions[0]?.status, "RETRY");
  assert.equal(retryStore.transitions[0]?.retryAt?.toISOString(), "2026-04-12T09:02:00.000Z");

  const exhaustedStore = new FakeJobStore([
    singleClaim(claimedJob({ attempts: 3, maxAttempts: 3 })),
  ]);
  const exhaustedRunner = createJobRunner({ store: exhaustedStore });
  exhaustedRunner.registerDefinition({
    jobType: "test.job",
    version: 1,
    payloadSchema: z.object({ value: z.string() }),
    async execute() {
      return { disposition: "RETRYABLE_FAILURE", reason: "PROVEN_NOT_APPLIED" };
    },
  });
  const exhaustedSummary = await exhaustedRunner.runDueJobs({ maxBatches: 1 });
  assert.equal(exhaustedSummary.failed, 1);
  assert.equal(exhaustedStore.transitions[0]?.status, "FAILED");
  assert.equal(exhaustedStore.transitions[0]?.reason, "RETRY_EXHAUSTED");

  const skipStore = new FakeJobStore([singleClaim(claimedJob())]);
  const skipRunner = createJobRunner({ store: skipStore });
  skipRunner.registerDefinition({
    jobType: "test.job",
    version: 1,
    payloadSchema: z.object({ value: z.string() }),
    async execute() {
      return { disposition: "SKIPPED", reason: "NO_LONGER_ELIGIBLE" };
    },
  });
  const skipSummary = await skipRunner.runDueJobs({ maxBatches: 1 });
  assert.equal(skipSummary.skipped, 1);
  assert.equal(skipStore.transitions[0]?.status, "SKIPPED");
});

test("registered definitions select the durable Job version rather than replacing it", async () => {
  const store = new FakeJobStore([
    {
      lockSkipped: false,
      missed: 0,
      jobs: [claimedJob({ jobVersion: 1 }), claimedJob({ id: 2, jobVersion: 2 })],
    },
  ]);
  const runner = createJobRunner({ store });
  runner.registerDefinition({
    jobType: "test.job",
    version: 1,
    payloadSchema: z.object({ value: z.string() }),
    async execute() {
      return { disposition: "SUCCEEDED", reason: "VERSION_1" };
    },
  });
  runner.registerDefinition({
    jobType: "test.job",
    version: 2,
    payloadSchema: z.object({ value: z.string() }),
    async execute() {
      return { disposition: "SUCCEEDED", reason: "VERSION_2" };
    },
  });

  const summary = await runner.runDueJobs({ maxBatches: 1 });

  assert.equal(summary.succeeded, 2);
  assert.deepEqual(
    store.transitions.map((transition) => transition.reason),
    ["VERSION_1", "VERSION_2"],
  );
});

test("unknown, invalid-version, invalid-payload and malformed-result Jobs fail without retry", async () => {
  const unknownStore = new FakeJobStore([singleClaim(claimedJob({ jobType: "unknown" }))]);
  const unknownRunner = createJobRunner({ store: unknownStore });
  const unknownSummary = await unknownRunner.runDueJobs({ maxBatches: 1 });
  assert.equal(unknownSummary.failed, 1);
  assert.equal(unknownStore.transitions[0]?.reason, "NO_HANDLER");

  const versionStore = new FakeJobStore([singleClaim(claimedJob({ jobVersion: 2 }))]);
  const versionRunner = createJobRunner({ store: versionStore });
  versionRunner.registerDefinition({
    jobType: "test.job",
    version: 1,
    payloadSchema: z.object({ value: z.string() }),
    async execute() {
      return { disposition: "SUCCEEDED" };
    },
  });
  await versionRunner.runDueJobs({ maxBatches: 1 });
  assert.equal(versionStore.transitions[0]?.reason, "UNSUPPORTED_JOB_VERSION");

  const payloadStore = new FakeJobStore([singleClaim(claimedJob({ payload: {} }))]);
  const payloadRunner = createJobRunner({ store: payloadStore });
  payloadRunner.registerDefinition({
    jobType: "test.job",
    version: 1,
    payloadSchema: z.object({ value: z.string() }),
    async execute() {
      return { disposition: "SUCCEEDED" };
    },
  });
  await payloadRunner.runDueJobs({ maxBatches: 1 });
  assert.equal(payloadStore.transitions[0]?.reason, "INVALID_PAYLOAD");

  const malformedStore = new FakeJobStore([singleClaim(claimedJob())]);
  const malformedRunner = createJobRunner({ store: malformedStore });
  malformedRunner.registerDefinition({
    jobType: "test.job",
    version: 1,
    payloadSchema: z.object({ value: z.string() }),
    async execute() {
      return undefined as never;
    },
  });
  const malformedSummary = await malformedRunner.runDueJobs({ maxBatches: 1 });
  assert.equal(malformedSummary.failed, 1);
  assert.equal(malformedStore.transitions[0]?.reason, "INVALID_HANDLER_RESULT");
});

test("typed definition throw and stale completion preserve state", async () => {
  const throwStore = new FakeJobStore([singleClaim(claimedJob())]);
  const throwRunner = createJobRunner({ store: throwStore });
  throwRunner.registerDefinition({
    jobType: "test.job",
    version: 1,
    payloadSchema: z.object({ value: z.string() }),
    async execute() {
      throw new Error("provider failed");
    },
  });
  await throwRunner.runDueJobs({ maxBatches: 1 });
  assert.equal(throwStore.transitions[0]?.status, "RETRY");
  assert.equal(throwStore.transitions[0]?.reason, "HANDLER_THROWN");

  const staleStore = new FakeJobStore([singleClaim(claimedJob())]);
  staleStore.transitionResults = [false];
  const staleRunner = createJobRunner({ store: staleStore });
  staleRunner.registerDefinition({
    jobType: "test.job",
    version: 1,
    payloadSchema: z.object({ value: z.string() }),
    async execute() {
      return { disposition: "SUCCEEDED" };
    },
  });
  const staleSummary = await staleRunner.runDueJobs({ maxBatches: 1 });
  assert.equal(staleSummary.staleCompletions, 1);
  assert.equal(staleSummary.succeeded, 0);
  assert.equal(staleStore.transitions.length, 1);
});
