import { sql } from "drizzle-orm";
import type { NewJobRow } from "../../entities/job";
import { JobRepository } from "../../repositories/JobRepository";
import type { TransactionExecutor } from "../../repositories/_executor";
import { db } from "../../lib/db";
import { applyLocalStatementTimeout } from "../../lib/pg-timeouts";
import type {
  AcknowledgeUntilAcknowledgedConfig,
  AcknowledgeUntilAcknowledgedResult,
  CancelPendingByDedupeSerializedConfig,
  DeletePendingJobsByDedupeConfig,
  ReplacePendingByDedupeConfig,
  ReplacePendingByDedupeResult,
  ReleaseHeldReservationConfig,
  ReleaseHeldReservationResult,
  ReleaseHeldReservationsByCreationKeyPrefixConfig,
  ReleaseHeldReservationsByCreationKeyPrefixResult,
  ScheduleOnceConfig,
  ScheduleOncePerCauseConfig,
  ScheduleOnceResult,
  ScheduleUntilAcknowledgedConfig,
  JobTransactionWriter,
} from "./contracts";
import type {
  ClaimDueBatchInput,
  ClaimDueBatchResult,
  ClaimedJob,
  JobStore,
  TransitionClaimInput,
} from "./job-store";
import { NO_LATE_TOLERANCE_UNITS, resolveScheduleTiming } from "./schedule-timing";

const TICK_LOCK_NAMESPACE = 2_147_483_001;
const TICK_LOCK_KEY = 1;
const DEFAULT_MAX_ATTEMPTS = 5;
const ACKNOWLEDGED_BEFORE_INVOCATION = "ACKNOWLEDGED_BEFORE_INVOCATION";
const CANCELED_BY_DEDUPE_INVALIDATION = "CANCELED_BY_DEDUPE_INVALIDATION";
const REPLACED_BY_DEDUPE_SCHEDULE = "REPLACED_BY_DEDUPE_SCHEDULE";
const RESERVATION_RELEASED_BEFORE_INVOCATION = "RESERVATION_RELEASED_BEFORE_INVOCATION";

type ClaimedJobRow = {
  id: number;
  job_type: string;
  payload: unknown;
  job_version: number;
  attempts: number;
  max_attempts: number;
  run_at: Date | string;
  window_start_cursor: number | null;
  lease_token: string;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isUniqueViolation = (error: unknown): boolean =>
  isObjectRecord(error) && error.code === "23505";

const positiveOr = (value: number | undefined, fallback: number): number => {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
};

const toDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));

const normalizeCreationKey = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error("creationKey must not be empty");
  return normalized;
};

const normalizeDedupeReplacement = (
  config: ReplacePendingByDedupeConfig,
): { coordinationKey: string; activeKeyPrefix: string; scheduleKey: string } => {
  const coordinationKey = config.coordinationKey.trim();
  const activeKeyPrefix = config.activeKeyPrefix.trim();
  const scheduleKey = config.scheduleKey.trim();
  if (!coordinationKey) throw new Error("coordinationKey must not be empty");
  if (!activeKeyPrefix) throw new Error("activeKeyPrefix must not be empty");
  if (!scheduleKey) throw new Error("scheduleKey must not be empty");
  if (!activeKeyPrefix.startsWith(coordinationKey)) {
    throw new Error("activeKeyPrefix must start with coordinationKey");
  }
  if (!scheduleKey.startsWith(activeKeyPrefix)) {
    throw new Error("scheduleKey must start with activeKeyPrefix");
  }
  return { coordinationKey, activeKeyPrefix, scheduleKey };
};

