import type { BillId } from "../../../entities/bill";
import { throwHttpProblem } from "../../../lib/problem-details";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { deriveBillPaymentState } from "../../bill";
import { applyOrderPrepaidSettlementFulfillmentConsequence } from "../../fulfillment";
import { confirmRideHailingProviderFeeAfterPayment } from "./ride-hailing-ordering-flow";

const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();
const rideOrderRepo = new RideHailingOrderRepository();
const tradeOrderRepo = new TradeOrderRepository();

export async function applyBillSettlementToOrder(input: { billId: string }): Promise<{
  applied: boolean;
  reason: string;
  rentalOrderId?: string;
}> {
  const bill = await billRepo.findById(input.billId as BillId);
  if (!bill) {
    return throwHttpProblem({ status: 404, detail: "Bill not found" });
  }

  const lines = await billLineRepo.listByBillId(bill.id);
  const paymentState = deriveBillPaymentState({ lines });
  if (!paymentState.allChargesPaid) {
    return {
      applied: false,
      reason: "Bill still has unpaid charge lines",
    };
  }

  const order = await tradeOrderRepo.findById(bill.sourceOrderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }
  if (order.family === "RIDE_HAILING") {
    const rideOrder = await rideOrderRepo.findByOrderId(order.id);
    if (!rideOrder) {
      return throwHttpProblem({
        status: 500,
        detail: "RideHailing order facts are missing",
      });
    }
    if (!rideOrder.finalSettlementInput) {
      return {
        applied: false,
        reason: "RideHailing final settlement input is missing",
      };
    }
    if (order.status !== "OPEN" && order.status !== "CANCELLED") {
      return {
        applied: false,
        reason: "RideHailing order is not eligible for final settlement consequence",
      };
    }

    return confirmRideHailingProviderFeeAfterPayment({
      orderId: order.id,
    });
  }

  const hasPendingTerminationAttempt = order.terminationAttempts.some(
    (attempt) => attempt.status === "PENDING",
  );
  if (order.status !== "OPEN" || hasPendingTerminationAttempt) {
    return {
      applied: false,
      reason: "Order is not eligible for prepaid settlement consequence",
    };
  }

  return applyOrderPrepaidSettlementFulfillmentConsequence({
    orderId: order.id,
    family: order.family,
  });
}
