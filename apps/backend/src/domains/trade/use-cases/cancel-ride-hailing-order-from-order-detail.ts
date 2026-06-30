import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import {
  type CommerceOrderDetailDebugContext,
  logCommerceOrderDetailDebug,
} from "../../../lib/commerce-order-detail-debug";
import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
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

type RideHailingCancellationActor = {
  actorUserId: string;
  authority: "ORDER_CREATOR" | "ADMIN";
  providerCancelReason: string;
  providerWhoCancel: 1 | 2;
  terminationReason: string;
};

function createAttemptId(): string {
  return `term_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const summarizeOrderRecord = (
  orderRecord: {
    id: string;
    family: string;
    status: string;
    createdBy: string;
  } | null,
): Record<string, unknown> => ({
  localOrderId: orderRecord?.id ?? null,
  localOrderFamily: orderRecord?.family ?? null,
  localOrderStatus: orderRecord?.status ?? null,
  localOrderCreatedBy: orderRecord?.createdBy ?? null,
});

const summarizeRideOrder = (
  rideOrder: {
    executionPhase: string;
    driverSnapshot: { driverName?: string | null } | null;
    vehicleSnapshot: { plate?: string | null } | null;
  } | null,
): Record<string, unknown> => ({
  rideExecutionPhase: rideOrder?.executionPhase ?? null,
  rideDriverName: rideOrder?.driverSnapshot?.driverName ?? null,
  rideVehiclePlate: rideOrder?.vehicleSnapshot?.plate ?? null,
});

const assertActorMayCancelRideHailingOrder = (
  orderRecord: { createdBy: string },
  actor: RideHailingCancellationActor,
) => {
  if (actor.authority === "ORDER_CREATOR" && orderRecord.createdBy !== actor.actorUserId) {
    return throwHttpProblem({
      status: 403,
      detail: "Only order creator can cancel this order",
    });
  }
};

async function cancelRideHailingOrder(input: {
  orderId: string;
  actor: RideHailingCancellationActor;
  debug?: CommerceOrderDetailDebugContext;
}) {
  logCommerceOrderDetailDebug(input.debug, "ride-cancel.start", {
    inputOrderId: input.orderId,
    actorUserId: input.actor.actorUserId,
    actorAuthority: input.actor.authority,
  });

  const orderRecord = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!orderRecord) {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.order-not-found", {
      inputOrderId: input.orderId,
      actorUserId: input.actor.actorUserId,
    });
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }
  logCommerceOrderDetailDebug(input.debug, "ride-cancel.order-loaded", {
    ...summarizeOrderRecord(orderRecord),
    actorUserId: input.actor.actorUserId,
    actorAuthority: input.actor.authority,
  });
  if (orderRecord.family !== "RIDE_HAILING") {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.family-mismatch", {
      ...summarizeOrderRecord(orderRecord),
      actorUserId: input.actor.actorUserId,
    });
    return throwHttpProblem({
      status: 409,
      detail: "Only RideHailing orders can use this cancellation flow",
    });
  }
  assertActorMayCancelRideHailingOrder(orderRecord, input.actor);
  if (orderRecord.status !== "OPEN" && orderRecord.status !== "INITIATING") {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.order-status-blocked", {
      ...summarizeOrderRecord(orderRecord),
      actorUserId: input.actor.actorUserId,
    });
    return throwHttpProblem({
      status: 409,
      detail: "Order cannot be cancelled from its current status",
    });
  }

  const initialRideOrder = await rideOrderRepo.findByOrderId(orderRecord.id);
  if (!initialRideOrder) {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.initial-ride-order-missing", {
      ...summarizeOrderRecord(orderRecord),
    });
    return throwHttpProblem({
      status: 500,
      detail: "RideHailing order facts are missing",
    });
  }

  logCommerceOrderDetailDebug(input.debug, "ride-cancel.initial-ride-order", {
    ...summarizeOrderRecord(orderRecord),
    ...summarizeRideOrder(initialRideOrder),
  });

  try {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.pre-sync.start", {
      ...summarizeOrderRecord(orderRecord),
      ...summarizeRideOrder(initialRideOrder),
    });
    await syncRideHailingOrderWithProvider({
      orderId: orderRecord.id,
      trigger: "CANCEL_REQUEST",
      debug: input.debug,
    });
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.pre-sync.success", {
      ...summarizeOrderRecord(orderRecord),
    });
  } catch (error) {
    if (error instanceof RideHailingProviderSyncQueryError) {
      logCommerceOrderDetailDebug(input.debug, "ride-cancel.pre-sync.query-error", {
        ...summarizeOrderRecord(orderRecord),
        error:
          error.originalError instanceof Error
            ? {
                message: error.originalError.message,
                name: error.originalError.name,
                stack: error.originalError.stack ?? null,
              }
            : error.originalError,
      });
      return throwHttpProblem({
        status: 503,
        detail: "RideHailing provider detail query failed before cancellation",
        code: "RIDE_HAILING_PROVIDER_DETAIL_QUERY_FAILED",
      });
    }
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.pre-sync.error", {
      ...summarizeOrderRecord(orderRecord),
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack ?? null,
            }
          : error,
    });
    throw error;
  }

  const syncedOrderRecord = await tradeOrderRepo.findById(orderRecord.id);
  if (!syncedOrderRecord) {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.synced-order-missing", {
      localOrderId: orderRecord.id,
    });
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }
  logCommerceOrderDetailDebug(input.debug, "ride-cancel.synced-order", {
    ...summarizeOrderRecord(syncedOrderRecord),
  });
  if (syncedOrderRecord.status !== "OPEN") {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.synced-order-status-blocked", {
      ...summarizeOrderRecord(syncedOrderRecord),
    });
    return throwHttpProblem({
      status: 409,
      detail: "Order cannot be cancelled from its current status",
    });
  }

  const syncedRideOrder = await rideOrderRepo.findByOrderId(orderRecord.id);
  if (!syncedRideOrder) {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.synced-ride-order-missing", {
      ...summarizeOrderRecord(syncedOrderRecord),
    });
    return throwHttpProblem({
      status: 500,
      detail: "RideHailing order facts are missing",
    });
  }
  logCommerceOrderDetailDebug(input.debug, "ride-cancel.synced-ride-order", {
    ...summarizeOrderRecord(syncedOrderRecord),
    ...summarizeRideOrder(syncedRideOrder),
  });
  if (!isCancellableRideHailingExecutionPhase(syncedRideOrder.executionPhase)) {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.synced-phase-blocked", {
      ...summarizeOrderRecord(syncedOrderRecord),
      ...summarizeRideOrder(syncedRideOrder),
    });
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
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.binding-missing", {
      ...summarizeOrderRecord(syncedOrderRecord),
      ...summarizeRideOrder(syncedRideOrder),
      providerInstanceId: providerBinding?.providerInstanceId ?? null,
      providerOrderId: providerBinding?.providerOrderId ?? null,
    });
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing order is missing provider binding",
    });
  }

  logCommerceOrderDetailDebug(input.debug, "ride-cancel.binding-loaded", {
    ...summarizeOrderRecord(syncedOrderRecord),
    ...summarizeRideOrder(syncedRideOrder),
    providerInstanceId: providerBinding.providerInstanceId,
    providerOrderId: providerBinding.providerOrderId,
  });

  const providerInstance = await providerRepo.findById(
    providerBinding.providerInstanceId as RideHailingProviderInstanceId,
  );
  if (!providerInstance || providerInstance.status !== "ACTIVE") {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.provider-missing", {
      ...summarizeOrderRecord(syncedOrderRecord),
      providerInstanceId: providerBinding.providerInstanceId,
      providerOrderId: providerBinding.providerOrderId,
      foundProviderId: providerInstance?.id ?? null,
      foundProviderStatus: providerInstance?.status ?? null,
    });
    return throwHttpProblem({
      status: 404,
      detail: "RideHailing provider instance not found",
    });
  }

  const port = createRideHailingProviderPort({ providerInstance });
  logCommerceOrderDetailDebug(input.debug, "ride-cancel.provider-request.start", {
    ...summarizeOrderRecord(syncedOrderRecord),
    ...summarizeRideOrder(syncedRideOrder),
    providerInstanceId: providerBinding.providerInstanceId,
    providerOrderId: providerBinding.providerOrderId,
    actorAuthority: input.actor.authority,
    providerWhoCancel: input.actor.providerWhoCancel,
  });

  let providerCancellation: Awaited<ReturnType<typeof port.cancelRide>>;
  try {
    providerCancellation = await port.cancelRide({
      providerOrderId: providerBinding.providerOrderId,
      cancelCode: 12,
      cancelReason: input.actor.providerCancelReason,
      whoCancel: input.actor.providerWhoCancel,
    });
  } catch (error) {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.provider-request.error", {
      ...summarizeOrderRecord(syncedOrderRecord),
      providerInstanceId: providerBinding.providerInstanceId,
      providerOrderId: providerBinding.providerOrderId,
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack ?? null,
            }
          : error,
    });
    throw error;
  }

  logCommerceOrderDetailDebug(input.debug, "ride-cancel.provider-request.success", {
    ...summarizeOrderRecord(syncedOrderRecord),
    providerInstanceId: providerBinding.providerInstanceId,
    providerOrderId: providerBinding.providerOrderId,
    cancelFeeFen: providerCancellation.cancelFeeFen,
  });
  const decidedAt = new Date().toISOString();

  return db.transaction(async (tx) => {
    const transactionalTradeOrderRepo = new TradeOrderRepository(tx);
    const transactionalRideOrderRepo = new RideHailingOrderRepository(tx);

    const currentOrderRecord = await transactionalTradeOrderRepo.findById(orderRecord.id);
    if (!currentOrderRecord) {
      logCommerceOrderDetailDebug(input.debug, "ride-cancel.tx.order-missing", {
        localOrderId: orderRecord.id,
      });
      return throwHttpProblem({ status: 404, detail: "Order not found" });
    }
    if (currentOrderRecord.family !== "RIDE_HAILING") {
      logCommerceOrderDetailDebug(input.debug, "ride-cancel.tx.family-mismatch", {
        ...summarizeOrderRecord(currentOrderRecord),
      });
      return throwHttpProblem({
        status: 409,
        detail: "Only RideHailing orders can use this cancellation flow",
      });
    }
    assertActorMayCancelRideHailingOrder(currentOrderRecord, input.actor);
    if (currentOrderRecord.status !== "OPEN") {
      logCommerceOrderDetailDebug(input.debug, "ride-cancel.tx.order-status-blocked", {
        ...summarizeOrderRecord(currentOrderRecord),
      });
      return throwHttpProblem({
        status: 409,
        detail: "Order cannot be cancelled from its current status",
      });
    }

    const currentRideOrder = await transactionalRideOrderRepo.findByOrderId(currentOrderRecord.id);
    if (!currentRideOrder) {
      logCommerceOrderDetailDebug(input.debug, "ride-cancel.tx.ride-order-missing", {
        ...summarizeOrderRecord(currentOrderRecord),
      });
      return throwHttpProblem({
        status: 500,
        detail: "RideHailing order facts are missing",
      });
    }
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.tx.ride-order", {
      ...summarizeOrderRecord(currentOrderRecord),
      ...summarizeRideOrder(currentRideOrder),
    });
    if (!isCancellableRideHailingExecutionPhase(currentRideOrder.executionPhase)) {
      logCommerceOrderDetailDebug(input.debug, "ride-cancel.tx.phase-blocked", {
        ...summarizeOrderRecord(currentOrderRecord),
        ...summarizeRideOrder(currentRideOrder),
      });
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
      requestedBy: input.actor.actorUserId as UserId,
    });
    const resolving = markTerminationAttemptResolving(
      appended,
      attemptId,
      "RIDE_HAILING_FULFILLMENT",
    );
    const approved = approveTerminationAttempt(resolving, {
      attemptId,
      decidedAt,
      reason: input.actor.terminationReason,
      effectKind: providerCancellation.cancelFeeFen > 0 ? "ABORT_FEE" : "NONE",
      effectAmountFen: providerCancellation.cancelFeeFen,
    });

    logCommerceOrderDetailDebug(input.debug, "ride-cancel.tx.termination-approved", {
      ...summarizeOrderRecord(currentOrderRecord),
      ...summarizeRideOrder(currentRideOrder),
      attemptId,
      approvedStatus: approved.status,
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

    logCommerceOrderDetailDebug(input.debug, "ride-cancel.tx.order-persisted", {
      localOrderId: persisted.id,
      persistedOrderStatus: persisted.status,
      attemptId,
    });

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

    const result = {
      orderId: persisted.id,
      attemptId,
      status: persisted.status,
      effectKind:
        providerCancellation.cancelFeeFen > 0 ? ("ABORT_FEE" as const) : ("NONE" as const),
      effectAmountFen: providerCancellation.cancelFeeFen,
      refunds: [],
    };

    logCommerceOrderDetailDebug(input.debug, "ride-cancel.tx.complete", {
      localOrderId: persisted.id,
      persistedOrderStatus: persisted.status,
      persistedRideExecutionPhase: updatedRideOrder.executionPhase,
      attemptId,
      effectKind: result.effectKind,
      effectAmountFen: result.effectAmountFen,
    });

    return result;
  });
}

export async function cancelRideHailingOrderFromOrderDetail(input: {
  orderId: string;
  actorUserId: string;
  debug?: CommerceOrderDetailDebugContext;
}) {
  return cancelRideHailingOrder({
    orderId: input.orderId,
    actor: {
      actorUserId: input.actorUserId,
      authority: "ORDER_CREATOR",
      providerCancelReason: "用户取消订单",
      providerWhoCancel: 1,
      terminationReason: "用户取消订单",
    },
    debug: input.debug,
  });
}

export async function cancelRideHailingOrderFromAdmin(input: {
  orderId: string;
  actorUserId: string;
  debug?: CommerceOrderDetailDebugContext;
}) {
  return cancelRideHailingOrder({
    orderId: input.orderId,
    actor: {
      actorUserId: input.actorUserId,
      authority: "ADMIN",
      providerCancelReason: "管理员取消订单",
      providerWhoCancel: 2,
      terminationReason: "管理员取消订单",
    },
    debug: input.debug,
  });
}
