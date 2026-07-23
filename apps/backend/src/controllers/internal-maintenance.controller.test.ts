import assert from "node:assert/strict";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { test, vi } from "vitest";
import type { ExternalMaintenanceTickResult } from "../infra/maintenance/maintenance-runner";

process.env.DATABASE_URL ??= "postgresql://unit:unit@localhost:5432/unit";

const { buildProblemDetailsPayload, ProblemDetailsError } = await import("../lib/problem-details");
const { createInternalMaintenanceRoute } = await import("./internal-maintenance.controller");
const { jobRunner } = await import("../infra/jobs");
const { runExternalMaintenanceTickOrSkip } =
  await import("../infra/maintenance/maintenance-runner");

const mount = (route: ReturnType<typeof createInternalMaintenanceRoute>) =>
  new Hono()
    .onError((error, c) => {
      if (!(error instanceof ProblemDetailsError)) throw error;
      const { payload, contentLanguage } = buildProblemDetailsPayload(
        error,
        c.req.header("accept-language"),
      );
      return c.body(JSON.stringify(payload), error.status as ContentfulStatusCode, {
        "Content-Type": "application/problem+json; charset=utf-8",
        "Content-Language": contentLanguage,
      });
    })
    .route("/internal/maintenance", route);

test("internal maintenance route distinguishes missing configuration and bad credentials", async () => {
  const route = mount(createInternalMaintenanceRoute({ internalToken: null }));
  assert.equal((await route.request("/internal/maintenance/tick", { method: "POST" })).status, 503);

  const configuredRoute = mount(
    createInternalMaintenanceRoute({
      internalToken: "test-internal-token",
      runTick: async () => ({
        source: "external-trigger" as const,
        jobs: null,
        jobsError: null,
        durationMs: 0,
      }),
      readDiagnostics: async () => ({
        asOfIso: "2026-07-23T00:00:00.000Z",
        runner: {
          instanceId: "test",
          running: false,
          registeredJobTypes: [],
          registeredJobTypesTruncated: false,
          lastRunAtIso: null,
          lastSummary: null,
        },
        database: {
          asOfIso: "2026-07-23T00:00:00.000Z",
          activeCount: 0,
          pendingCount: 0,
          retryCount: 0,
          runningCount: 0,
          dueCount: 0,
          expiredLeaseCount: 0,
          failedCount: 0,
          retryExhaustedCount: 0,
          missedCount: 0,
          heldReservationCount: 0,
          oldestDueRunAtIso: null,
          oldestDueLagMs: null,
          oldestLeaseUntilIso: null,
        },
      }),
    }),
  );
  const unauthorized = await configuredRoute.request("/internal/maintenance/tick", {
    method: "POST",
    headers: { "x-internal-token": "wrong" },
  });
  assert.equal(unauthorized.status, 401);

  const authorized = await configuredRoute.request("/internal/maintenance/tick", {
    method: "POST",
    headers: { "x-internal-token": "test-internal-token" },
  });
  assert.equal(authorized.status, 200);
  const authorizedBody = (await authorized.json()) as { source?: string };
  assert.equal(authorizedBody.source, "external-trigger");
});

test("internal maintenance tick returns a single-flight skip while the first tick is running", async () => {
  let entered!: () => void;
  let release!: () => void;
  const enteredPromise = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let inFlight = false;
  let executions = 0;
  const runTick = vi.fn<() => Promise<ExternalMaintenanceTickResult>>(async () => {
    if (inFlight) {
      return {
        source: "external-trigger" as const,
        skipped: true as const,
        skipReason: "IN_FLIGHT" as const,
        durationMs: 0,
      };
    }
    inFlight = true;
    executions += 1;
    entered();
    await gate;
    inFlight = false;
    return {
      source: "external-trigger" as const,
      jobs: null,
      jobsError: null,
      durationMs: 1,
    };
  });
  const route = mount(createInternalMaintenanceRoute({ internalToken: "token", runTick }));

  const first = route.request("/internal/maintenance/tick", {
    method: "POST",
    headers: { "x-internal-token": "token" },
  });
  await enteredPromise;
  const second = await route.request("/internal/maintenance/tick", {
    method: "POST",
    headers: { "x-internal-token": "token" },
  });
  assert.equal(second.status, 200);
  assert.deepEqual(await second.json(), {
    source: "external-trigger",
    skipped: true,
    skipReason: "IN_FLIGHT",
    durationMs: 0,
  });

  release();
  assert.equal((await first).status, 200);
  assert.equal(runTick.mock.calls.length, 2);
  assert.equal(executions, 1);
});

test("external maintenance tick enforces its process-local single-flight guard", async () => {
  let entered!: () => void;
  let release!: () => void;
  const enteredPromise = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const runDueJobs = vi.spyOn(jobRunner, "runDueJobs").mockImplementation(async () => {
    entered();
    await gate;
    return {
      source: "external-trigger" as const,
      claimed: 0,
      succeeded: 0,
      skipped: 0,
      retried: 0,
      failed: 0,
      missed: 0,
      staleCompletions: 0,
      lockSkipped: false,
      durationMs: 1,
    };
  });

  try {
    const first = runExternalMaintenanceTickOrSkip();
    await enteredPromise;
    const second = await runExternalMaintenanceTickOrSkip();
    assert.deepEqual(second, {
      source: "external-trigger",
      skipped: true,
      skipReason: "IN_FLIGHT",
      durationMs: 0,
    });
    release();
    const firstResult = await first;
    assert.ok("jobs" in firstResult);
    assert.equal(firstResult.jobs?.claimed, 0);
    assert.equal(runDueJobs.mock.calls.length, 1);
  } finally {
    release();
    runDueJobs.mockRestore();
  }
});
