import { describe, expect, it } from "vitest";
import {
  mapProviderDetailPhaseToExecutionPhase,
  mergeDriverSnapshot,
  observeProviderOrderDetail,
  reconcileRideHailingExecutionPhase,
} from "./provider-order-observation";

describe("RideHailing provider order observation", () => {
  it.each([
    { phase: "1", expected: "DISPATCHING" },
    { phase: "11", expected: "DISPATCHING" },
    { phase: "DISPATCHING", expected: "DISPATCHING" },
    { phase: "2", expected: "ACCEPTED" },
    { phase: "9", expected: "ACCEPTED" },
    { phase: "ACCEPTED", expected: "ACCEPTED" },
    { phase: "12", expected: "ARRIVED_AT_PICKUP" },
    { phase: "ARRIVED_AT_PICKUP", expected: "ARRIVED_AT_PICKUP" },
    { phase: "3", expected: "IN_TRIP" },
    { phase: "IN_TRIP", expected: "IN_TRIP" },
    { phase: "8", expected: "FINISHED" },
    { phase: "5", expected: "FINISHED" },
    { phase: "7", expected: "FINISHED" },
    { phase: "6", expected: "FINISHED" },
    { phase: "FINISHED", expected: "FINISHED" },
    { phase: "4", expected: "CANCELLED" },
    { phase: "10", expected: "CANCELLED" },
    { phase: "13", expected: "CANCELLED" },
    { phase: "14", expected: "CANCELLED" },
    { phase: "20", expected: "CANCELLED" },
    { phase: "21", expected: "CANCELLED" },
    { phase: "26", expected: "CANCELLED" },
    { phase: "27", expected: "CANCELLED" },
    { phase: "CANCELLED", expected: "CANCELLED" },
    { phase: "FAILED", expected: "FAILED" },
  ])(
    "maps provider detail phase $phase into local execution phase $expected",
    ({ phase, expected }) => {
      expect(mapProviderDetailPhaseToExecutionPhase({ phase })).toBe(expected);
    },
  );

  it("keeps unmapped provider phases unresolved", () => {
    expect(mapProviderDetailPhaseToExecutionPhase({ phase: "UNKNOWN" })).toBe(null);
  });

  it("observes execution and snapshots but does not derive final settlement", () => {
    const observed = observeProviderOrderDetail({
      detail: {
        phase: "FINISHED",
        statusLabel: "待支付",
        driver: {
          driverAvatarUrl: "https://example.test/driver-li.png",
          driverName: "李师傅",
          driverPhone: "13900139000",
        },
        vehicle: {
          plate: "浙B99999",
          brand: "曹操快车",
          color: "蓝色",
        },
        vehicleLocation: null,
        providerSnapshot: {
          source: "provider-detail",
        },
      },
    });

    expect(observed.executionPhase).toBe("FINISHED");
    expect(observed.driverSnapshot?.driverAvatarUrl).toBe("https://example.test/driver-li.png");
    expect(observed.driverSnapshot?.driverName).toBe("李师傅");
    expect(observed.vehicleSnapshot?.plate).toBe("浙B99999");
  });

  it("does not erase existing snapshot fields when provider detail is sparse", () => {
    expect(
      mergeDriverSnapshot({
        current: {
          driverAvatarUrl: "https://example.test/driver-zhang.png",
          driverName: "张师傅",
          driverPhone: "13800138001",
        },
        observed: {
          driverAvatarUrl: null,
          driverName: "李师傅",
          driverPhone: null,
        },
      }),
    ).toEqual({
      driverAvatarUrl: "https://example.test/driver-zhang.png",
      driverName: "李师傅",
      driverPhone: "13800138001",
    });
  });

  it.each([
    {
      current: "INITIATING" as const,
      observed: "ACCEPTED" as const,
      expected: { effectivePhase: "ACCEPTED", reason: "ACTIVE_PHASE_ADVANCED" },
    },
    {
      current: "IN_TRIP" as const,
      observed: "DISPATCHING" as const,
      expected: { effectivePhase: "IN_TRIP", reason: "ACTIVE_PHASE_REGRESSION" },
    },
    {
      current: "ACCEPTED" as const,
      observed: "CANCELLED" as const,
      expected: { effectivePhase: "CANCELLED", reason: "TERMINAL_PHASE_ACCEPTED" },
    },
    {
      current: "FINISHED" as const,
      observed: "IN_TRIP" as const,
      expected: { effectivePhase: "FINISHED", reason: "TERMINAL_PHASE_ALREADY_COMMITTED" },
    },
    {
      current: "CANCELLED" as const,
      observed: "FINISHED" as const,
      expected: { effectivePhase: "CANCELLED", reason: "TERMINAL_PHASE_ALREADY_COMMITTED" },
    },
  ])("reconciles $current with $observed monotonically", ({ current, observed, expected }) => {
    expect(reconcileRideHailingExecutionPhase({ current, observed })).toMatchObject(expected);
  });

  it("keeps the current snapshot when a provider phase is unmapped", () => {
    expect(
      reconcileRideHailingExecutionPhase({
        current: "DISPATCHING",
        observed: null,
      }),
    ).toEqual({
      accepted: false,
      effectivePhase: "DISPATCHING",
      reason: "OBSERVATION_UNMAPPED",
    });
  });
});
