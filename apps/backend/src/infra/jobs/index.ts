import { createJobRunner } from "./job-runner";
import { PostgresJobStore } from "./postgres-job-store";

export const jobRunner = createJobRunner({
  store: new PostgresJobStore(),
});

export { createJobRunner } from "./job-runner";
export { createTransactionBoundJobWriter } from "./postgres-job-store";
export {
  NO_LATE_TOLERANCE_UNITS,
  getBucketIndex,
  getBucketStartMs,
  getClaimWindowBounds,
  resolveScheduleTiming,
} from "./schedule-timing";
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
  ReleaseHeldReservationConfig,
  ReleaseHeldReservationResult,
  ReleaseHeldReservationsByCreationKeyPrefixConfig,
  ReleaseHeldReservationsByCreationKeyPrefixResult,
  ReplacePendingByDedupeConfig,
  ReplacePendingByDedupeResult,
  JobRunner,
  RunDueJobsOptions,
  RunDueJobsSummary,
  ScheduleOnceConfig,
  ScheduleOncePerCauseConfig,
  ScheduleOnceResult,
  ScheduleUntilAcknowledgedConfig,
} from "./job-runner";
export type { ClaimedJob, JobStore } from "./job-store";
