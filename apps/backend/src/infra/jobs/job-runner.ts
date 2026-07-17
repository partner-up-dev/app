import { randomUUID } from "crypto";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { jobs } from "../../entities/job";
import { db } from "../../lib/db";
import { toErrorMessage } from "../../lib/error-message";
import { applyLocalStatementTimeout } from "../../lib/pg-timeouts";
import { NO_LATE_TOLERANCE_UNITS, resolveScheduleTiming } from "./schedule-timing";

const TICK_LOCK_NAMESPACE = 2_147_483_001;
const TICK_LOCK_KEY = 1;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_MAX_BATCHES = 3;
const DEFAULT_BUDGET_MS = 3_000;
const DEFAULT_LEASE_MS = 60_000;
const MAX_RETRY_DELAY_MS = 15 * 60 * 1000;
const BASE_RETRY_DELAY_MS = 30_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduleOnceConfig {
  jobType: string;
  runAt: Date;
  resolutionMs: number;
  payload?: Record<string, unknown>;
  earlyToleranceUnits?: number;
  lateToleranceUnits?: number;
  maxAttempts?: number;
  dedupeKey?: string | null;
}

export interface ScheduleOnceResult {
  inserted: boolean;
  deduped: boolean;
  jobId: number | null;
}

export interface RunDueJobsOptions {
  source?: "request-tail" | "external-trigger" | "manual";
  batchSize?: number;
  maxBatches?: number;
  budgetMs?: number;
  leaseMs?: number;
  claimStatementTimeoutMs?: number;
}

export interface RunDueJobsSummary {
  source: "request-tail" | "external-trigger" | "manual";
  claimed: number;
  succeeded: number;
  retried: number;
  failed: number;
  missed: number;
  lockSkipped: boolean;
  durationMs: number;
}

export interface JobHandlerContext {
  jobId: number;
  attempts: number;
  runAt: Date;
  source: "request-tail" | "external-trigger" | "manual";
}

export interface DeletePendingJobsByDedupeConfig {
  jobType: string;
  dedupeKey?: string;
  dedupeKeyPrefix?: string;
}

export type JobHandler = (
  payload: Record<string, unknown>,
  context: JobHandlerContext,
) => Promise<void>;

interface ClaimedJob {
  id: number;
  jobType: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  runAt: Date;
}

interface ClaimBatchResult {
  lockSkipped: boolean;
  missed: number;
  jobs: ClaimedJob[];
}

interface ClaimedJobRow extends Record<string, unknown> {
  id: number;
  job_type: string;
  payload: unknown;
  attempts: number;
  max_attempts: number;
  run_at: Date | string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isUniqueViolation = (error: unknown): boolean => {
  if (!isObjectRecord(error)) return false;
  return error.code === "23505";
};

const positiveOr = (value: number | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
};

const toDate = (value: Date | string): Date => {
  if (value instanceof Date) return value;
  return new Date(value);
};

// ---------------------------------------------------------------------------
// JobRunner implementation
// ---------------------------------------------------------------------------

class JobRunnerImpl {
  private handlers = new Map<string, JobHandler>();
  private running = false;
  private lastRunAt: Date | null = null;
  private lastError: string | null = null;
  private lastSummary: RunDueJobsSummary | null = null;
  private readonly instanceId = randomUUID();

  registerHandler(jobType: string, handler: JobHandler): void {
    this.handlers.set(jobType, handler);
  }

  unregisterHandler(jobType: string): void {
    this.handlers.delete(jobType);
  }

  async deletePendingJobsByDedupe(config: DeletePendingJobsByDedupeConfig): Promise<number> {
    const dedupeKey = config.dedupeKey?.trim();
    const dedupeKeyPrefix = config.dedupeKeyPrefix?.trim();
    if (!dedupeKey && !dedupeKeyPrefix) {
      throw new Error("deletePendingJobsByDedupe requires key or key prefix");
    }

    const conditions = [
      eq(jobs.jobType, config.jobType),
      inArray(jobs.status, ["PENDING", "RETRY"]),
    ];

    if (dedupeKey) {
      conditions.push(eq(jobs.dedupeKey, dedupeKey));
    }
    if (dedupeKeyPrefix) {
      conditions.push(like(jobs.dedupeKey, `${dedupeKeyPrefix}%`));
    }

    const deletedRows = await db
      .delete(jobs)
      .where(and(...conditions))
      .returning({ id: jobs.id });

    return deletedRows.length;
  }

