import { throwHttpProblem } from "../../../lib/problem-details";
import type { BillId, BillLineId } from "../../../entities/bill";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { PaymentTxRepository } from "../../../repositories/PaymentTxRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { createRentalFulfillment } from "../../fulfillment";
import { deriveBillPaymentState } from "../../payment/services";

const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();
const paymentTxRepo = new PaymentTxRepository();
const tradeOrderRepo = new TradeOrderRepository();

export async function applyBillSettlementToOrder(input: {
  billId: string;
}): Promise<{
  applied: boolean;
  reason: string;
  fulfillmentId?: string;
}> {
  const bill = await billRepo.findById(input.billId as BillId);
  if (!bill) {
    return throwHttpProblem({ status: 404, detail: "Bill not found" });
  }

  const lines = await billLineRepo.listByBillId(bill.id);
  const txs = await paymentTxRepo.listByBillLineIds(
    lines.map((line) => line.id as BillLineId),
  );
  const paymentState = deriveBillPaymentState({ lines, txs });
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

  if (order.family === "RENTAL") {
    const fulfillment = await createRentalFulfillment(order.id);
    return {
      applied: true,
      reason: "Order started Rental fulfillment after prepaid bill settlement",
      fulfillmentId: fulfillment.id,
    };
  }

  return {
    applied: false,
    reason: "Order family has no prepaid settlement consequence",
  };
}
