import { throwHttpProblem } from "../../../lib/problem-details";
import type { TradeOrder, TradeOrderId } from "../../../entities/trade-order";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { RentalOrderRepository } from "../../../repositories/RentalOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { requestRentalCancellationHandling } from "../../fulfillment";
import { confirmRentalBooking } from "../../fulfillment/use-cases/confirm-rental-booking";
import { deriveBillPaymentState } from "../../payment";
import {
  canRequestOrderTermination,
  resolveRentalTerminationPolicy,
  toRentalOrderModel,
} from "../services";
import type {
  OrderItemSnapshot,
  OrderTerminationAttempt,
  RentalRegistrant,
} from "../model";
import { finalizeRentalOrderTermination } from "./finalize-rental-order-termination";
import {
  buildRideHailingDetailProjection,
  type RideHailingOrderDetailProjection,
} from "./ride-hailing-ordering-flow";
import { requestRentalOrderTermination } from "./request-rental-order-termination";

const tradeOrderRepo = new TradeOrderRepository();
const rentalOrderRepo = new RentalOrderRepository();
const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();

export type CommerceOrderDetailProjection = {
  order: {
    id: string;
    family: TradeOrder["family"];
    status: TradeOrder["status"];
    createdBy: string;
    offerId: number;
    items: OrderItemSnapshot[];
    terminationAttempts: OrderTerminationAttempt[];
    serviceStartAt: string | null;
    serviceEndAt: string | null;
    participantCount: number;
    contactPhone: string | null;
    registrants: RentalRegistrant[];
  };
  rideHailing: RideHailingOrderDetailProjection | null;
  bill: {
    id: string;
    status: string;
    currency: "CNY";
    lines: Array<{
      id: string;
      userId: string;
      kind: "CHARGE" | "REFUND";
      amountFen: number;
      label: string;
      description: string | null;
    }>;
  } | null;
  cancellation: {
    canRequest: boolean;
    latestAttempt: OrderTerminationAttempt | null;
  };
  payment: {
    status: "PAID" | "PARTIALLY_PAID" | "UNPAID";
  };
  fulfillment: {
    id: string;
    bookingStatus: string;
    entryGuidance: unknown;
    bookingNote: string | null;
  } | null;
};

export async function getCommerceOrderDetail(input: {
  orderId: string;
  viewerUserId: string | null;
}): Promise<CommerceOrderDetailProjection> {
  if (!input.viewerUserId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }

  const order = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }
  const canView =
    order.createdBy === input.viewerUserId ||
    order.participants.some((participant) => participant.userId === input.viewerUserId);
  if (!canView) {
    return throwHttpProblem({ status: 403, detail: "Order is not accessible" });
  }

  const rideHailingDetail =
    order.family === "RIDE_HAILING"
      ? await buildRideHailingDetailProjection({ order })
      : null;
  const bill = await billRepo.findBySourceOrderId(order.id);
  const billLines = bill ? await billLineRepo.listByBillId(bill.id) : [];
  const paymentState = bill ? deriveBillPaymentState({ lines: billLines }) : null;
  const rentalOrder =
    order.family === "RENTAL"
      ? await rentalOrderRepo.findByOrderId(order.id)
      : null;
  if (order.family === "RENTAL" && !rentalOrder) {
    return throwHttpProblem({
      status: 500,
      detail: "Rental order facts are missing",
    });
  }

  return {
    order: {
      id: order.id,
      family: order.family,
      status: order.status,
      createdBy: order.createdBy,
      offerId: order.offerId,
      items: order.items,
      terminationAttempts: order.terminationAttempts,
      serviceStartAt: rentalOrder?.serviceStartAt.toISOString() ?? null,
      serviceEndAt: rentalOrder?.serviceEndAt.toISOString() ?? null,
      participantCount: order.participants.length,
      contactPhone: rentalOrder?.contactPhone ?? null,
      registrants: rentalOrder?.registrants ?? [],
    },
    rideHailing: rideHailingDetail,
    bill: bill
      ? {
          id: bill.id,
          status: bill.status,
          currency: bill.currency,
          lines: billLines.map((line) => ({
            id: line.id,
            userId: line.userId,
            kind: line.kind,
            amountFen: line.amountFen,
            label: line.label,
            description: line.description,
          })),
        }
      : null,
    cancellation: {
      canRequest: canRequestOrderTermination({
        status: order.status,
        terminationAttempts: order.terminationAttempts,
      }),
      latestAttempt: order.terminationAttempts.at(-1) ?? null,
    },
    payment: {
      status: paymentState?.allChargesPaid
        ? "PAID"
        : paymentState && paymentState.paidChargeFen > 0
          ? "PARTIALLY_PAID"
          : "UNPAID",
    },
    fulfillment: rentalOrder
      ? {
          id: rentalOrder.orderId,
          bookingStatus: rentalOrder.bookingStatus,
          entryGuidance: rentalOrder.entryGuidance,
          bookingNote: rentalOrder.bookingNote,
        }
      : null,
  };
}