  async scheduleOnce(config: ScheduleOnceConfig): Promise<ScheduleOnceResult> {
    const payload = config.payload ?? {};
    const timing = resolveScheduleTiming(config);
    const maxAttempts = Math.max(1, positiveOr(config.maxAttempts, DEFAULT_MAX_ATTEMPTS));

    try {
      const insertedRows = await db
        .insert(jobs)
        .values({
          jobType: config.jobType,
          payload,
          status: "PENDING",
          runAt: config.runAt,
          resolutionMs: timing.resolutionMs,
          earlyToleranceUnits: timing.earlyToleranceUnits,
          lateToleranceUnits: timing.lateToleranceUnits,
          maxAttempts,
          dedupeKey: config.dedupeKey ?? null,
        })
        .returning({ id: jobs.id });

      return {
        inserted: true,
        deduped: false,
        jobId: insertedRows[0]?.id ?? null,
      };
    } catch (error) {
      if (config.dedupeKey && isUniqueViolation(error)) {
        return { inserted: false, deduped: true, jobId: null };
      }
      throw error;
    }
  }

  async runDueJobs(options: RunDueJobsOptions = {}): Promise<RunDueJobsSummary> {
    const source = options.source ?? "manual";
    const batchSize = positiveOr(options.batchSize, DEFAULT_BATCH_SIZE);
    const maxBatches = positiveOr(options.maxBatches, DEFAULT_MAX_BATCHES);
    const budgetMs = positiveOr(options.budgetMs, DEFAULT_BUDGET_MS);
    const leaseMs = positiveOr(options.leaseMs, DEFAULT_LEASE_MS);
    const claimStatementTimeoutMs = positiveOr(options.claimStatementTimeoutMs, budgetMs);
    const startedAt = Date.now();

    const summary: RunDueJobsSummary = {
      source,
      claimed: 0,
      succeeded: 0,
      retried: 0,
      failed: 0,
      missed: 0,
      lockSkipped: false,
      durationMs: 0,
    };

    if (this.running) {
      summary.lockSkipped = true;
      return summary;
    }

    this.running = true;
    try {
      for (let i = 0; i < maxBatches; i += 1) {
        if (Date.now() - startedAt >= budgetMs) {
          break;
        }

        const claim = await this.claimDueBatch(batchSize, leaseMs, claimStatementTimeoutMs);
        summary.missed += claim.missed;

        if (claim.lockSkipped) {
          summary.lockSkipped = true;
          break;
        }

        if (claim.jobs.length === 0) {
          break;
        }

        for (const job of claim.jobs) {
          summary.claimed += 1;
          const handler = this.handlers.get(job.jobType);
          if (!handler) {
            await this.markFailed(job.id, `No handler registered for job type "${job.jobType}"`);
            summary.failed += 1;
            continue;
          }

          try {
            await handler(job.payload, {
              jobId: job.id,
              attempts: job.attempts,
              runAt: job.runAt,
              source,
            });
            await this.markSucceeded(job.id);
            summary.succeeded += 1;
          } catch (error) {
            const message = toErrorMessage(error);
            if (job.attempts >= job.maxAttempts) {
              await this.markFailed(job.id, message);
              summary.failed += 1;
            } else {
              await this.markRetry(job.id, message, job.attempts);
              summary.retried += 1;
            }
          }
        }
      }

      this.lastRunAt = new Date();
      this.lastError = null;
      summary.durationMs = Date.now() - startedAt;
      this.lastSummary = summary;

      return summary;
    } catch (error) {
      this.lastError = toErrorMessage(error);
      summary.durationMs = Date.now() - startedAt;
      this.lastSummary = summary;
      throw error;
    } finally {
      this.running = false;
    }
  }

