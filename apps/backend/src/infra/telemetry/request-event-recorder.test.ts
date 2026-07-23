import { Hono } from "hono";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { journeyContextMiddleware } from "./request-journey-context";
import { recordUserTelemetryEventForRequest } from "./request-event-recorder";
import { ingestUserTelemetryEvents } from "./user-ingest.service";

vi.mock("./user-ingest.service", () => ({
  ingestUserTelemetryEvents: vi.fn<typeof ingestUserTelemetryEvents>(),
}));

const ingestMock = vi.mocked(ingestUserTelemetryEvents);
const journeyId = "8e1a5720-cb91-4bb0-ae03-3c490f0a69a0";

const requestRecorderApp = new Hono().use("*", journeyContextMiddleware).get("/", async (c) =>
  c.json(
    await recordUserTelemetryEventForRequest(c, {
      eventName: "pr.joined",
      payload: { pr_id: 42, result_status: "success" },
    }),
  ),
);

describe("request telemetry recorder", () => {
  beforeEach(() => {
    ingestMock.mockReset();
  });

  test("returns a passive missing-journey outcome", async () => {
    const response = await requestRecorderApp.request("http://localhost/");
    expect(await response.json()).toEqual({ outcome: "missing_journey" });
    expect(ingestMock).not.toHaveBeenCalled();
  });

  test.each([
    ["accepted", { total: 1, accepted: 1, rejected: 0, idempotent: 0 }],
    ["rejected", { total: 1, accepted: 0, rejected: 1, idempotent: 0 }],
    ["idempotent", { total: 1, accepted: 0, rejected: 0, idempotent: 1 }],
  ] as const)("maps the ingest %s outcome", async (outcome, result) => {
    ingestMock.mockResolvedValue(result);
    const response = await requestRecorderApp.request("http://localhost/", {
      headers: { "x-journey-id": journeyId },
    });

    expect(await response.json()).toMatchObject({ outcome });
    expect(ingestMock).toHaveBeenCalledOnce();
    expect(ingestMock.mock.calls[0]?.[0]?.[0]?.event_version).toBe(1);
  });

  test("contains telemetry storage failure without throwing or logging", async () => {
    ingestMock.mockRejectedValue(new Error("trigger failure"));
    const response = await requestRecorderApp.request("http://localhost/", {
      headers: { "x-journey-id": journeyId },
    });

    expect(await response.json()).toEqual({
      outcome: "unavailable",
      reason: "telemetry_failure",
    });
  });
});
