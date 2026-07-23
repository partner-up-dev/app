import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
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
  purpose: "FEE_PREVIEW" | "CANCEL_REQUEST";
}) {
  try {
    await synchronizeRideHailingBeforeCancellation({
      orderId: input.orderId,
      purpose: input.purpose,
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
  assertActorMayCancelRideHailingOrder(orderRecord, {
    actorUserId: input.actorUserId,
    authority: "ORDER_CREATOR",
    providerCancelReason: "用户取消订单",
    providerWhoCancel: 1,
    terminationReason: "用户取消订单",
  });
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

  await syncRideHailingOrderBeforeCancellationDecision({
    orderId: orderRecord.id,
    purpose: "FEE_PREVIEW",
  });

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

  try {
    const preview = await port.queryCancelFee({
      providerOrderId: dispatchBinding.providerOrderId,
    });

    return {
      orderId: syncedOrderRecord.id,
      cancelFeeFen: preview.cancelFeeFen,
      currency: "CNY" as const,
    };
  } catch {
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
  assertActorMayCancelRideHailingOrder(orderRecord, input.actor);
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
    await synchronizeRideHailingBeforeCancellation({
      orderId: orderRecord.id,
      purpose: "CANCEL_REQUEST",
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
  const claim = await db.transaction(async (tx) => {
    const transactionalTradeOrderRepo = new TradeOrderRepository(tx);
    const transactionalRideOrderRepo = new RideHailingOrderRepository(tx);

    // Every cancellation/callback/reconciliation transaction locks Trade first, then Ride.
    const currentOrderRecord = await transactionalTradeOrderRepo.findByIdForUpdate(orderRecord.id);
    if (!currentOrderRecord) {
      return throwHttpProblem({ status: 404, detail: "Order not found" });
    }
    if (currentOrderRecord.family !== "RIDE_HAILING") {
      return throwHttpProblem({
        status: 409,
        detail: "Only RideHailing orders can use this cancellation flow",
      });
    }
    assertActorMayCancelRideHailingOrder(currentOrderRecord, input.actor);
    if (currentOrderRecord.status !== "OPEN") {
      return throwHttpProblem({
        status: 409,
        detail: "Order cannot be cancelled from its current status",
      });
    }

    const currentRideOrder = await transactionalRideOrderRepo.findByOrderIdForUpdate(
      currentOrderRecord.id,
    );
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

    return {
      attemptId,
      providerOrderId: currentRideOrder.dispatchBinding.providerOrderId,
    };
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

    return result;
  });
}

export async function cancelRideHailingOrderFromOrderDetail(input: {
  orderId: string;
  actorUserId: string;
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
  });
}

export async function cancelRideHailingOrderFromAdmin(input: {
  orderId: string;
  actorUserId: string;
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
  });
}
