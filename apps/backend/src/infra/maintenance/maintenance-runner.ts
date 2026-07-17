import { jobRunner, type RunDueJobsSummary } from "../jobs";
import { env } from "../../lib/env";
import { toErrorMessage } from "../../lib/error-message";

export interface MaintenanceTickSummary {
  source: "external-trigger" | "manual";
  jobs: RunDueJobsSummary | null;
  jobsError: string | null;
  durationMs: number;
}

export interface SkippedMaintenanceTickSummary {
  source: "external-trigger";
  skipped: true;
  skipReason: "IN_FLIGHT";
  durationMs: number;
}

export type ExternalMaintenanceTickResult = MaintenanceTickSummary | SkippedMaintenanceTickSummary;

let externalMaintenanceTickInFlight: Promise<MaintenanceTickSummary> | null = null;

export async function runExternalMaintenanceTick(): Promise<MaintenanceTickSummary> {
  const startedAt = Date.now();
  const maintenanceBudgetMs = env.MAINTENANCE_TICK_BUDGET_MS;
  let jobs: RunDueJobsSummary | null = null;
  let jobsError: string | null = null;

  if (maintenanceBudgetMs > 0) {
    try {
      jobs = await jobRunner.runDueJobs({
        source: "external-trigger",
        batchSize: env.JOB_RUNNER_CLAIM_BATCH_SIZE,
        maxBatches: env.JOB_RUNNER_MAX_BATCHES_PER_TICK,
        budgetMs: maintenanceBudgetMs,
        leaseMs: env.JOB_RUNNER_LEASE_MS,
        claimStatementTimeoutMs: maintenanceBudgetMs,
      });
    } catch (error) {
      jobsError = toErrorMessage(error);
    }
  }

  return {
    source: "external-trigger",
    jobs,
    jobsError,
    durationMs: Date.now() - startedAt,
  };
}

export async function runExternalMaintenanceTickOrSkip(): Promise<ExternalMaintenanceTickResult> {
  if (externalMaintenanceTickInFlight) {
    return {
      source: "external-trigger",
      skipped: true,
      skipReason: "IN_FLIGHT",
      durationMs: 0,
    };
  }

  externalMaintenanceTickInFlight = runExternalMaintenanceTick().finally(() => {
    externalMaintenanceTickInFlight = null;
  });

  return externalMaintenanceTickInFlight;
}
