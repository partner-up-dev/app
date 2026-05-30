import { throwHttpProblem } from "../../../lib/problem-details";
import type { PaymentTxId } from "../../../entities/payment";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { PaymentTxRepository } from "../../../repositories/PaymentTxRepository";
import { applyBillSettlementToOrder } from "../../trade/use-cases/apply-bill-settlement-to-order";

const paymentTxRepo = new PaymentTxRepository();
const billLineRepo = new BillLineRepository();

export async function applyPaymentSettlementConsequence(input: {
  paymentTxId: string;
}): Promise<{
  applied: boolean;
  reason: string;
  fulfillmentId?: string;
}> {
  const paymentTx = await paymentTxRepo.findById(input.paymentTxId as PaymentTxId);
  if (!paymentTx) {
    return throwHttpProblem({ status: 404, detail: "PaymentTx not found" });
  }
  if (paymentTx.type !== "CHARGE" || paymentTx.status !== "SUCCEEDED") {
    return {
      applied: false,
      reason: "PaymentTx is not a successful charge",
    };
  }

  const billLine = await billLineRepo.findById(paymentTx.billLineId);
  if (!billLine) {
    return throwHttpProblem({ status: 404, detail: "BillLine not found" });
  }

  return applyBillSettlementToOrder({ billId: billLine.billId });
}
