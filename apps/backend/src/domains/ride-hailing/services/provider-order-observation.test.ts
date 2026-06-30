import { describe, expect, it } from "vitest";
import {
  mapProviderDetailPhaseToExecutionPhase,
  mergeDriverSnapshot,
  observeProviderOrderDetail,
} from "./provider-order-observation";

describe("RideHailing provider order observation", () => {
  it.each([
    { phase: "1", finalAmountFen: null, expected: "DISPATCHING" },
    { phase: "11", finalAmountFen: null, expected: "DISPATCHING" },
    { phase: "DISPATCHING", finalAmountFen: null, expected: "DISPATCHING" },
    { phase: "2", finalAmountFen: null, expected: "ACCEPTED" },
    { phase: "9", finalAmountFen: null, expected: "ACCEPTED" },
    { phase: "ACCEPTED", finalAmountFen: null, expected: "ACCEPTED" },
    { phase: "12", finalAmountFen: null, expected: "ARRIVED_AT_PICKUP" },
    { phase: "ARRIVED_AT_PICKUP", finalAmountFen: null, expected: "ARRIVED_AT_PICKUP" },
    { phase: "3", finalAmountFen: null, expected: "IN_TRIP" },
    { phase: "IN_TRIP", finalAmountFen: null, expected: "IN_TRIP" },
    { phase: "8", finalAmountFen: null, expected: "FINISHED" },
    { phase: "5", finalAmountFen: null, expected: "FINISHED" },
    { phase: "7", finalAmountFen: null, expected: "FINISHED" },
    { phase: "6", finalAmountFen: null, expected: "FINISHED" },
    { phase: "FINISHED", finalAmountFen: null, expected: "FINISHED" },
    { phase: "4", finalAmountFen: null, expected: "CANCELLED" },
    { phase: "10", finalAmountFen: null, expected: "CANCELLED" },
    { phase: "13", finalAmountFen: null, expected: "CANCELLED" },
    { phase: "14", finalAmountFen: null, expected: "CANCELLED" },
    { phase: "20", finalAmountFen: null, expected: "CANCELLED" },
    { phase: "21", finalAmountFen: null, expected: "CANCELLED" },
    { phase: "26", finalAmountFen: null, expected: "CANCELLED" },
    { phase: "27", finalAmountFen: null, expected: "CANCELLED" },
    { phase: "CANCELLED", finalAmountFen: null, expected: "CANCELLED" },
    { phase: "FAILED", finalAmountFen: null, expected: "FAILED" },
  ])("maps provider detail phase $phase into local execution phase $expected", ({
    phase,
    finalAmountFen,
    expected,
  }) => {
    expect(mapProviderDetailPhaseToExecutionPhase({ phase, finalAmountFen })).toBe(expected);
  });

  it("still treats unmapped provider phases with a final amount as finished", () => {
    expect(mapProviderDetailPhaseToExecutionPhase({ phase: "UNKNOWN", finalAmountFen: 4800 })).toBe(
      "FINISHED",
    );
    expect(mapProviderDetailPhaseToExecutionPhase({ phase: "UNKNOWN", finalAmountFen: null })).toBe(
      null,
    );
  });

  it("builds final settlement only from provider detail", () => {
    const observed = observeProviderOrderDetail({
      providerOrderId: "CC-DETAIL-1",
      detail: {
        phase: "FINISHED",
        statusLabel: "待支付",
        finalAmountFen: 4800,
        driver: {
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
    expect(observed.finalSettlementInput).toEqual({
      amountFen: 4800,
      currency: "CNY",
      providerOrderId: "CC-DETAIL-1",
      providerSnapshot: {
        source: "provider-detail",
      },
    });
    expect(observed.driverSnapshot?.driverName).toBe("李师傅");
    expect(observed.vehicleSnapshot?.plate).toBe("浙B99999");
  });

  it("does not erase existing snapshot fields when provider detail is sparse", () => {
    expect(
      mergeDriverSnapshot({
        current: {
          driverName: "张师傅",
          driverPhone: "13800138001",
        },
        observed: {
          driverName: "李师傅",
          driverPhone: null,
        },
      }),
    ).toEqual({
      driverName: "李师傅",
      driverPhone: "13800138001",
    });
  });
});
