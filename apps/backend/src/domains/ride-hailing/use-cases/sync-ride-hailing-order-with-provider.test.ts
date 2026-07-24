import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { RideHailingProviderOrderDetail } from "../model";
import type { RideHailingReconciliationTransactionPort } from "../contracts";

const mocks = vi.hoisted(() => ({
  events: [] as string[],
  loadContext: vi.fn<(...args: unknown[]) => unknown>(),
  observeProviderOrderDetail: vi.fn<(...args: unknown[]) => unknown>(),
  createTransactionPort: vi.fn<() => unknown>(),
  queryOrderDetail: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  queryFinalSettlement: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  queryDriverLocation: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  queryDriverRoute: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  applyProviderObservation: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  commitTerminalSettlement: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  settlePaymentAndScheduleFeeConfirmation: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock("./provider-execution-context", () => ({
  loadRideHailingProviderExecutionContext: mocks.loadContext,
}));

vi.mock("../services/provider-order-observation", () => ({
  observeProviderOrderDetail: mocks.observeProviderOrderDetail,
}));

vi.mock("../adapters/ride-hailing-reconciliation-transaction", () => ({
  createRideHailingReconciliationTransactionPort: mocks.createTransactionPort,
}));

import { syncRideHailingOrderWithProvider } from "./sync-ride-hailing-order-with-provider";
import type { RideHailingProviderExecutionContext } from "./provider-execution-context";

const orderId = "123e4567-e89b-12d3-a456-426614174000" as TradeOrderId;
const providerInstanceId = "00000000-0000-0000-0000-000000000501";
const providerOrderId = "CC-PORT-123";

const providerDetail: RideHailingProviderOrderDetail = {
  phase: "FINISHED",
  statusLabel: "已完成",
  providerVehicleTypeCode: "3",
  providerVehicleTypeName: "曹操快车",
  driver: null,
  vehicle: null,
  vehicleLocation: null,
  providerSnapshot: { source: "test" },
};

const context = (): RideHailingProviderExecutionContext => ({
  orderId,
  providerInstance: {
    id: providerInstanceId,
    providerType: "CAOCAO",
    status: "ACTIVE",
  } as unknown as RideHailingProviderExecutionContext["providerInstance"],
  providerOrderId,
  port: {
    queryOrderDetail: mocks.queryOrderDetail,
    queryFinalSettlement: mocks.queryFinalSettlement,
    queryDriverLocation: mocks.queryDriverLocation,
    queryDriverRoute: mocks.queryDriverRoute,
  } as unknown as RideHailingProviderExecutionContext["port"],
});

const transactionPort = (): RideHailingReconciliationTransactionPort => ({
  applyProviderObservation:
    mocks.applyProviderObservation as RideHailingReconciliationTransactionPort["applyProviderObservation"],
  commitTerminalSettlement:
    mocks.commitTerminalSettlement as RideHailingReconciliationTransactionPort["commitTerminalSettlement"],
  settlePaymentAndScheduleFeeConfirmation:
    mocks.settlePaymentAndScheduleFeeConfirmation as RideHailingReconciliationTransactionPort["settlePaymentAndScheduleFeeConfirmation"],
});

beforeEach(() => {
  mocks.events.length = 0;
  vi.clearAllMocks();
  mocks.loadContext.mockResolvedValue(context());
  mocks.queryOrderDetail.mockImplementation(async () => {
    mocks.events.push("provider detail");
    return providerDetail;
  });
  mocks.queryDriverLocation.mockResolvedValue(null);
  mocks.queryDriverRoute.mockResolvedValue(null);
  mocks.observeProviderOrderDetail.mockImplementation(() => ({
    executionPhase: "ACCEPTED",
    driverSnapshot: null,
    vehicleSnapshot: null,
  }));
  mocks.applyProviderObservation.mockImplementation(async () => {
    mocks.events.push("applyProviderObservation");
    return { mutated: true, effectiveExecutionPhase: "FINISHED" };
  });
  mocks.queryFinalSettlement.mockImplementation(async () => {
    mocks.events.push("queryFinalSettlement");
    return {
      amountFen: 1800,
      currency: "CNY",
      providerOrderId,
      providerSnapshot: { source: "settlement" },
    };
  });
  mocks.commitTerminalSettlement.mockImplementation(async () => {
    mocks.events.push("commitTerminalSettlement");
    return { mutated: true, correctionRequired: null };
  });
  mocks.createTransactionPort.mockReturnValue(transactionPort());
});

describe("syncRideHailingOrderWithProvider reconciliation port orchestration", () => {
  it("queries detail, applies observation, then queries and commits terminal settlement", async () => {
    const result = await syncRideHailingOrderWithProvider({
      orderId,
      trigger: "ORDER_DETAIL_POLL",
    });

    expect(mocks.events).toEqual([
      "provider detail",
      "applyProviderObservation",
      "queryFinalSettlement",
      "commitTerminalSettlement",
    ]);
    expect(result.mutated).toBe(true);
    expect(mocks.applyProviderObservation).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        expectedBinding: { providerInstanceId, providerOrderId },
      }),
    );
    expect(mocks.commitTerminalSettlement).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        expectedBinding: { providerInstanceId, providerOrderId },
      }),
    );
  });

  it("uses the locked effective phase instead of raw observation for settlement query", async () => {
    mocks.observeProviderOrderDetail.mockReturnValue({
      executionPhase: "FINISHED",
      driverSnapshot: null,
      vehicleSnapshot: null,
    });
    mocks.applyProviderObservation.mockImplementation(async () => {
      mocks.events.push("applyProviderObservation");
      return { mutated: true, effectiveExecutionPhase: "ACCEPTED" };
    });

    await syncRideHailingOrderWithProvider({
      orderId,
      trigger: "BROWSER_RECONCILE",
    });

    expect(mocks.events).toEqual(["provider detail", "applyProviderObservation"]);
    expect(mocks.queryFinalSettlement).not.toHaveBeenCalled();
    expect(mocks.commitTerminalSettlement).not.toHaveBeenCalled();
    expect(mocks.queryDriverLocation).toHaveBeenCalledWith({ providerOrderId });
    expect(mocks.queryDriverRoute).toHaveBeenCalledWith({
      providerOrderId,
      routeKind: "PICKUP",
    });
  });
});
