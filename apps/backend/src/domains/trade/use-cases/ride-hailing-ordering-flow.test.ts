import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";
import type { RideHailingOrder } from "../../../entities/ride-hailing-order";
import type { TradeOrder } from "../../../entities/trade-order";

const findRideOrder = vi.hoisted(() => vi.fn<() => Promise<RideHailingOrder | null>>());
const findProvider = vi.hoisted(() => vi.fn<() => Promise<null>>());

vi.mock("../../../repositories/RideHailingOrderRepository", () => ({
  RideHailingOrderRepository: class {
    findByOrderId = findRideOrder;
  },
}));
vi.mock("../../../repositories/RideHailingProviderInstanceRepository", () => ({
  RideHailingProviderInstanceRepository: class {
    findById = findProvider;
  },
}));
vi.mock("../services", () => ({
  getOrderItemSkuName: () => "曹操出行",
  getRideHailingChoiceSetItem: () => null,
}));

import { buildRideHailingDetailProjection } from "./ride-hailing-ordering-flow";

describe("RideHailing detail projection", () => {
  it("reads only the local Ride snapshot and never invokes a provider", async () => {
    const rideOrder = {
      orderId: "00000000-0000-0000-0000-000000000001",
      routeSnapshot: {
        origin: { name: "起点", latitude: 30, longitude: 120 },
        waypoints: [],
        destination: { name: "终点", latitude: 30.1, longitude: 120.1 },
      },
      departureAt: null,
      riders: [],
      contactPhone: "13800138000",
      executionPhase: "IN_TRIP",
      driverSnapshot: null,
      vehicleSnapshot: null,
      dispatchBinding: {
        providerInstanceId: "provider-1",
        providerOrderId: "provider-order-1",
        externalOrderId: "external-order-1",
        submittedAt: "2031-01-01T00:00:00.000Z",
        submissionMode: "SINGLE_CANDIDATE",
        submittedCandidates: [],
      },
      finalSettlementInput: null,
    } as unknown as RideHailingOrder;
    findRideOrder.mockResolvedValue(rideOrder);

    const projection = await buildRideHailingDetailProjection({
      order: {
        id: rideOrder.orderId,
        family: "RIDE_HAILING",
        status: "OPEN",
        items: [],
      } as unknown as TradeOrder,
    });

    assert.equal(projection.executionPhase, "IN_TRIP");
    assert.equal(projection.provider.providerOrderId, "provider-order-1");
    assert.equal(projection.live, null);
    assert.equal(findProvider.mock.calls.length, 0);
  });
});
