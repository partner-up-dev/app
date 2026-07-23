import type { JobRunner } from "../jobs";
import { withTimeout } from "../../lib/with-timeout";

export type RequestTailMaintenanceConfig = {
  batchSize: number;
  maxBatches: number;
  budgetMs: number;
  leaseMs: number;
  minIntervalMs: number;
};

export type RequestTailMaintenanceRunner = {
  kick(): void;
  run(): Promise<void>;
};

type RequestTailMaintenanceRunnerInput = {
  runner: Pick<JobRunner, "runDueJobs">;
  now?: () => Date;
  config: RequestTailMaintenanceConfig;
  timeout?: <T>(task: Promise<T>, timeoutMs: number, message: string) => Promise<T>;
  onError?: (error: unknown) => void;
};

/** Request-tail maintenance is a best-effort wake-up, not a second scheduler. */
export const createRequestTailMaintenanceRunner = (
  input: RequestTailMaintenanceRunnerInput,
): RequestTailMaintenanceRunner => {
  const now = input.now ?? (() => new Date());
  const timeout = input.timeout ?? withTimeout;
  const onError = input.onError ?? (() => undefined);
  let nextTickAtMs = 0;
  let inFlight: Promise<void> | null = null;

  const run = async (): Promise<void> => {
    const currentMs = now().getTime();
    if (currentMs < nextTickAtMs) return;
    nextTickAtMs = currentMs + input.config.minIntervalMs;

    await timeout(
      input.runner.runDueJobs({
        source: "request-tail",
        batchSize: input.config.batchSize,
        maxBatches: input.config.maxBatches,
        budgetMs: input.config.budgetMs,
        leaseMs: input.config.leaseMs,
        claimStatementTimeoutMs: input.config.budgetMs,
      }),
      input.config.budgetMs,
      "Request-tail job tick timed out",
    );
  };

  const kick = (): void => {
    if (inFlight) return;
    inFlight = run()
      .catch(onError)
      .finally(() => {
        inFlight = null;
      });
  };

  return { kick, run };
};
