import type { RideHailingOrder } from "../../../entities/ride-hailing-order";
import type {
  RideHailingProviderInstance,
  RideHailingProviderInstanceId,
} from "../../../entities/ride-hailing-provider";
import type { TradeOrder, TradeOrderId } from "../../../entities/trade-order";
import {
  type CommerceOrderDetailDebugContext,
  logCommerceOrderDetailDebug,
} from "../../../lib/commerce-order-detail-debug";
import { throwHttpProblem } from "../../../lib/problem-details";
import type { RepositoryExecutor } from "../../../repositories/_executor";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import type { RideHailingProviderPort } from "../model";
import { createRideHailingProviderPort } from "../services";

export type RideHailingProviderExecutionContext = {
  order: TradeOrder;
  rideOrder: RideHailingOrder;
  providerInstance: RideHailingProviderInstance;
  providerOrderId: string;
  port: RideHailingProviderPort;
};

const summarizeExecutionContext = (
  context: Pick<
    RideHailingProviderExecutionContext,
    "order" | "rideOrder" | "providerInstance" | "providerOrderId"
  >,
): Record<string, unknown> => ({
  localOrderId: context.order.id,
  localOrderStatus: context.order.status,
  localOrderFamily: context.order.family,
  rideExecutionPhase: context.rideOrder.executionPhase,
  rideFinalSettlementCommitted: context.rideOrder.finalSettlementInput !== null,
  providerInstanceId: context.providerInstance.id,
  providerInstanceStatus: context.providerInstance.status,
  providerOrderId: context.providerOrderId,
});

export async function loadRideHailingProviderExecutionContext(
  input: {
    orderId: TradeOrderId;
    expectedProviderInstanceId?: string | null;
    expectedProviderOrderId?: string | null;
    debug?: CommerceOrderDetailDebugContext;
  },
  executor?: RepositoryExecutor,
): Promise<RideHailingProviderExecutionContext> {
  logCommerceOrderDetailDebug(input.debug, "ride-provider-context.start", {
    inputOrderId: input.orderId,
    expectedProviderInstanceId: input.expectedProviderInstanceId ?? null,
    expectedProviderOrderId: input.expectedProviderOrderId ?? null,
    hasExecutor: executor !== undefined,
  });

  const tradeOrderRepo = new TradeOrderRepository(executor);
  const rideOrderRepo = new RideHailingOrderRepository(executor);
  const providerRepo = new RideHailingProviderInstanceRepository(executor);

  const order = await tradeOrderRepo.findById(input.orderId);
  if (!order || order.family !== "RIDE_HAILING") {
    logCommerceOrderDetailDebug(input.debug, "ride-provider-context.order-not-found", {
      inputOrderId: input.orderId,
      foundOrderId: order?.id ?? null,
      foundOrderFamily: order?.family ?? null,
      foundOrderStatus: order?.status ?? null,
    });
    return throwHttpProblem({
      status: 404,
      detail: "RideHailing order not found",
    });
  }

  const rideOrder = await rideOrderRepo.findByOrderId(input.orderId);
  if (!rideOrder) {
    logCommerceOrderDetailDebug(input.debug, "ride-provider-context.ride-order-missing", {
      inputOrderId: input.orderId,
      localOrderId: order.id,
    });
    return throwHttpProblem({
      status: 500,
      detail: "RideHailing order facts are missing",
    });
  }

  const dispatchBinding = rideOrder.dispatchBinding;
  if (!dispatchBinding?.providerOrderId) {
    logCommerceOrderDetailDebug(input.debug, "ride-provider-context.binding-missing", {
      localOrderId: order.id,
      localOrderStatus: order.status,
      rideExecutionPhase: rideOrder.executionPhase,
      providerInstanceId: dispatchBinding?.providerInstanceId ?? null,
      providerOrderId: dispatchBinding?.providerOrderId ?? null,
    });
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing order is missing dispatch binding",
    });
  }

  if (
    input.expectedProviderInstanceId &&
    dispatchBinding.providerInstanceId !== input.expectedProviderInstanceId
  ) {
    logCommerceOrderDetailDebug(input.debug, "ride-provider-context.instance-mismatch", {
      localOrderId: order.id,
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
      localOrderId: order.id,
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
      localOrderId: order.id,
      providerInstanceId: dispatchBinding.providerInstanceId,
      providerOrderId: dispatchBinding.providerOrderId,
      foundProviderId: providerInstance?.id ?? null,
      foundProviderStatus: providerInstance?.status ?? null,
    });
    return throwHttpProblem({
      status: 404,
      detail: "RideHailing provider instance not found",
    });
  }

  const context = {
    order,
    rideOrder,
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