export async function cancelRentalOrderFromOrderDetail(input: {
  orderId: string;
  actorUserId: string;
}) {
  const order = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }
  if (order.family !== "RENTAL") {
    return throwHttpProblem({
      status: 409,
      detail: "Only Rental orders can use this cancellation flow",
    });
  }
  if (order.createdBy !== input.actorUserId) {
    return throwHttpProblem({
      status: 403,
      detail: "Only order creator can cancel this order",
    });
  }
  if (order.status !== "OPEN") {
    return throwHttpProblem({
      status: 409,
      detail: "Order cannot be cancelled from its current status",
    });
  }

  const rentalOrderRecord = await rentalOrderRepo.findByOrderId(order.id);
  if (!rentalOrderRecord) {
    return throwHttpProblem({
      status: 500,
      detail: "Rental order facts are missing",
    });
  }
  const rentalOrder = toRentalOrderModel(order, rentalOrderRecord);
  const requestedAt = new Date().toISOString();
  const policyResolution = resolveRentalTerminationPolicy(rentalOrder, {
    attemptId: "preview",
    requestedAt,
  });
  const bill = await billRepo.findBySourceOrderId(order.id);
  const billLines = bill ? await billLineRepo.listByBillId(bill.id) : [];
  const paymentState = deriveBillPaymentState({
    lines: billLines,
  });
  const requiresFulfillmentGate =
    policyResolution.requiresOperatorHandling && paymentState.paidChargeFen > 0;

  const requested = await requestRentalOrderTermination({
    orderId: input.orderId,
    requestedBy: input.actorUserId,
    requestedAt,
    resolutionPath: requiresFulfillmentGate
      ? "RENTAL_FULFILLMENT"
      : "TRADE_LOCAL",
  });

  if (requiresFulfillmentGate) {
    await requestRentalCancellationHandling({
      fulfillmentId: rentalOrderRecord.orderId,
      cancellationNote: "用户取消订单，等待履约处理",
    });

    return {
      orderId: input.orderId,
      attemptId: requested.attemptId,
      status: order.status,
      effectKind: "NONE" as const,
      effectAmountFen: 0,
      refunds: [],
    };
  }

  return finalizeRentalOrderTermination({
    orderId: input.orderId,
    attemptId: requested.attemptId,
    decision: {
      outcome: "APPROVED",
      reason: "用户取消订单",
    },
  });
}

export async function simulateRentalBookingConfirmation(input: {
  orderId: string;
  actorUserId: string;
}) {
  const order = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }
  if (order.createdBy !== input.actorUserId) {
    return throwHttpProblem({
      status: 403,
      detail: "Only order creator can progress fake fulfillment",
    });
  }

  const rentalOrder = await rentalOrderRepo.findByOrderId(order.id);
  if (!rentalOrder) {
    return throwHttpProblem({
      status: 409,
      detail: "Rental order facts are missing",
    });
  }

  return confirmRentalBooking({
    fulfillmentId: rentalOrder.orderId,
    bookingNote: "Phase 3 fake rental booking confirmation",
  });
}
