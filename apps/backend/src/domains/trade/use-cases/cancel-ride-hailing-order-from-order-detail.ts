import { throwHttpProblem } from "../../../lib/problem-details";
import { db } from "../../../lib/db";
import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import {
  createRideHailingProviderPort,
  RideHailingProviderSyncQueryError,
  syncRideHailingOrderWithProvider,
} from "../../ride-hailing";
import {
  appendTerminationAttempt,
  approveTerminationAttempt,
  getRideHailingChoiceSetItem,
  getRideHailingProviderBinding,
  markTerminationAttemptResolving,
  toTradeOrderModel,
} from "../services";

const tradeOrderRepo = new TradeOrderRepository();
const rideOrderRepo = new RideHailingOrderRepository();
const providerRepo = new RideHailingProviderInstanceRepository();

const isCancellableRideHailingExecutionPhase = (phase: string): boolean =>
  phase === "DISPATCHING" || phase === "ACCEPTED" || phase === "ARRIVED_AT_PICKUP";

function createAttemptId(): string {
  return `term_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function cancelRideHailingOrderFromOrderDetail(input: {
  orderId: string;
  actorUserId: string;
}) {
  const orderRecord = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!orderRecord) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }
  if (orderRecord.family !== "RIDE_HAILING") {
    return throwHttpProblem({
      status: 409,
      detail: "Only RideHailing orders can use this cancellation flow",
    });
  }
  if (orderRecord.createdBy !== input.actorUserId) {
    return throwHttpProblem({
      status: 403,
      detail: "Only order creator can cancel this order",
    });
  }
  if (orderRecord.status !== "OPEN" && orderRecord.status !== "INITIATING") {
    return throwHttpProblem({
      status: 409,
      detail: "Order cannot be cancelled from its current status",
    });
  }

  const initialRideOrder = await rideOrderRepo.findByOrderId(orderRecord.id);
  if (!initialRideOrder) {
    return throwHttpProblem({
      status: 500,
      detail: "RideHailing order facts are missing",
    });
  }

  try {
    await syncRideHailingOrderWithProvider({
      orderId: orderRecord.id,
      trigger: "CANCEL_REQUEST",
    });
  } catch (error) {
    if (error instanceof RideHailingProviderSyncQueryError) {
      return throwHttpProblem({
        status: 503,
        detail: "RideHailing provider detail query failed before cancellation",
        code: "RIDE_HAILING_PROVIDER_DETAIL_QUERY_FAILED",
      });
    }
    throw error;
  }

  const syncedOrderRecord = await tradeOrderRepo.findById(orderRecord.id);
  if (!syncedOrderRecord) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }
  if (syncedOrderRecord.status !== "OPEN") {
    return throwHttpProblem({
      status: 409,
      detail: "Order cannot be cancelled from its current status",
    });
  }

  const syncedRideOrder = await rideOrderRepo.findByOrderId(orderRecord.id);
  if (!syncedRideOrder) {
    return throwHttpProblem({
      status: 500,
      detail: "RideHailing order facts are missing",
    });
  }
  if (!isCancellableRideHailingExecutionPhase(syncedRideOrder.executionPhase)) {
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing order cannot be cancelled from its current phase",
    });
  }

  const rideChoiceSetItem = getRideHailingChoiceSetItem(syncedOrderRecord.items);
  const providerBinding = rideChoiceSetItem
    ? getRideHailingProviderBinding(rideChoiceSetItem)
    : null;
  if (!providerBinding?.providerOrderId) {
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing order is missing provider binding",
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

  const port = createRideHailingProviderPort({ providerInstance });
  const providerCancellation = await port.cancelRide({
    providerOrderId: providerBinding.providerOrderId,
    cancelCode: 12,
    cancelReason: "用户取消订单",
    whoCancel: 1,
  });
  const decidedAt = new Date().toISOString();

  return db.transaction(async (tx) => {
    const transactionalTradeOrderRepo = new TradeOrderRepository(tx);
    const transactionalRideOrderRepo = new RideHailingOrderRepository(tx);

    const currentOrderRecord = await transactionalTradeOrderRepo.findById(orderRecord.id);
    if (!currentOrderRecord) {
      return throwHttpProblem({ status: 404, detail: "Order not found" });
    }
    if (currentOrderRecord.family !== "RIDE_HAILING") {
      return throwHttpProblem({
        status: 409,
        detail: "Only RideHailing orders can use this cancellation flow",
      });
    }
    if (currentOrderRecord.createdBy !== input.actorUserId) {
      return throwHttpProblem({
        status: 403,
        detail: "Only order creator can cancel this order",
      });
    }
    if (currentOrderRecord.status !== "OPEN") {
      return throwHttpProblem({
        status: 409,
        detail: "Order cannot be cancelled from its current status",
      });
    }

    const currentRideOrder = await transactionalRideOrderRepo.findByOrderId(currentOrderRecord.id);
    if (!currentRideOrder) {
      return throwHttpProblem({
        status: 500,
        detail: "RideHailing order facts are missing",
      });
    }
    if (!isCancellableRideHailingExecutionPhase(currentRideOrder.executionPhase)) {
      return throwHttpProblem({
        status: 409,
        detail: "RideHailing order cannot be cancelled from its current phase",
      });
    }

    const order = toTradeOrderModel(currentOrderRecord);
    const attemptId = createAttemptId();
    const appended = appendTerminationAttempt(order, {
      attemptId,
      requestedAt: decidedAt,
      requestedBy: input.actorUserId as UserId,
    });
    const resolving = markTerminationAttemptResolving(
      appended,
      attemptId,
      "RIDE_HAILING_FULFILLMENT",
    );
    const approved = approveTerminationAttempt(resolving, {
      attemptId,
      decidedAt,
      reason: "用户取消订单",
      effectKind: providerCancellation.cancelFeeFen > 0 ? "ABORT_FEE" : "NONE",
      effectAmountFen: providerCancellation.cancelFeeFen,
    });

    const persisted = await transactionalTradeOrderRepo.applyTerminationState({
      id: order.id as TradeOrderId,
      status: approved.status,
      terminationAttempts: approved.terminationAttempts,
    });
    if (!persisted) {
      return throwHttpProblem({
        status: 500,
        detail: "Failed to persist approved RideHailing termination",
      });
    }

    const updatedRideOrder = await transactionalRideOrderRepo.updateByOrderId(
      order.id as TradeOrderId,
      {
        executionPhase: "CANCELLED",
      },
    );
    if (!updatedRideOrder) {
      return throwHttpProblem({
        status: 500,
        detail: "Failed to persist RideHailing cancellation state",
      });
    }

    return {
      orderId: persisted.id,
      attemptId,
      status: persisted.status,
      effectKind:
        providerCancellation.cancelFeeFen > 0 ? ("ABORT_FEE" as const) : ("NONE" as const),
      effectAmountFen: providerCancellation.cancelFeeFen,
      refunds: [],
    };
  });
}
