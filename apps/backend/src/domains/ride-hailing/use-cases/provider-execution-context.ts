import type { RideHailingOrder } from "../../../entities/ride-hailing-order";
import type {
  RideHailingProviderInstance,
  RideHailingProviderInstanceId,
} from "../../../entities/ride-hailing-provider";
import type { TradeOrderId } from "../../../entities/trade-order";
import {
  type CommerceOrderDetailDebugContext,
  logCommerceOrderDetailDebug,
} from "../../../lib/commerce-order-detail-debug";
import { throwHttpProblem } from "../../../lib/problem-details";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import type { RideHailingProviderPort } from "../model";
import { createRideHailingProviderPort } from "../services";

export type RideHailingProviderExecutionContext = {
  orderId: TradeOrderId;
  executionPhase: RideHailingOrder["executionPhase"];
  driverSnapshot: RideHailingOrder["driverSnapshot"];
  vehicleSnapshot: RideHailingOrder["vehicleSnapshot"];
  finalSettlementAlreadyCommitted: boolean;
  providerInstance: RideHailingProviderInstance;
  providerOrderId: string;
  port: RideHailingProviderPort;
};

const summarizeExecutionContext = (
  context: Pick<
    RideHailingProviderExecutionContext,
    | "orderId"
    | "executionPhase"
    | "driverSnapshot"
    | "vehicleSnapshot"
    | "finalSettlementAlreadyCommitted"
    | "providerInstance"
    | "providerOrderId"
  >,
): Record<string, unknown> => ({
  localOrderId: context.orderId,
  rideExecutionPhase: context.executionPhase,
  rideFinalSettlementCommitted: context.finalSettlementAlreadyCommitted,
  providerInstanceId: context.providerInstance.id,
  providerInstanceStatus: context.providerInstance.status,
  providerOrderId: context.providerOrderId,
});

export async function loadRideHailingProviderExecutionContext(input: {
  orderId: TradeOrderId;
  expectedProviderInstanceId?: string | null;
  expectedProviderOrderId?: string | null;
  debug?: CommerceOrderDetailDebugContext;
}): Promise<RideHailingProviderExecutionContext> {
  logCommerceOrderDetailDebug(input.debug, "ride-provider-context.start", {
    inputOrderId: input.orderId,
    expectedProviderInstanceId: input.expectedProviderInstanceId ?? null,
    expectedProviderOrderId: input.expectedProviderOrderId ?? null,
  });

  const rideOrderRepo = new RideHailingOrderRepository();
  const providerRepo = new RideHailingProviderInstanceRepository();

  const rideOrder = await rideOrderRepo.findByOrderId(input.orderId);
  if (!rideOrder) {
    logCommerceOrderDetailDebug(input.debug, "ride-provider-context.ride-order-missing", {
      inputOrderId: input.orderId,
    });
    return throwHttpProblem({
      status: 404,
      detail: "RideHailing order not found",
      code: "RIDE_HAILING_ORDER_NOT_FOUND",
    });
  }

  const dispatchBinding = rideOrder.dispatchBinding;
  if (!dispatchBinding?.providerOrderId) {
    logCommerceOrderDetailDebug(input.debug, "ride-provider-context.binding-missing", {
      localOrderId: input.orderId,
      rideExecutionPhase: rideOrder.executionPhase,
      providerInstanceId: dispatchBinding?.providerInstanceId ?? null,
      providerOrderId: dispatchBinding?.providerOrderId ?? null,
    });
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
    logCommerceOrderDetailDebug(input.debug, "ride-provider-context.instance-mismatch", {
      localOrderId: input.orderId,
      expectedProviderInstanceId: input.expectedProviderInstanceId,
      actualProviderInstanceId: dispatchBinding.providerInstanceId,
      providerOrderId: dispatchBinding.providerOrderId,
    });
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing provider instance does not match local order",
    });
  }

  if (
    input.expectedProviderOrderId &&
    dispatchBinding.providerOrderId !== input.expectedProviderOrderId
  ) {
    logCommerceOrderDetailDebug(input.debug, "ride-provider-context.order-mismatch", {
      localOrderId: input.orderId,
      providerInstanceId: dispatchBinding.providerInstanceId,
      expectedProviderOrderId: input.expectedProviderOrderId,
      actualProviderOrderId: dispatchBinding.providerOrderId,
    });
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing provider order does not match local order",
    });
  }

  const providerInstance = await providerRepo.findById(
    dispatchBinding.providerInstanceId as RideHailingProviderInstanceId,
  );
  if (!providerInstance || providerInstance.status !== "ACTIVE") {
    logCommerceOrderDetailDebug(input.debug, "ride-provider-context.provider-missing", {
      localOrderId: input.orderId,
      providerInstanceId: dispatchBinding.providerInstanceId,
      providerOrderId: dispatchBinding.providerOrderId,
      foundProviderId: providerInstance?.id ?? null,
      foundProviderStatus: providerInstance?.status ?? null,
    });
    return throwHttpProblem({
      status: 404,
      detail: "RideHailing provider instance not found",
      code: "RIDE_HAILING_PROVIDER_INSTANCE_NOT_FOUND",
    });
  }

  const context = {
    orderId: input.orderId,
    executionPhase: rideOrder.executionPhase,
    driverSnapshot: rideOrder.driverSnapshot,
    vehicleSnapshot: rideOrder.vehicleSnapshot,
    finalSettlementAlreadyCommitted: rideOrder.finalSettlementInput !== null,
    providerInstance,
    providerOrderId: dispatchBinding.providerOrderId,
    port: createRideHailingProviderPort({ providerInstance }),
  };

  logCommerceOrderDetailDebug(
    input.debug,
    "ride-provider-context.complete",
    summarizeExecutionContext(context),
  );

  return context;
}
