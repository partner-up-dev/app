import type { BillId } from "../../../entities/bill";
import type { TradeOrderId } from "../../../entities/trade-order";
import { throwHttpProblem } from "../../../lib/problem-details";
import { BillRepository } from "../../../repositories/BillRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { settleBillLinePaymentExecution } from "../../bill/commands";
import type { BillLinePaymentExecutionSettlement } from "../../bill/contracts";
import { getBillLinePaymentExecution } from "../../bill/queries";
import { settleRideHailingPaymentAndScheduleFeeConfirmation } from "../../ride-hailing/ports";
import { applyBillSettlementToOrder } from "./apply-bill-settlement-to-order";

/**
 * Routes the exact Payment observation through the order-family transaction
 * that owns its post-settlement work. RideHailing binds the first qualifying
 * charge settlement to its fee-confirmation Job; other families retain Bill's
 * ordinary CAS and their existing consequence.
 */
export async function settleBillLinePaymentAndApplyOrderConsequence(input: {
  billLineId: string;
  paymentProviderInstanceId: string;
  attemptCount: number;
  settledAt: Date;
}): Promise<BillLinePaymentExecutionSettlement> {
  const observedLine = await getBillLinePaymentExecution({
    billLineId: input.billLineId,
  });

  let settlement: BillLinePaymentExecutionSettlement;
  if (observedLine.kind === "CHARGE") {
    const bill = await new BillRepository().findById(observedLine.billId as BillId);
    if (!bill) {
      return throwHttpProblem({ status: 404, detail: "Bill not found" });
    }
    const order = await new TradeOrderRepository().findById(bill.sourceOrderId as TradeOrderId);
    if (!order) {
      return throwHttpProblem({ status: 404, detail: "Order not found" });
    }
    settlement =
      order.family === "RIDE_HAILING"
        ? await settleRideHailingPaymentAndScheduleFeeConfirmation({
            billLineId: input.billLineId,
            paymentProviderInstanceId: input.paymentProviderInstanceId,
            attemptCount: input.attemptCount,
            settledAt: input.settledAt.toISOString(),
          })
        : await settleBillLinePaymentExecution(input);
  } else {
    settlement = await settleBillLinePaymentExecution(input);
  }

  if (settlement.status === "SETTLED" && settlement.line.kind === "CHARGE") {
    await applyBillSettlementToOrder({ billId: settlement.line.billId });
  }
  return settlement;
}