  status(): {
    instanceId: string;
    running: boolean;
    registeredJobTypes: string[];
    lastRunAt: Date | null;
    lastError: string | null;
    lastSummary: RunDueJobsSummary | null;
  } {
    return {
      instanceId: this.instanceId,
      running: this.running,
      registeredJobTypes: Array.from(this.handlers.keys()),
      lastRunAt: this.lastRunAt,
      lastError: this.lastError,
      lastSummary: this.lastSummary,
    };
  }

  private async claimDueBatch(
    batchSize: number,
    leaseMs: number,
    statementTimeoutMs?: number,
  ): Promise<ClaimBatchResult> {
    const dueBucketSql = sql`floor(extract(epoch from run_at) * 1000.0 / resolution_ms)`;
    const nowBucketSql = sql`floor(extract(epoch from now()) * 1000.0 / resolution_ms)`;

    return db.transaction(async (tx) => {
      await applyLocalStatementTimeout(tx, statementTimeoutMs);

      const lockRows = await tx.execute<{ locked: boolean }>(
        sql`select pg_try_advisory_xact_lock(${TICK_LOCK_NAMESPACE}, ${TICK_LOCK_KEY}) as locked`,
      );
      const locked = lockRows[0]?.locked ?? false;
      if (!locked) {
        return { lockSkipped: true, missed: 0, jobs: [] };
      }

      await tx.execute<{ id: number }>(sql`
        update jobs
        set
          status = 'RETRY',
          lease_until = null,
          leased_by = null,
          updated_at = now(),
          last_error = coalesce(last_error, 'Lease expired before completion')
        where status = 'RUNNING'
          and lease_until is not null
          and lease_until < now()
        returning id
      `);

      const missedRows = await tx.execute<{ id: number }>(sql`
        update jobs
        set
          status = 'MISSED',
          completed_at = now(),
          lease_until = null,
          leased_by = null,
          updated_at = now(),
          last_error = coalesce(last_error, 'Missed tolerance window')
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
          limit ${batchSize}
        )
        update jobs j
        set
          status = 'RUNNING',
          attempts = j.attempts + 1,
          last_attempted_at = now(),
          lease_until = now() + (${leaseMs} * interval '1 millisecond'),
          leased_by = ${this.instanceId},
          updated_at = now(),
          last_error = null
        from picked
        where j.id = picked.id
        returning j.id, j.job_type, j.payload, j.attempts, j.max_attempts, j.run_at
      `);

      return {
        lockSkipped: false,
        missed: missedRows.length,
        jobs: claimedRows.map((row) => ({
          id: row.id,
          jobType: row.job_type,
          payload: isObjectRecord(row.payload) ? row.payload : {},
          attempts: row.attempts,
          maxAttempts: row.max_attempts,
          runAt: toDate(row.run_at),
        })),
      };
    });
  }

  private async markSucceeded(jobId: number): Promise<void> {
    await db
      .update(jobs)
      .set({
        status: "SUCCEEDED",
        leaseUntil: null,
        leasedBy: null,
        completedAt: new Date(),
        updatedAt: new Date(),
        lastError: null,
      })
      .where(eq(jobs.id, jobId));
  }

  private async markFailed(jobId: number, message: string): Promise<void> {
    await db
      .update(jobs)
      .set({
        status: "FAILED",
        leaseUntil: null,
        leasedBy: null,
        completedAt: new Date(),
        updatedAt: new Date(),
        lastError: message,
      })
      .where(eq(jobs.id, jobId));
  }

  private async markRetry(jobId: number, message: string, attempts: number): Promise<void> {
    const retryDelayMs = Math.min(MAX_RETRY_DELAY_MS, attempts * BASE_RETRY_DELAY_MS);
    await db
      .update(jobs)
      .set({
        status: "RETRY",
        runAt: new Date(Date.now() + retryDelayMs),
        leaseUntil: null,
        leasedBy: null,
        updatedAt: new Date(),
        lastError: message,
      })
      .where(eq(jobs.id, jobId));
  }
}

export const jobRunner = new JobRunnerImpl();
