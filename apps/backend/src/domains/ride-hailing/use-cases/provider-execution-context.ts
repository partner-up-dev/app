import type {
  RideHailingProviderInstance,
  RideHailingProviderInstanceId,
} from "../../../entities/ride-hailing-provider";
import type { TradeOrderId } from "../../../entities/trade-order";
import { throwHttpProblem } from "../../../lib/problem-details";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import type { RideHailingProviderPort } from "../model";
import { createRideHailingProviderPort } from "../services";

export type RideHailingProviderExecutionContext = {
  orderId: TradeOrderId;
  providerInstance: RideHailingProviderInstance;
  providerOrderId: string;
  port: RideHailingProviderPort;
};

export async function loadRideHailingProviderExecutionContext(input: {
  orderId: TradeOrderId;
  expectedProviderInstanceId?: string | null;
  expectedProviderOrderId?: string | null;
}): Promise<RideHailingProviderExecutionContext> {
  const rideOrderRepo = new RideHailingOrderRepository();
  const providerRepo = new RideHailingProviderInstanceRepository();

  const rideOrder = await rideOrderRepo.findByOrderId(input.orderId);
  if (!rideOrder) {
    return throwHttpProblem({
      status: 404,
      detail: "RideHailing order not found",
      code: "RIDE_HAILING_ORDER_NOT_FOUND",
    });
  }

  const dispatchBinding = rideOrder.dispatchBinding;
  if (!dispatchBinding?.providerOrderId) {
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing order is missing dispatch binding",
      code: "RIDE_HAILING_PROVIDER_BINDING_MISSING",
    });
  }

  if (
    input.expectedProviderInstanceId &&
    dispatchBinding.providerInstanceId !== input.expectedProviderInstanceId
  ) {
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing provider instance does not match local order",
    });
  }

  if (
    input.expectedProviderOrderId &&
    dispatchBinding.providerOrderId !== input.expectedProviderOrderId
  ) {
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing provider order does not match local order",
    });
  }

  const providerInstance = await providerRepo.findById(
    dispatchBinding.providerInstanceId as RideHailingProviderInstanceId,
  );
  if (!providerInstance || providerInstance.status !== "ACTIVE") {
    return throwHttpProblem({
      status: 404,
      detail: "RideHailing provider instance not found",
      code: "RIDE_HAILING_PROVIDER_INSTANCE_NOT_FOUND",
    });
  }

  const context = {
    orderId: input.orderId,
    providerInstance,
    providerOrderId: dispatchBinding.providerOrderId,
    port: createRideHailingProviderPort({ providerInstance }),
  };

  return context;
}
