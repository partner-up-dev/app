import { z } from "zod";
import { jobExecutionDispositionSchema } from "../../entities/job";

export const jobSourceSchema = z.enum(["request-tail", "external-trigger", "manual"]);
export type JobSource = z.infer<typeof jobSourceSchema>;

export { jobExecutionDispositionSchema };
export type JobExecutionDisposition = z.infer<typeof jobExecutionDispositionSchema>;

export type JobPayload = Record<string, unknown>;

export interface JobExecutionResult {
  disposition: JobExecutionDisposition;
  reason?: string | null;
}

export interface JobHandlerContext {
  jobId: number;
  jobVersion: number;
  attempts: number;
  runAt: Date;
  /**
   * Generic creation-window lower bound for `UNTIL_ACKNOWLEDGED` work. It is
   * null for ordinary Job creation modes; handlers must not infer business
   * state from it beyond their own typed payload contract.
   */
  windowStartCursor: number | null;
  source: JobSource;
  leaseToken: string;
  isCreationReservationHeld(): Promise<boolean>;
}

export interface JobDefinition<TPayload extends JobPayload = JobPayload> {
  jobType: string;
  version: number;
  payloadSchema: z.ZodType<TPayload>;
  execute(payload: TPayload, context: JobHandlerContext): Promise<JobExecutionResult>;
}

export interface ScheduleOnceConfig {
  jobType: string;
  /** Defaults to 1 only for the legacy scheduling compatibility window. */
  jobVersion?: number;
  runAt: Date;
  resolutionMs: number;
  payload?: JobPayload;
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

export interface ReplacePendingByDedupeConfig extends Omit<ScheduleOnceConfig, "dedupeKey"> {
  coordinationKey: string;
  activeKeyPrefix: string;
  scheduleKey: string;
}

export interface ReplacePendingByDedupeResult extends ScheduleOnceResult {
  canceled: number;
}

export interface CancelPendingByDedupeSerializedConfig {
  jobType: string;
  coordinationKey: string;
  activeKeyPrefix: string;
}

export interface ScheduleOncePerCauseConfig extends Omit<ScheduleOnceConfig, "dedupeKey"> {
  creationKey: string;
}

export interface ScheduleUntilAcknowledgedConfig extends Omit<ScheduleOnceConfig, "dedupeKey"> {
  creationKey: string;
  windowStartCursor: number;
  highWaterCursor: number;
}

export interface AcknowledgeUntilAcknowledgedConfig {
  jobType: string;
  creationKey: string;
  throughCursor: number;
}

export interface AcknowledgeUntilAcknowledgedResult {
  jobId: number | null;
  released: boolean;
  canceled: boolean;
  stale: boolean;
}

/**
 * Releases one held creation reservation without carrying owner semantics
 * into the generic Job layer. Pending/retry execution is canceled as part of
 * the release; running and terminal execution is left untouched.
 */
export interface ReleaseHeldReservationConfig {
  jobType: string;
  creationKey: string;
}

export interface ReleaseHeldReservationResult {
  jobId: number | null;
  released: boolean;
  canceled: boolean;
}

/** Enumerates and releases held reservations whose creation keys share a prefix. */
export interface ReleaseHeldReservationsByCreationKeyPrefixConfig {
  jobType: string;
  creationKeyPrefix: string;
}

export interface ReleaseHeldReservationsByCreationKeyPrefixResult {
  released: number;
  canceled: number;
  jobIds: number[];
}

/**
 * Narrow writer deliberately bound to a caller-owned database transaction.
 * It exists for named owner mutations which must make source state and Job
 * creation/reservation visible atomically; it is not a generic transaction
 * abstraction or a public persistence executor.
 */
export interface JobTransactionWriter {
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
}

export interface DeletePendingJobsByDedupeConfig {
  jobType: string;
  dedupeKey?: string;
  dedupeKeyPrefix?: string;
}

export interface RunDueJobsOptions {
  source?: JobSource;
  batchSize?: number;
  maxBatches?: number;
  budgetMs?: number;
  leaseMs?: number;
  claimStatementTimeoutMs?: number;
}

export interface RunDueJobsSummary {
  source: JobSource;
  claimed: number;
  succeeded: number;
  skipped: number;
  retried: number;
  failed: number;
  missed: number;
  staleCompletions: number;
  lockSkipped: boolean;
  durationMs: number;
}
