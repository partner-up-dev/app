import { describe, expect, test } from "vitest";
import {
  getUserTelemetryEventContract,
  getUserTelemetryEventRegistry,
  validateRegisteredUserTelemetryEvent,
} from "./user-event-registry";

describe("user telemetry event registry", () => {
  test("contains unique event name and version pairs", () => {
    const seen = new Set<string>();

    for (const contract of getUserTelemetryEventRegistry()) {
      const key = `${contract.eventName}@${contract.eventVersion}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  test("defines governed metadata for every event", () => {
    for (const contract of getUserTelemetryEventRegistry()) {
      expect(contract.eventName).toMatch(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/);
      expect(contract.eventFamily.length).toBeGreaterThan(0);
      expect(contract.eventVersion).toBeGreaterThan(0);
      expect(contract.owner.length).toBeGreaterThan(0);
      expect(contract.trigger.length).toBeGreaterThan(0);
      expect(contract.forbidden.length).toBeGreaterThan(0);
      expect(contract.biUsage.length).toBeGreaterThan(0);
    }
  });

  test("accepts registered events and derives registry family", () => {
    const result = validateRegisteredUserTelemetryEvent({
      eventName: "pr.joined",
      eventVersion: 1,
      attributes: { surface: "pr_detail" },
      payload: { pr_id: 123 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.contract.eventFamily).toBe("pr.joined");
    expect(result.contract.eventKind).toBe("command_result");
    expect(result.attributes).toEqual({ surface: "pr_detail" });
    expect(result.payload).toEqual({ pr_id: 123 });
  });

  test("rejects unknown events", () => {
    const result = validateRegisteredUserTelemetryEvent({
      eventName: "unknown.event",
      eventVersion: 1,
      attributes: {},
      payload: {},
    });

    expect(result).toMatchObject({
      ok: false,
      failureCode: "UNREGISTERED_EVENT",
    });
  });

  test("rejects client-supplied event family mismatches", () => {
    const contract = getUserTelemetryEventContract("journey.started", 1);
    expect(contract?.eventFamily).toBe("journey.lifecycle");

    const result = validateRegisteredUserTelemetryEvent({
      eventName: "journey.started",
      eventVersion: 1,
      eventFamily: "wrong.family",
      attributes: {},
      payload: {},
    });

    expect(result).toMatchObject({
      ok: false,
      failureCode: "EVENT_FAMILY_MISMATCH",
    });
  });
});
