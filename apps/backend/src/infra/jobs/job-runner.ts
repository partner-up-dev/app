import { randomUUID } from "crypto";
import {
  jobExecutionDispositionSchema,
  type AcknowledgeUntilAcknowledgedConfig,
  type AcknowledgeUntilAcknowledgedResult,
  type CancelPendingByDedupeSerializedConfig,
  type DeletePendingJobsByDedupeConfig,
  type JobDefinition,
  type JobExecutionDisposition,
  type JobExecutionResult,
  type JobHandler,
  type ReleaseHeldReservationConfig,
  type ReleaseHeldReservationResult,
  type ReleaseHeldReservationsByCreationKeyPrefixConfig,
  type ReleaseHeldReservationsByCreationKeyPrefixResult,
  type ReplacePendingByDedupeConfig,
  type ReplacePendingByDedupeResult,
  type RunDueJobsOptions,
  type RunDueJobsSummary,
  type ScheduleOnceConfig,
  type ScheduleOncePerCauseConfig,
  type ScheduleOnceResult,
  type ScheduleUntilAcknowledgedConfig,
} from "./contracts";
import type { ClaimedJob, JobCompletionStatus, JobStore } from "./job-store";
import { createLegacyJobDefinition } from "./legacy-adapter";

export type {
  ReleaseHeldReservationConfig,
  ReleaseHeldReservationResult,
  ReleaseHeldReservationsByCreationKeyPrefixConfig,
  ReleaseHeldReservationsByCreationKeyPrefixResult,
} from "./contracts";

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_MAX_BATCHES = 3;
const DEFAULT_BUDGET_MS = 3_000;
const DEFAULT_LEASE_MS = 60_000;
const MAX_RETRY_DELAY_MS = 15 * 60 * 1_000;
const BASE_RETRY_DELAY_MS = 30_000;

export interface CreateJobRunnerOptions {
  store: JobStore;
  now?: () => Date;
  runnerId?: string;
}

export interface JobRunner {
  registerDefinition(definition: JobDefinition): void;
  registerHandler(jobType: string, handler: JobHandler): void;
  unregisterHandler(jobType: string): void;
  scheduleOnce(config: ScheduleOnceConfig): Promise<ScheduleOnceResult>;
  cancelPendingByDedupeSerialized(config: CancelPendingByDedupeSerializedConfig): Promise<number>;
  replacePendingByDedupe(
    config: ReplacePendingByDedupeConfig,
  ): Promise<ReplacePendingByDedupeResult>;
  scheduleOncePerCause(config: ScheduleOncePerCauseConfig): Promise<ScheduleOnceResult>;
  scheduleUntilAcknowledged(config: ScheduleUntilAcknowledgedConfig): Promise<ScheduleOnceResult>;
  acknowledgeUntilAcknowledged(
    config: AcknowledgeUntilAcknowledgedConfig,
  ): Promise<AcknowledgeUntilAcknowledgedResult>;
  releaseHeldReservation(
    config: ReleaseHeldReservationConfig,
  ): Promise<ReleaseHeldReservationResult>;
  releaseHeldReservationsByCreationKeyPrefix(
    config: ReleaseHeldReservationsByCreationKeyPrefixConfig,
  ): Promise<ReleaseHeldReservationsByCreationKeyPrefixResult>;
  cancelPendingJobsByDedupe(config: DeletePendingJobsByDedupeConfig): Promise<number>;
  deletePendingJobsByDedupe(config: DeletePendingJobsByDedupeConfig): Promise<number>;
  runDueJobs(options?: RunDueJobsOptions): Promise<RunDueJobsSummary>;
  status(): {
    instanceId: string;
    running: boolean;
    registeredJobTypes: string[];
    lastRunAt: Date | null;
    lastError: string | null;
    lastSummary: RunDueJobsSummary | null;
  };
}

const positiveOr = (value: number | undefined, fallback: number): number => {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
};

