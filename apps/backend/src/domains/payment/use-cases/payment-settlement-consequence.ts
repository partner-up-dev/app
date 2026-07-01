import { throwHttpProblem } from "../../../lib/problem-details";
import type { BillLineId } from "../../../entities/bill";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { applyBillSettlementToOrder } from "../../trade/use-cases/apply-bill-settlement-to-order";

const billLineRepo = new BillLineRepository();

export async function applyPaymentSettlementConsequence(input: {
  billLineId: string;
}): Promise<{
  applied: boolean;
  reason: string;
  rentalOrderId?: string;
}> {
  const billLine = await billLineRepo.findById(input.billLineId as BillLineId);
  if (!billLine) {
    return throwHttpProblem({ status: 404, detail: "BillLine not found" });
  }
  if (billLine.kind !== "CHARGE" || !billLine.settledAt) {
    return {
      applied: false,
      reason: "BillLine is not a settled charge",
    };
  }

  return applyBillSettlementToOrder({ billId: billLine.billId });
}
