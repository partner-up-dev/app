import { getBillLinePaymentExecution } from "../../bill/queries";
import { applyBillSettlementToOrder } from "../../trade/commands";

export async function applyPaymentSettlementConsequence(input: { billLineId: string }): Promise<{
  applied: boolean;
  reason: string;
  rentalOrderId?: string;
}> {
  const billLine = await getBillLinePaymentExecution({ billLineId: input.billLineId });
  if (billLine.kind !== "CHARGE" || !billLine.settledAt) {
    return {
      applied: false,
      reason: "BillLine is not a settled charge",
    };
  }

  return applyBillSettlementToOrder({ billId: billLine.billId });
}