const toStableReason = (value: string | null | undefined, fallback: string): string => {
  const normalized = value?.trim();
  if (!normalized) return fallback;
  return /^[A-Z][A-Z0-9_:-]{0,95}$/.test(normalized) ? normalized : fallback;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * TypeScript protects authored definitions, not malformed JavaScript or a
 * coerced plugin return at runtime.  A bad return must complete the current
 * claim as a generic permanent failure rather than leave it RUNNING until the
 * lease expires.
 */
const normalizeExecutionResult = (value: unknown): JobExecutionResult => {
  if (!isObjectRecord(value)) {
    return { disposition: "PERMANENT_FAILURE", reason: "INVALID_HANDLER_RESULT" };
  }
  const disposition = jobExecutionDispositionSchema.safeParse(value.disposition);
  if (!disposition.success) {
    return { disposition: "PERMANENT_FAILURE", reason: "INVALID_HANDLER_RESULT" };
  }
  return {
    disposition: disposition.data,
    reason: typeof value.reason === "string" ? value.reason : null,
  };
};

const retryDelayMs = (attempts: number): number =>
  Math.min(MAX_RETRY_DELAY_MS, attempts * BASE_RETRY_DELAY_MS);

type TransitionPlan = {
  disposition: JobExecutionDisposition;
  reason: string;
  status: JobCompletionStatus;
  retryAt?: Date;
};

class JobRunnerImpl implements JobRunner {
  private readonly definitionsByType = new Map<string, Map<number, JobDefinition>>();
  private running = false;
  private lastRunAt: Date | null = null;
  private lastError: string | null = null;
  private lastSummary: RunDueJobsSummary | null = null;
  private readonly runnerId: string;
  private readonly now: () => Date;

  constructor(
    private readonly store: JobStore,
    options: Omit<CreateJobRunnerOptions, "store">,
  ) {
    this.runnerId = options.runnerId ?? randomUUID();
    this.now = options.now ?? (() => new Date());
  }

  registerDefinition(definition: JobDefinition): void {
    if (!definition.jobType.trim()) throw new Error("Job definition jobType must not be empty");
    if (!Number.isSafeInteger(definition.version) || definition.version < 1) {
      throw new Error("Job definition version must be a positive safe integer");
    }
    const definitionsByVersion = this.definitionsByType.get(definition.jobType) ?? new Map();
    definitionsByVersion.set(definition.version, definition);
    this.definitionsByType.set(definition.jobType, definitionsByVersion);
  }

  registerHandler(jobType: string, handler: JobHandler): void {
    this.registerDefinition(createLegacyJobDefinition({ jobType, handler }));
  }

  unregisterHandler(jobType: string): void {
    this.definitionsByType.delete(jobType);
  }

  scheduleOnce(config: ScheduleOnceConfig): Promise<ScheduleOnceResult> {
    return this.store.scheduleOnce(config);
  }

  cancelPendingByDedupeSerialized(config: CancelPendingByDedupeSerializedConfig): Promise<number> {
    return this.store.cancelPendingByDedupeSerialized(config);
  }

  replacePendingByDedupe(
    config: ReplacePendingByDedupeConfig,
  ): Promise<ReplacePendingByDedupeResult> {
    return this.store.replacePendingByDedupe(config);
  }

  scheduleOncePerCause(config: ScheduleOncePerCauseConfig): Promise<ScheduleOnceResult> {
    return this.store.scheduleOncePerCause(config);
  }

  scheduleUntilAcknowledged(config: ScheduleUntilAcknowledgedConfig): Promise<ScheduleOnceResult> {
    return this.store.scheduleUntilAcknowledged(config);
  }

  acknowledgeUntilAcknowledged(
    config: AcknowledgeUntilAcknowledgedConfig,
  ): Promise<AcknowledgeUntilAcknowledgedResult> {
    return this.store.acknowledgeUntilAcknowledged(config);
  }

  releaseHeldReservation(
    config: ReleaseHeldReservationConfig,
  ): Promise<ReleaseHeldReservationResult> {
    return this.store.releaseHeldReservation(config);
  }

  releaseHeldReservationsByCreationKeyPrefix(
    config: ReleaseHeldReservationsByCreationKeyPrefixConfig,
  ): Promise<ReleaseHeldReservationsByCreationKeyPrefixResult> {
    return this.store.releaseHeldReservationsByCreationKeyPrefix(config);
  }

  cancelPendingJobsByDedupe(config: DeletePendingJobsByDedupeConfig): Promise<number> {
    return this.store.cancelPendingJobsByDedupe(config);
  }

  /** @deprecated Compatibility name; it now preserves Job control history as CANCELED. */
  deletePendingJobsByDedupe(config: DeletePendingJobsByDedupeConfig): Promise<number> {
    return this.cancelPendingJobsByDedupe(config);
  }

  async runDueJobs(options: RunDueJobsOptions = {}): Promise<RunDueJobsSummary> {
    const source = options.source ?? "manual";
    const batchSize = positiveOr(options.batchSize, DEFAULT_BATCH_SIZE);
    const maxBatches = positiveOr(options.maxBatches, DEFAULT_MAX_BATCHES);
    const budgetMs = positiveOr(options.budgetMs, DEFAULT_BUDGET_MS);
    const leaseMs = positiveOr(options.leaseMs, DEFAULT_LEASE_MS);
    const claimStatementTimeoutMs = positiveOr(options.claimStatementTimeoutMs, budgetMs);
    const startedAt = this.now();
    const summary: RunDueJobsSummary = {
      source,
      claimed: 0,
      succeeded: 0,
      skipped: 0,
      retried: 0,
      failed: 0,
      missed: 0,
      staleCompletions: 0,
      lockSkipped: false,
      durationMs: 0,
    };

    if (this.running) {
      summary.lockSkipped = true;
      return summary;
    }

    this.running = true;
    try {
      for (let batchIndex = 0; batchIndex < maxBatches; batchIndex += 1) {
        if (this.now().getTime() - startedAt.getTime() >= budgetMs) break;

        const claim = await this.store.claimDueBatch({
          batchSize,
          leaseMs,
          statementTimeoutMs: claimStatementTimeoutMs,
          runnerId: this.runnerId,
        });
        summary.missed += claim.missed;
        if (claim.lockSkipped) {
          summary.lockSkipped = true;
          break;
        }
        if (claim.jobs.length === 0) break;

        for (const job of claim.jobs) {
          summary.claimed += 1;
          await this.executeClaimedJob(job, source, summary);
        }
      }

      this.lastRunAt = this.now();
      this.lastError = null;
      summary.durationMs = this.now().getTime() - startedAt.getTime();
      this.lastSummary = summary;
      return summary;
    } catch (error) {
      this.lastError = "JOB_RUNNER_FAILURE";
      summary.durationMs = this.now().getTime() - startedAt.getTime();
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
      instanceId: this.runnerId,
      running: this.running,
      registeredJobTypes: Array.from(this.definitionsByType.keys()),
      lastRunAt: this.lastRunAt,
      lastError: this.lastError,
      lastSummary: this.lastSummary,
    };
  }

  private async executeClaimedJob(
    job: ClaimedJob,
    source: RunDueJobsSummary["source"],
    summary: RunDueJobsSummary,
  ): Promise<void> {
    let result: JobExecutionResult;
    const definitionsByVersion = this.definitionsByType.get(job.jobType);
    const definition = definitionsByVersion?.get(job.jobVersion);

    if (!definitionsByVersion) {
      result = { disposition: "PERMANENT_FAILURE", reason: "NO_HANDLER" };
    } else if (!definition) {
      result = { disposition: "PERMANENT_FAILURE", reason: "UNSUPPORTED_JOB_VERSION" };
    } else {
      const decoded = definition.payloadSchema.safeParse(job.payload);
      if (!decoded.success) {
        result = { disposition: "PERMANENT_FAILURE", reason: "INVALID_PAYLOAD" };
      } else {
        try {
          result = normalizeExecutionResult(
            await definition.execute(decoded.data, {
              jobId: job.id,
              jobVersion: job.jobVersion,
              attempts: job.attempts,
              runAt: job.runAt,
              windowStartCursor: job.windowStartCursor,
              source,
              leaseToken: job.leaseToken,
              isCreationReservationHeld: () => this.store.isCreationReservationHeld(job.id),
            }),
          );
        } catch {
          result = { disposition: "RETRYABLE_FAILURE", reason: "HANDLER_THROWN" };
        }
      }
    }

    const plan = this.toTransitionPlan(result, job.attempts, job.maxAttempts);
    const stateApplied = await this.store.transitionClaim({
      jobId: job.id,
      runnerId: this.runnerId,
      leaseToken: job.leaseToken,
      status: plan.status,
      disposition: plan.disposition,
      reason: plan.reason,
      retryAt: plan.retryAt,
    });
    this.recordSummary(summary, plan.status, stateApplied);
  }

  private toTransitionPlan(
    result: JobExecutionResult,
    attempts: number,
    maxAttempts: number,
  ): TransitionPlan {
    const parsedDisposition = jobExecutionDispositionSchema.safeParse(result.disposition);
    if (!parsedDisposition.success) {
      return {
        disposition: "PERMANENT_FAILURE",
        reason: "INVALID_HANDLER_RESULT",
        status: "FAILED",
      };
    }

    const reason = toStableReason(result.reason, parsedDisposition.data);
    switch (parsedDisposition.data) {
      case "SUCCEEDED":
        return { disposition: "SUCCEEDED", reason, status: "SUCCEEDED" };
      case "SKIPPED":
        return { disposition: "SKIPPED", reason, status: "SKIPPED" };
      case "PERMANENT_FAILURE":
        return { disposition: "PERMANENT_FAILURE", reason, status: "FAILED" };
      case "RETRYABLE_FAILURE":
        if (attempts >= maxAttempts) {
          return {
            disposition: "RETRYABLE_FAILURE",
            reason: "RETRY_EXHAUSTED",
            status: "FAILED",
          };
        }
        return {
          disposition: "RETRYABLE_FAILURE",
          reason,
          status: "RETRY",
          retryAt: new Date(this.now().getTime() + retryDelayMs(attempts)),
        };
    }
  }

  private recordSummary(
    summary: RunDueJobsSummary,
    status: JobCompletionStatus,
    stateApplied: boolean,
  ): void {
    if (!stateApplied) {
      summary.staleCompletions += 1;
      return;
    }
    if (status === "SUCCEEDED") summary.succeeded += 1;
    if (status === "SKIPPED") summary.skipped += 1;
    if (status === "RETRY") summary.retried += 1;
    if (status === "FAILED") summary.failed += 1;
  }
}

export function createJobRunner(options: CreateJobRunnerOptions): JobRunner {
  return new JobRunnerImpl(options.store, options);
}

export type {
  AcknowledgeUntilAcknowledgedConfig,
  AcknowledgeUntilAcknowledgedResult,
  CancelPendingByDedupeSerializedConfig,
  DeletePendingJobsByDedupeConfig,
  JobDefinition,
  JobExecutionDisposition,
  JobHandler,
  JobHandlerContext,
  JobTransactionWriter,
  ReplacePendingByDedupeConfig,
  ReplacePendingByDedupeResult,
  RunDueJobsOptions,
  RunDueJobsSummary,
  ScheduleOnceConfig,
  ScheduleOncePerCauseConfig,
  ScheduleOnceResult,
  ScheduleUntilAcknowledgedConfig,
} from "./contracts";
