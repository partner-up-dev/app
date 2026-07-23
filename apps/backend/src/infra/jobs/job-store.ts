import type {
  AcknowledgeUntilAcknowledgedConfig,
  AcknowledgeUntilAcknowledgedResult,
  CancelPendingByDedupeSerializedConfig,
  DeletePendingJobsByDedupeConfig,
  JobPayload,
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
} from "./contracts";

export interface ClaimedJob {
  id: number;
  jobType: string;
  payload: JobPayload;
  jobVersion: number;
  attempts: number;
  maxAttempts: number;
  runAt: Date;
  windowStartCursor: number | null;
  leaseToken: string;
}

export interface ClaimDueBatchInput {
  batchSize: number;
  leaseMs: number;
  statementTimeoutMs?: number;
  runnerId: string;
}

export interface ClaimDueBatchResult {
  lockSkipped: boolean;
  missed: number;
  jobs: ClaimedJob[];
}

export type JobCompletionStatus = "SUCCEEDED" | "SKIPPED" | "RETRY" | "FAILED";

export interface TransitionClaimInput {
  jobId: number;
  runnerId: string;
  leaseToken: string;
  status: JobCompletionStatus;
  disposition: "SUCCEEDED" | "SKIPPED" | "RETRYABLE_FAILURE" | "PERMANENT_FAILURE";
  reason: string | null;
  retryAt?: Date;
}

export interface JobStore {
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
  claimDueBatch(input: ClaimDueBatchInput): Promise<ClaimDueBatchResult>;
  transitionClaim(input: TransitionClaimInput): Promise<boolean>;
  isCreationReservationHeld(jobId: number): Promise<boolean>;
}
