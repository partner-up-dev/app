import { describe, expect, it } from "vitest";
import {
  mapProviderDetailPhaseToExecutionPhase,
  mergeDriverSnapshot,
  observeProviderOrderDetail,
} from "./provider-order-observation";

describe("RideHailing provider order observation", () => {
  it("maps provider detail phase into local execution phase", () => {
    expect(mapProviderDetailPhaseToExecutionPhase({ phase: "9", finalAmountFen: null })).toBe(
      "ACCEPTED",
    );
    expect(mapProviderDetailPhaseToExecutionPhase({ phase: "12", finalAmountFen: null })).toBe(
      "ARRIVED_AT_PICKUP",
    );
    expect(mapProviderDetailPhaseToExecutionPhase({ phase: "3", finalAmountFen: null })).toBe(
      "IN_TRIP",
    );
    expect(
      mapProviderDetailPhaseToExecutionPhase({ phase: "FINISHED", finalAmountFen: null }),
    ).toBe("FINISHED");
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
