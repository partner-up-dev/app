import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { createRequestTailMaintenanceRunner } from "./request-tail-runner";

const config = {
  batchSize: 1,
  maxBatches: 1,
  budgetMs: 80,
  leaseMs: 1_000,
  minIntervalMs: 30_000,
};

describe("request-tail maintenance runner", () => {
  it("enforces the interval and single-flight guards with injected time", async () => {
    let nowMs = 1_000;
    let calls = 0;
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const runner = createRequestTailMaintenanceRunner({
      config,
      now: () => new Date(nowMs),
      runner: {
        runDueJobs: async () => {
          calls += 1;
          await blocked;
          return {
            source: "request-tail" as const,
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
        },
      },
      timeout: async <T>(task: Promise<T>) => task,
    });

    runner.kick();
    runner.kick();
    assert.equal(calls, 1);
    release();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    runner.kick();
    assert.equal(calls, 1);
    nowMs += config.minIntervalMs;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    runner.kick();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    assert.equal(calls, 2);
  });

  it("resets single-flight state after a timeout/error", async () => {
    let calls = 0;
    let errors = 0;
    const runner = createRequestTailMaintenanceRunner({
      config: { ...config, minIntervalMs: 0 },
      runner: {
        runDueJobs: async () => {
          calls += 1;
          throw new Error("injected tick failure");
        },
      },
      timeout: async <T>(task: Promise<T>) => task,
      onError: () => {
        errors += 1;
      },
    });

    runner.kick();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    runner.kick();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    assert.equal(calls, 2);
    assert.equal(errors, 2);
  });
});
