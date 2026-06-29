import type {
  RideHailingProviderInstance,
  RideHailingProviderInstanceId,
} from "../../../entities/ride-hailing-provider";
import type { RideHailingOrder } from "../../../entities/ride-hailing-order";
import type { TradeOrder, TradeOrderId } from "../../../entities/trade-order";
import { throwHttpProblem } from "../../../lib/problem-details";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import type { RepositoryExecutor } from "../../../repositories/_executor";
import { getRideHailingChoiceSetItem, getRideHailingProviderBinding } from "../../trade/services";
import type { RideHailingProviderPort } from "../model";
import { createRideHailingProviderPort } from "../services";

export type RideHailingProviderExecutionContext = {
  order: TradeOrder;
  rideOrder: RideHailingOrder;
  providerInstance: RideHailingProviderInstance;
  providerOrderId: string;
  port: RideHailingProviderPort;
};

export async function loadRideHailingProviderExecutionContext(
  input: {
    orderId: TradeOrderId;
    expectedProviderInstanceId?: string | null;
    expectedProviderOrderId?: string | null;
  },
  executor?: RepositoryExecutor,
): Promise<RideHailingProviderExecutionContext> {
  const tradeOrderRepo = new TradeOrderRepository(executor);
  const rideOrderRepo = new RideHailingOrderRepository(executor);
  const providerRepo = new RideHailingProviderInstanceRepository(executor);

  const order = await tradeOrderRepo.findById(input.orderId);
  if (!order || order.family !== "RIDE_HAILING") {
    return throwHttpProblem({
      status: 404,
      detail: "RideHailing order not found",
    });
  }

  const rideOrder = await rideOrderRepo.findByOrderId(input.orderId);
  if (!rideOrder) {
    return throwHttpProblem({
      status: 500,
      detail: "RideHailing order facts are missing",
    });
  }

  const choiceSetItem = getRideHailingChoiceSetItem(order.items);
  const providerBinding = choiceSetItem ? getRideHailingProviderBinding(choiceSetItem) : null;
  if (!providerBinding?.providerOrderId) {
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing order is missing provider binding",
    });
  }

  if (
    input.expectedProviderInstanceId &&
    providerBinding.providerInstanceId !== input.expectedProviderInstanceId
  ) {
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing provider instance does not match local order",
    });
  }

  if (
    input.expectedProviderOrderId &&
    providerBinding.providerOrderId !== input.expectedProviderOrderId
  ) {
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing provider order does not match local order",
    });
  }

  const providerInstance = await providerRepo.findById(
    providerBinding.providerInstanceId as RideHailingProviderInstanceId,
  );
  if (!providerInstance || providerInstance.status !== "ACTIVE") {
    return throwHttpProblem({
      status: 404,
      detail: "RideHailing provider instance not found",
    });
  }

  return {
    order,
    rideOrder,
    providerInstance,
    providerOrderId: providerBinding.providerOrderId,
    port: createRideHailingProviderPort({ providerInstance }),
  };
}
