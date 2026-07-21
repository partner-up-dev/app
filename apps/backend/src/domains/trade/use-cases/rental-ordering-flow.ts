import type { TradeOrder, TradeOrderId } from "../../../entities/trade-order";
import {
  type CommerceOrderDetailDebugContext,
  logCommerceOrderDetailDebug,
} from "../../../lib/commerce-order-detail-debug";
import { throwHttpProblem } from "../../../lib/problem-details";
import { throwRentalRuntimeRetired } from "../../../lib/rental-runtime-retirement";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { RentalOrderRepository } from "../../../repositories/RentalOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { deriveBillPaymentState } from "../../bill/queries";
import type { OrderItemSnapshot, OrderTerminationAttempt, RentalRegistrant } from "../model";
import { canRequestOrderTermination } from "../services";
import {
  buildRideHailingDetailProjection,
  type RideHailingOrderDetailProjection,
} from "./ride-hailing-ordering-flow";

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
  debug?: CommerceOrderDetailDebugContext;
}): Promise<CommerceOrderDetailProjection> {
  logCommerceOrderDetailDebug(input.debug, "usecase.order-detail.start", {
    inputOrderId: input.orderId,
    viewerUserId: input.viewerUserId,
  });
  if (!input.viewerUserId) {
    logCommerceOrderDetailDebug(input.debug, "usecase.order-detail.auth-missing", {
      inputOrderId: input.orderId,
    });
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }

  const order = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!order) {
    logCommerceOrderDetailDebug(input.debug, "usecase.order-detail.order-not-found", {
      inputOrderId: input.orderId,
    });
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }
  const canView =
    order.createdBy === input.viewerUserId ||
    order.participants.some((participant) => participant.userId === input.viewerUserId);
  if (!canView) {
    logCommerceOrderDetailDebug(input.debug, "usecase.order-detail.forbidden", {
      inputOrderId: input.orderId,
      localOrderId: order.id,
      localOrderStatus: order.status,
      localOrderFamily: order.family,
      viewerUserId: input.viewerUserId,
    });
    return throwHttpProblem({ status: 403, detail: "Order is not accessible" });
  }

  logCommerceOrderDetailDebug(input.debug, "usecase.order-detail.base-order", {
    localOrderId: order.id,
    localOrderFamily: order.family,
    localOrderStatus: order.status,
    participantCount: order.participants.length,
  });

  const rideHailingDetail =
    order.family === "RIDE_HAILING"
      ? await buildRideHailingDetailProjection({ order, debug: input.debug })
      : null;
  const bill = await billRepo.findBySourceOrderId(order.id);
  const billLines = bill ? await billLineRepo.listByBillId(bill.id) : [];
  const paymentState = bill ? deriveBillPaymentState({ lines: billLines }) : null;
  const rentalOrder =
    order.family === "RENTAL" ? await rentalOrderRepo.findByOrderId(order.id) : null;
  if (order.family === "RENTAL" && !rentalOrder) {
    logCommerceOrderDetailDebug(input.debug, "usecase.order-detail.rental-facts-missing", {
      localOrderId: order.id,
    });
    return throwHttpProblem({
      status: 500,
      detail: "Rental order facts are missing",
    });
  }

  const result: CommerceOrderDetailProjection = {
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

  logCommerceOrderDetailDebug(input.debug, "usecase.order-detail.complete", {
    responseOrderId: result.order.id,
    responseOrderFamily: result.order.family,
    responseOrderStatus: result.order.status,
    responseRideExecutionPhase: result.rideHailing?.executionPhase ?? null,
    responseRideProviderOrderId: result.rideHailing?.provider.providerOrderId ?? null,
    responseBillId: result.bill?.id ?? null,
    responseBillStatus: result.bill?.status ?? null,
    responsePaymentStatus: result.payment.status,
    responseFulfillmentId: result.fulfillment?.id ?? null,
  });

  return result;
}

export async function cancelRentalOrderFromOrderDetail(_input: {
  orderId: string;
  actorUserId: string;
}) {
  return throwRentalRuntimeRetired();
}

export async function simulateRentalBookingConfirmation(_input: {
  orderId: string;
  actorUserId: string;
}) {
  return throwRentalRuntimeRetired();
}
