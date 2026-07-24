import { describe, expect, test } from "vitest";
import { userTelemetryEventRegistry } from "./contracts";
import {
  getUserTelemetryEventContract,
  getUserTelemetryEventRegistry,
  resolveActiveUserTelemetryEventContract,
  validateRegisteredUserTelemetryEvent,
} from "./user-event-registry";

describe("user telemetry event registry", () => {
  test("contains unique event name and version pairs", () => {
    const seen = new Set<string>();

    expect(getUserTelemetryEventRegistry()).toBe(userTelemetryEventRegistry);
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
      expect("eventKind" in contract).toBe(false);
    }
  });

  test("accepts registered events and derives registry family", () => {
    const result = validateRegisteredUserTelemetryEvent({
      eventName: "pr.joined",
      eventVersion: 1,
      attributes: { surface: "pr_detail" },
      payload: { pr_id: 123, result_status: "success" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.contract.eventFamily).toBe("pr.joined");
    expect(result.attributes).toEqual({ surface: "pr_detail" });
    expect(result.payload).toEqual({ pr_id: 123, result_status: "success" });
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

  test("governs the exact PR Discovery payload dimensions", () => {
    const accepted = validateRegisteredUserTelemetryEvent({
      eventName: "pr.discovery.candidate.action",
      eventVersion: 1,
      payload: {
        prType: "badminton",
        viewMode: "CARD",
        origin: "PR_DISCOVERY",
        prId: 42,
        action: "JOIN",
      },
    });
    expect(accepted.ok).toBe(true);

    const rejected = validateRegisteredUserTelemetryEvent({
      eventName: "pr.discovery.candidate.action",
      eventVersion: 1,
      payload: {
        prType: "badminton",
        viewMode: "CARD",
        origin: "PR_DISCOVERY",
        prId: 42,
        action: "JOIN",
        unexpectedContextId: 99,
      },
    });
    expect(rejected).toMatchObject({ ok: false, failureCode: "INVALID_PAYLOAD" });
  });

  test("resolves the active registry version for backend emissions", () => {
    expect(resolveActiveUserTelemetryEventContract("pr.created")).toMatchObject({
      eventName: "pr.created",
      eventVersion: 1,
      owner: "backend.pr",
    });
    expect(resolveActiveUserTelemetryEventContract("segment.started")).toBeNull();
  });

  test("rejects payload dimensions outside backend PR result schemas", () => {
    expect(
      validateRegisteredUserTelemetryEvent({
        eventName: "pr.created",
        eventVersion: 1,
        payload: {
          pr_id: 42,
          creation_path: "structured_form",
          status: "OPEN",
          extra: true,
        },
      }),
    ).toMatchObject({ ok: false, failureCode: "INVALID_PAYLOAD" });

    expect(
      validateRegisteredUserTelemetryEvent({
        eventName: "pr.waitlisted",
        eventVersion: 1,
        payload: {
          pr_id: 42,
          result_status: "success",
          alternative_pr_reminder_opt_in: false,
        },
      }).ok,
    ).toBe(true);
  });
});
