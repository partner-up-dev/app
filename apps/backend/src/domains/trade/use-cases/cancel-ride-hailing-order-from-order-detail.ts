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
import { RideHailingProviderSyncQueryError } from "../../ride-hailing/contracts";
import {
  createRideHailingDispatchPort,
  synchronizeRideHailingBeforeCancellation,
} from "../../ride-hailing/ports";
import {
  appendTerminationAttempt,
  approveTerminationAttempt,
  denyTerminationAttempt,
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

async function syncRideHailingOrderBeforeCancellationDecision(input: {
  orderId: TradeOrderId;
  debug?: CommerceOrderDetailDebugContext;
  purpose: "FEE_PREVIEW" | "CANCEL_REQUEST";
}) {
  try {
    await synchronizeRideHailingBeforeCancellation({
      orderId: input.orderId,
      purpose: input.purpose,
      debug: input.debug,
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
}

export async function queryRideHailingCancellationFeeFromOrderDetail(input: {
  orderId: string;
  actorUserId: string;
  debug?: CommerceOrderDetailDebugContext;
}) {
  logCommerceOrderDetailDebug(input.debug, "ride-cancel-fee-preview.start", {
    inputOrderId: input.orderId,
    actorUserId: input.actorUserId,
  });

  const orderRecord = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!orderRecord) {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel-fee-preview.order-not-found", {
      inputOrderId: input.orderId,
      actorUserId: input.actorUserId,
    });
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }
  if (orderRecord.family !== "RIDE_HAILING") {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel-fee-preview.family-mismatch", {
      ...summarizeOrderRecord(orderRecord),
      actorUserId: input.actorUserId,
    });
    return throwHttpProblem({
      status: 409,
      detail: "Only RideHailing orders can use this cancellation flow",
    });
  }
  assertActorMayCancelRideHailingOrder(orderRecord, {
    actorUserId: input.actorUserId,
    authority: "ORDER_CREATOR",
    providerCancelReason: "用户取消订单",
    providerWhoCancel: 1,
    terminationReason: "用户取消订单",
  });
  if (orderRecord.status !== "OPEN" && orderRecord.status !== "INITIATING") {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel-fee-preview.order-status-blocked", {
      ...summarizeOrderRecord(orderRecord),
      actorUserId: input.actorUserId,
    });
    return throwHttpProblem({
      status: 409,
      detail: "Order cannot be cancelled from its current status",
    });
  }

  const initialRideOrder = await rideOrderRepo.findByOrderId(orderRecord.id);
  if (!initialRideOrder) {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel-fee-preview.ride-order-missing", {
      ...summarizeOrderRecord(orderRecord),
    });
    return throwHttpProblem({
      status: 500,
      detail: "RideHailing order facts are missing",
    });
  }

  await syncRideHailingOrderBeforeCancellationDecision({
    orderId: orderRecord.id,
    purpose: "FEE_PREVIEW",
    debug: input.debug,
  });

  const syncedOrderRecord = await tradeOrderRepo.findById(orderRecord.id);
  if (!syncedOrderRecord) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }
  if (syncedOrderRecord.status !== "OPEN") {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel-fee-preview.synced-status-blocked", {
      ...summarizeOrderRecord(syncedOrderRecord),
      actorUserId: input.actorUserId,
    });
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
    logCommerceOrderDetailDebug(input.debug, "ride-cancel-fee-preview.phase-blocked", {
      ...summarizeOrderRecord(syncedOrderRecord),
      ...summarizeRideOrder(syncedRideOrder),
      actorUserId: input.actorUserId,
    });
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing order cannot be cancelled from its current phase",
    });
  }

  const dispatchBinding = syncedRideOrder.dispatchBinding;
  if (!dispatchBinding?.providerOrderId) {
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing order is missing dispatch binding",
    });
  }

  const providerInstance = await providerRepo.findById(
    dispatchBinding.providerInstanceId as RideHailingProviderInstanceId,
  );
  if (!providerInstance || providerInstance.status !== "ACTIVE") {
    return throwHttpProblem({
      status: 404,
      detail: "RideHailing provider instance not found",
    });
  }

  const port = createRideHailingDispatchPort({ providerInstance });
  logCommerceOrderDetailDebug(input.debug, "ride-cancel-fee-preview.provider-request.start", {
    ...summarizeOrderRecord(syncedOrderRecord),
    ...summarizeRideOrder(syncedRideOrder),
    providerInstanceId: dispatchBinding.providerInstanceId,
    providerOrderId: dispatchBinding.providerOrderId,
  });

  try {
    const preview = await port.queryCancelFee({
      providerOrderId: dispatchBinding.providerOrderId,
    });
    logCommerceOrderDetailDebug(input.debug, "ride-cancel-fee-preview.provider-request.success", {
      ...summarizeOrderRecord(syncedOrderRecord),
      ...summarizeRideOrder(syncedRideOrder),
      providerInstanceId: dispatchBinding.providerInstanceId,
      providerOrderId: dispatchBinding.providerOrderId,
      cancelFeeFen: preview.cancelFeeFen,
    });

    return {
      orderId: syncedOrderRecord.id,
      cancelFeeFen: preview.cancelFeeFen,
      currency: "CNY" as const,
    };
  } catch (error) {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel-fee-preview.provider-request.error", {
      ...summarizeOrderRecord(syncedOrderRecord),
      ...summarizeRideOrder(syncedRideOrder),
      providerInstanceId: dispatchBinding.providerInstanceId,
      providerOrderId: dispatchBinding.providerOrderId,
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack ?? null,
            }
          : error,
    });
    return throwHttpProblem({
      status: 503,
      detail: "RideHailing cancellation fee query failed",
      code: "RIDE_HAILING_CANCELLATION_FEE_QUERY_FAILED",
    });
  }
}

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
    await synchronizeRideHailingBeforeCancellation({
      orderId: orderRecord.id,
      purpose: "CANCEL_REQUEST",
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

  const dispatchBinding = syncedRideOrder.dispatchBinding;
  if (!dispatchBinding?.providerOrderId) {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.binding-missing", {
      ...summarizeOrderRecord(syncedOrderRecord),
      ...summarizeRideOrder(syncedRideOrder),
      providerInstanceId: dispatchBinding?.providerInstanceId ?? null,
      providerOrderId: dispatchBinding?.providerOrderId ?? null,
    });
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing order is missing dispatch binding",
    });
  }

  logCommerceOrderDetailDebug(input.debug, "ride-cancel.binding-loaded", {
    ...summarizeOrderRecord(syncedOrderRecord),
    ...summarizeRideOrder(syncedRideOrder),
    providerInstanceId: dispatchBinding.providerInstanceId,
    providerOrderId: dispatchBinding.providerOrderId,
  });

  const providerInstance = await providerRepo.findById(
    dispatchBinding.providerInstanceId as RideHailingProviderInstanceId,
  );
  if (!providerInstance || providerInstance.status !== "ACTIVE") {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.provider-missing", {
      ...summarizeOrderRecord(syncedOrderRecord),
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

  const port = createRideHailingDispatchPort({ providerInstance });
  const claim = await db.transaction(async (tx) => {
    const transactionalTradeOrderRepo = new TradeOrderRepository(tx);
    const transactionalRideOrderRepo = new RideHailingOrderRepository(tx);

    // Every cancellation/callback/reconciliation transaction locks Trade first, then Ride.
    const currentOrderRecord = await transactionalTradeOrderRepo.findByIdForUpdate(orderRecord.id);
    if (!currentOrderRecord) {
      logCommerceOrderDetailDebug(input.debug, "ride-cancel.claim.order-missing", {
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
      logCommerceOrderDetailDebug(input.debug, "ride-cancel.claim.order-status-blocked", {
        ...summarizeOrderRecord(currentOrderRecord),
      });
      return throwHttpProblem({
        status: 409,
        detail: "Order cannot be cancelled from its current status",
      });
    }

    const currentRideOrder = await transactionalRideOrderRepo.findByOrderIdForUpdate(
      currentOrderRecord.id,
    );
    if (!currentRideOrder) {
      logCommerceOrderDetailDebug(input.debug, "ride-cancel.claim.ride-order-missing", {
        ...summarizeOrderRecord(currentOrderRecord),
      });
      return throwHttpProblem({
        status: 500,
        detail: "RideHailing order facts are missing",
      });
    }
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.claim.ride-order", {
      ...summarizeOrderRecord(currentOrderRecord),
      ...summarizeRideOrder(currentRideOrder),
    });
    if (!isCancellableRideHailingExecutionPhase(currentRideOrder.executionPhase)) {
      logCommerceOrderDetailDebug(input.debug, "ride-cancel.claim.phase-blocked", {
        ...summarizeOrderRecord(currentOrderRecord),
        ...summarizeRideOrder(currentRideOrder),
      });
      return throwHttpProblem({
        status: 409,
        detail: "RideHailing order cannot be cancelled from its current phase",
      });
    }
    if (!currentRideOrder.dispatchBinding?.providerOrderId) {
      return throwHttpProblem({
        status: 409,
        detail: "RideHailing order is missing dispatch binding",
      });
    }
    if (
      currentOrderRecord.terminationAttempts.some(
        (attempt) => attempt.status === "PENDING" || attempt.status === "APPROVED",
      )
    ) {
      return throwHttpProblem({
        status: 409,
        detail: "RideHailing cancellation is already in progress",
        code: "RIDE_HAILING_CANCELLATION_IN_PROGRESS",
      });
    }

    const order = toTradeOrderModel(currentOrderRecord);
    const attemptId = createAttemptId();
    const requestedAt = new Date().toISOString();
    const appended = appendTerminationAttempt(order, {
      attemptId,
      requestedAt,
      requestedBy: input.actor.actorUserId as UserId,
    });
    const resolving = markTerminationAttemptResolving(
      appended,
      attemptId,
      "RIDE_HAILING_FULFILLMENT",
    );
    const persisted = await transactionalTradeOrderRepo.applyTerminationState({
      id: order.id as TradeOrderId,
      status: resolving.status,
      terminationAttempts: resolving.terminationAttempts,
    });
    if (!persisted) {
      return throwHttpProblem({
        status: 500,
        detail: "Failed to persist RideHailing cancellation claim",
      });
    }

    logCommerceOrderDetailDebug(input.debug, "ride-cancel.claim.persisted", {
      ...summarizeOrderRecord(currentOrderRecord),
      ...summarizeRideOrder(currentRideOrder),
      attemptId,
      providerOrderId: currentRideOrder.dispatchBinding.providerOrderId,
    });
    return {
      attemptId,
      providerOrderId: currentRideOrder.dispatchBinding.providerOrderId,
    };
  });

  logCommerceOrderDetailDebug(input.debug, "ride-cancel.provider-request.start", {
    ...summarizeOrderRecord(syncedOrderRecord),
    ...summarizeRideOrder(syncedRideOrder),
    providerInstanceId: dispatchBinding.providerInstanceId,
    providerOrderId: claim.providerOrderId,
    actorAuthority: input.actor.authority,
    providerWhoCancel: input.actor.providerWhoCancel,
    attemptId: claim.attemptId,
  });

  let providerCancellation: Awaited<ReturnType<typeof port.cancelRide>>;
  try {
    providerCancellation = await port.cancelRide({
      providerOrderId: claim.providerOrderId,
      cancelCode: 12,
      cancelReason: input.actor.providerCancelReason,
      whoCancel: input.actor.providerWhoCancel,
    });
  } catch (error) {
    logCommerceOrderDetailDebug(input.debug, "ride-cancel.provider-request.error", {
      ...summarizeOrderRecord(syncedOrderRecord),
      providerInstanceId: dispatchBinding.providerInstanceId,
      providerOrderId: claim.providerOrderId,
      attemptId: claim.attemptId,
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack ?? null,
            }
          : error,
    });
    await db.transaction(async (tx) => {
      const transactionalTradeOrderRepo = new TradeOrderRepository(tx);
      const transactionalRideOrderRepo = new RideHailingOrderRepository(tx);
      const currentOrderRecord = await transactionalTradeOrderRepo.findByIdForUpdate(
        orderRecord.id,
      );
      if (!currentOrderRecord) return;
      await transactionalRideOrderRepo.findByOrderIdForUpdate(orderRecord.id);
      const pendingClaim = currentOrderRecord.terminationAttempts.some(
        (attempt) => attempt.attemptId === claim.attemptId && attempt.status === "PENDING",
      );
      if (!pendingClaim || currentOrderRecord.status !== "OPEN") return;
      const denied = denyTerminationAttempt(toTradeOrderModel(currentOrderRecord), {
        attemptId: claim.attemptId,
        decidedAt: new Date().toISOString(),
        reason: "RideHailing provider cancellation request failed",
      });
      await transactionalTradeOrderRepo.applyTerminationState({
        id: orderRecord.id as TradeOrderId,
        status: denied.status,
        terminationAttempts: denied.terminationAttempts,
      });
    });
    throw error;
  }

  logCommerceOrderDetailDebug(input.debug, "ride-cancel.provider-request.success", {
    ...summarizeOrderRecord(syncedOrderRecord),
    providerInstanceId: dispatchBinding.providerInstanceId,
    providerOrderId: claim.providerOrderId,
    attemptId: claim.attemptId,
    cancelFeeFen: providerCancellation.cancelFeeFen,
  });
  const decidedAt = new Date().toISOString();

  return db.transaction(async (tx) => {
    const transactionalTradeOrderRepo = new TradeOrderRepository(tx);
    const transactionalRideOrderRepo = new RideHailingOrderRepository(tx);

    // Completion uses the same Trade -> Ride lock order and never performs provider I/O.
    const currentOrderRecord = await transactionalTradeOrderRepo.findByIdForUpdate(orderRecord.id);
    if (!currentOrderRecord) {
      return throwHttpProblem({ status: 404, detail: "Order not found" });
    }
    const currentRideOrder = await transactionalRideOrderRepo.findByOrderIdForUpdate(
      orderRecord.id,
    );
    if (!currentRideOrder) {
      return throwHttpProblem({ status: 500, detail: "RideHailing order facts are missing" });
    }

    const existingApproved = currentOrderRecord.terminationAttempts.find(
      (attempt) => attempt.attemptId === claim.attemptId && attempt.status === "APPROVED",
    );
    if (currentOrderRecord.status === "CANCELLED" && existingApproved) {
      const result = {
        orderId: currentOrderRecord.id,
        attemptId: claim.attemptId,
        status: currentOrderRecord.status,
        effectKind: existingApproved.effectKind ?? ("NONE" as const),
        effectAmountFen: existingApproved.effectAmountFen ?? 0,
        refunds: [],
      };
      logCommerceOrderDetailDebug(input.debug, "ride-cancel.tx.idempotent", {
        ...summarizeOrderRecord(currentOrderRecord),
        ...summarizeRideOrder(currentRideOrder),
        attemptId: claim.attemptId,
      });
      return result;
    }

    const pendingClaim = currentOrderRecord.terminationAttempts.some(
      (attempt) => attempt.attemptId === claim.attemptId && attempt.status === "PENDING",
    );
    if (!pendingClaim || currentOrderRecord.status !== "OPEN") {
      return throwHttpProblem({
        status: 409,
        detail: "RideHailing cancellation claim is no longer active",
        code: "RIDE_HAILING_CANCELLATION_CLAIM_STALE",
      });
    }

    const approved = approveTerminationAttempt(toTradeOrderModel(currentOrderRecord), {
      attemptId: claim.attemptId,
      decidedAt,
      reason: input.actor.terminationReason,
      effectKind: providerCancellation.cancelFeeFen > 0 ? "ABORT_FEE" : "NONE",
      effectAmountFen: providerCancellation.cancelFeeFen,
    });

    logCommerceOrderDetailDebug(input.debug, "ride-cancel.tx.termination-approved", {
      ...summarizeOrderRecord(currentOrderRecord),
      ...summarizeRideOrder(currentRideOrder),
      attemptId: claim.attemptId,
      approvedStatus: approved.status,
      effectKind: providerCancellation.cancelFeeFen > 0 ? "ABORT_FEE" : "NONE",
      effectAmountFen: providerCancellation.cancelFeeFen,
    });

    const persisted = await transactionalTradeOrderRepo.applyTerminationState({
      id: orderRecord.id as TradeOrderId,
      status: approved.status,
      terminationAttempts: approved.terminationAttempts,
      closedAt: new Date(),
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
      attemptId: claim.attemptId,
    });

    const updatedRideOrder = await transactionalRideOrderRepo.updateByOrderId(
      orderRecord.id as TradeOrderId,
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
      attemptId: claim.attemptId,
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
      attemptId: claim.attemptId,
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