const normalizeCursor = (value: number, name: string): number => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative safe integer`);
  }
  return value;
};

const resolveJobVersion = (value: number | undefined): number => {
  const version = value ?? 1;
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error("jobVersion must be a positive safe integer");
  }
  return version;
};

const toNewJob = (
  config: ScheduleOnceConfig,
  creation: {
    creationMode: "ONCE" | "ONCE_PER_CAUSE" | "UNTIL_ACKNOWLEDGED";
    creationKey?: string;
    reservationState?: "HELD";
    windowStartCursor?: number;
    highWaterCursor?: number;
  },
): NewJobRow => {
  const timing = resolveScheduleTiming(config);
  return {
    jobType: config.jobType,
    payload: config.payload ?? {},
    jobVersion: resolveJobVersion(config.jobVersion),
    status: "PENDING",
    runAt: config.runAt,
    resolutionMs: timing.resolutionMs,
    earlyToleranceUnits: timing.earlyToleranceUnits,
    lateToleranceUnits: timing.lateToleranceUnits,
    maxAttempts: Math.max(1, positiveOr(config.maxAttempts, DEFAULT_MAX_ATTEMPTS)),
    dedupeKey: config.dedupeKey ?? null,
    creationMode: creation.creationMode,
    creationKey: creation.creationKey ?? null,
    reservationState: creation.reservationState ?? null,
    windowStartCursor: creation.windowStartCursor ?? null,
    highWaterCursor: creation.highWaterCursor ?? null,
  };
};

/**
 * A writer can only be constructed from a caller-owned transaction.  The
 * advisory lock therefore spans the owner mutation and Job reservation rather
 * than only a single SQL statement.
 */
class TransactionBoundJobWriter implements JobTransactionWriter {
  constructor(private readonly executor: TransactionExecutor) {}

  private async releaseHeldReservationByKey(
    jobType: string,
    creationKey: string,
  ): Promise<ReleaseHeldReservationResult> {
    const repository = new JobRepository(this.executor);
    await repository.lockCreationKey({ jobType, creationKey });
    const held = await repository.findHeldReservationForUpdate({ jobType, creationKey });
    if (!held) return { jobId: null, released: false, canceled: false };

    const canceled = await repository.cancelPendingById(
      held.id,
      RESERVATION_RELEASED_BEFORE_INVOCATION,
    );
    const released = await repository.releaseReservation(held.id);
    return { jobId: held.id, released, canceled };
  }

  async cancelPendingByDedupeSerialized(
    config: CancelPendingByDedupeSerializedConfig,
  ): Promise<number> {
    const coordinationKey = config.coordinationKey.trim();
    const activeKeyPrefix = config.activeKeyPrefix.trim();
    if (!coordinationKey) throw new Error("coordinationKey must not be empty");
    if (!activeKeyPrefix.startsWith(coordinationKey)) {
      throw new Error("activeKeyPrefix must start with coordinationKey");
    }
    const repository = new JobRepository(this.executor);
    await repository.lockDedupeReplacement({
      jobType: config.jobType,
      activeKeyPrefix: coordinationKey,
    });
    return repository.cancelPendingByDedupe({
      jobType: config.jobType,
      dedupeKeyPrefix: activeKeyPrefix,
      reason: CANCELED_BY_DEDUPE_INVALIDATION,
    });
  }

  async replacePendingByDedupe(
    config: ReplacePendingByDedupeConfig,
  ): Promise<ReplacePendingByDedupeResult> {
    const { coordinationKey, activeKeyPrefix, scheduleKey } = normalizeDedupeReplacement(config);
    const repository = new JobRepository(this.executor);
    await repository.lockDedupeReplacement({
      jobType: config.jobType,
      activeKeyPrefix: coordinationKey,
    });

    const current = await repository.findActiveByJobTypeAndDedupeKey({
      jobType: config.jobType,
      dedupeKey: scheduleKey,
    });
    if (current) {
      return { inserted: false, deduped: true, jobId: current.id, canceled: 0 };
    }

    const canceled = await repository.cancelPendingByDedupe({
      jobType: config.jobType,
      dedupeKeyPrefix: activeKeyPrefix,
      reason: REPLACED_BY_DEDUPE_SCHEDULE,
    });
    const row = await repository.create(
      toNewJob(
        {
          ...config,
          dedupeKey: scheduleKey,
        },
        { creationMode: "ONCE" },
      ),
    );
    return { inserted: true, deduped: false, jobId: row.id, canceled };
  }

  async scheduleOncePerCause(config: ScheduleOncePerCauseConfig): Promise<ScheduleOnceResult> {
    const creationKey = normalizeCreationKey(config.creationKey);
    const repository = new JobRepository(this.executor);
    await repository.lockCreationKey({ jobType: config.jobType, creationKey });
    const existing = await repository.findOncePerCauseForUpdate({
      jobType: config.jobType,
      creationKey,
    });
    if (existing) return { inserted: false, deduped: true, jobId: existing.id };

    const row = await repository.create(
      toNewJob(config, { creationKey, creationMode: "ONCE_PER_CAUSE" }),
    );
    return { inserted: true, deduped: false, jobId: row.id };
  }

  async scheduleUntilAcknowledged(
    config: ScheduleUntilAcknowledgedConfig,
  ): Promise<ScheduleOnceResult> {
    const creationKey = normalizeCreationKey(config.creationKey);
    const windowStartCursor = normalizeCursor(config.windowStartCursor, "windowStartCursor");
    const highWaterCursor = normalizeCursor(config.highWaterCursor, "highWaterCursor");
    if (highWaterCursor < windowStartCursor) {
      throw new Error("highWaterCursor must not be lower than windowStartCursor");
    }

    const repository = new JobRepository(this.executor);
    await repository.lockCreationKey({ jobType: config.jobType, creationKey });
    const existing = await repository.findHeldReservationForUpdate({
      jobType: config.jobType,
      creationKey,
    });
    if (existing) {
      await repository.raiseHeldHighWater({
        jobId: existing.id,
        highWaterCursor,
      });
      return { inserted: false, deduped: true, jobId: existing.id };
    }

    const row = await repository.create(
      toNewJob(config, {
        creationKey,
        creationMode: "UNTIL_ACKNOWLEDGED",
        highWaterCursor,
        reservationState: "HELD",
        windowStartCursor,
      }),
    );
    return { inserted: true, deduped: false, jobId: row.id };
  }

  async acknowledgeUntilAcknowledged(
    config: AcknowledgeUntilAcknowledgedConfig,
  ): Promise<AcknowledgeUntilAcknowledgedResult> {
    const creationKey = normalizeCreationKey(config.creationKey);
    const throughCursor = normalizeCursor(config.throughCursor, "throughCursor");
    const repository = new JobRepository(this.executor);
    await repository.lockCreationKey({ jobType: config.jobType, creationKey });
    const held = await repository.findHeldReservationForUpdate({
      jobType: config.jobType,
      creationKey,
    });
    if (!held) {
      return { jobId: null, released: false, canceled: false, stale: true };
    }
    if (held.highWaterCursor === null || throughCursor < held.highWaterCursor) {
      return { jobId: held.id, released: false, canceled: false, stale: true };
    }

    const canceled = await repository.cancelPendingById(held.id, ACKNOWLEDGED_BEFORE_INVOCATION);
    await repository.releaseReservation(held.id);
    return { jobId: held.id, released: true, canceled, stale: false };
  }

  async releaseHeldReservation(
    config: ReleaseHeldReservationConfig,
  ): Promise<ReleaseHeldReservationResult> {
    const creationKey = normalizeCreationKey(config.creationKey);
    return this.releaseHeldReservationByKey(config.jobType, creationKey);
  }

  async releaseHeldReservationsByCreationKeyPrefix(
    config: ReleaseHeldReservationsByCreationKeyPrefixConfig,
  ): Promise<ReleaseHeldReservationsByCreationKeyPrefixResult> {
    const creationKeyPrefix = config.creationKeyPrefix.trim();
    if (!creationKeyPrefix) throw new Error("creationKeyPrefix must not be empty");

    const repository = new JobRepository(this.executor);
    const creationKeys = await repository.listHeldReservationCreationKeysByPrefix({
      jobType: config.jobType,
      creationKeyPrefix,
    });
    const result: ReleaseHeldReservationsByCreationKeyPrefixResult = {
      released: 0,
      canceled: 0,
      jobIds: [],
    };
    for (const creationKey of creationKeys) {
      const released = await this.releaseHeldReservationByKey(config.jobType, creationKey);
      if (!released.released || released.jobId === null) continue;
      result.released += 1;
      result.canceled += released.canceled ? 1 : 0;
      result.jobIds.push(released.jobId);
    }
    return result;
  }
}

export const createTransactionBoundJobWriter = (
  executor: TransactionExecutor,
): JobTransactionWriter => new TransactionBoundJobWriter(executor);

export class PostgresJobStore implements JobStore {
  constructor(private readonly database: typeof db = db) {}

  async scheduleOnce(config: ScheduleOnceConfig): Promise<ScheduleOnceResult> {
    const repository = new JobRepository(this.database);
    try {
      const row = await repository.create(toNewJob(config, { creationMode: "ONCE" }));
      return { inserted: true, deduped: false, jobId: row.id };
    } catch (error) {
      if (!config.dedupeKey || !isUniqueViolation(error)) throw error;
      const existing = await repository.findActiveByDedupeKey(config.dedupeKey);
      if (!existing) throw error;
      return { inserted: false, deduped: true, jobId: existing.id };
    }
  }

  async replacePendingByDedupe(
    config: ReplacePendingByDedupeConfig,
  ): Promise<ReplacePendingByDedupeResult> {
    return this.database.transaction((tx) =>
      createTransactionBoundJobWriter(tx).replacePendingByDedupe(config),
    );
  }

  async cancelPendingByDedupeSerialized(
    config: CancelPendingByDedupeSerializedConfig,
  ): Promise<number> {
    return this.database.transaction((tx) =>
      createTransactionBoundJobWriter(tx).cancelPendingByDedupeSerialized(config),
    );
  }

  async scheduleOncePerCause(config: ScheduleOncePerCauseConfig): Promise<ScheduleOnceResult> {
    return this.database.transaction((tx) =>
      createTransactionBoundJobWriter(tx).scheduleOncePerCause(config),
    );
  }

  async scheduleUntilAcknowledged(
    config: ScheduleUntilAcknowledgedConfig,
  ): Promise<ScheduleOnceResult> {
    return this.database.transaction((tx) =>
      createTransactionBoundJobWriter(tx).scheduleUntilAcknowledged(config),
    );
  }

  async acknowledgeUntilAcknowledged(
    config: AcknowledgeUntilAcknowledgedConfig,
  ): Promise<AcknowledgeUntilAcknowledgedResult> {
    return this.database.transaction((tx) =>
      createTransactionBoundJobWriter(tx).acknowledgeUntilAcknowledged(config),
    );
  }

  async releaseHeldReservation(
    config: ReleaseHeldReservationConfig,
  ): Promise<ReleaseHeldReservationResult> {
    return this.database.transaction((tx) =>
      createTransactionBoundJobWriter(tx).releaseHeldReservation(config),
    );
  }

  async releaseHeldReservationsByCreationKeyPrefix(
    config: ReleaseHeldReservationsByCreationKeyPrefixConfig,
  ): Promise<ReleaseHeldReservationsByCreationKeyPrefixResult> {
    return this.database.transaction((tx) =>
      createTransactionBoundJobWriter(tx).releaseHeldReservationsByCreationKeyPrefix(config),
    );
  }

  async cancelPendingJobsByDedupe(config: DeletePendingJobsByDedupeConfig): Promise<number> {
    return new JobRepository(this.database).cancelPendingByDedupe({
      ...config,
      reason: CANCELED_BY_DEDUPE_INVALIDATION,
    });
  }

  async claimDueBatch(input: ClaimDueBatchInput): Promise<ClaimDueBatchResult> {
    const dueBucketSql = sql`floor(extract(epoch from run_at) * 1000.0 / resolution_ms)`;
    const nowBucketSql = sql`floor(extract(epoch from now()) * 1000.0 / resolution_ms)`;

    return this.database.transaction(async (tx) => {
      await applyLocalStatementTimeout(tx, input.statementTimeoutMs);
      const lockRows = await tx.execute<{ locked: boolean }>(
        sql`select pg_try_advisory_xact_lock(${TICK_LOCK_NAMESPACE}, ${TICK_LOCK_KEY}) as locked`,
      );
      if (!(lockRows[0]?.locked ?? false)) {
        return { lockSkipped: true, missed: 0, jobs: [] };
      }

      await tx.execute(sql`
        update jobs
        set
          status = 'RETRY',
          lease_until = null,
          leased_by = null,
          lease_token = null,
          updated_at = now(),
          last_error = coalesce(last_error, 'LEASE_EXPIRED'),
          last_reason = coalesce(last_reason, 'LEASE_EXPIRED')
        where status = 'RUNNING'
          and lease_until is not null
          and lease_until < now()
      `);

      const missedRows = await tx.execute<{ id: number }>(sql`
        update jobs
        set
          status = 'MISSED',
          completed_at = now(),
          lease_until = null,
          leased_by = null,
          lease_token = null,
          updated_at = now(),
          last_error = coalesce(last_error, 'MISSED_TOLERANCE_WINDOW'),
          last_reason = coalesce(last_reason, 'MISSED_TOLERANCE_WINDOW')
        where status in ('PENDING', 'RETRY')
          and late_tolerance_units <> ${NO_LATE_TOLERANCE_UNITS}
          and ${nowBucketSql} > ${dueBucketSql} + late_tolerance_units
        returning id
      `);

      const claimedRows = await tx.execute<ClaimedJobRow>(sql`
        with picked as (
          select id
          from jobs
          where status in ('PENDING', 'RETRY')
            and (lease_until is null or lease_until < now())
            and ${nowBucketSql} >= ${dueBucketSql} - early_tolerance_units
            and (
              late_tolerance_units = ${NO_LATE_TOLERANCE_UNITS}
              or ${nowBucketSql} <= ${dueBucketSql} + late_tolerance_units
            )
          order by run_at asc, id asc
          for update skip locked
          limit ${input.batchSize}
        )
        update jobs j
        set
          status = 'RUNNING',
          attempts = j.attempts + 1,
          last_attempted_at = now(),
          lease_until = now() + (${input.leaseMs} * interval '1 millisecond'),
          leased_by = ${input.runnerId},
          lease_token = gen_random_uuid()::text,
          updated_at = now(),
          last_error = null,
          last_disposition = null,
          last_reason = null
        from picked
        where j.id = picked.id
        returning j.id, j.job_type, j.payload, j.job_version, j.attempts,
          j.max_attempts, j.run_at, j.window_start_cursor, j.lease_token
      `);

      return {
        lockSkipped: false,
        missed: missedRows.length,
        jobs: claimedRows.map(
          (row): ClaimedJob => ({
            id: row.id,
            jobType: row.job_type,
            payload: isObjectRecord(row.payload) ? row.payload : {},
            jobVersion: row.job_version,
            attempts: row.attempts,
            maxAttempts: row.max_attempts,
            runAt: toDate(row.run_at),
            windowStartCursor: row.window_start_cursor,
            leaseToken: row.lease_token,
          }),
        ),
      };
    });
  }

  async transitionClaim(input: TransitionClaimInput): Promise<boolean> {
    return new JobRepository(this.database).transitionClaim(input);
  }

  async isCreationReservationHeld(jobId: number): Promise<boolean> {
    return new JobRepository(this.database).isCreationReservationHeld(jobId);
  }
}
