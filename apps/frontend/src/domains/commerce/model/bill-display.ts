type BillDisplaySnapshot = {
  chargeTotalFen: number;
  refundTotalFen: number;
  refundedFen: number;
  settlementStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID";
};

export type BillSettlementTagTone = "neutral" | "primary" | "secondary" | "success";

export type BillSettlementTagDisplay = {
  label: "待支付" | "部分已支付" | "已支付" | "退款处理中" | "已退款";
  tone: BillSettlementTagTone;
};

export const resolveBillSettlementTag = (bill: BillDisplaySnapshot): BillSettlementTagDisplay => {
  if (bill.refundTotalFen > 0 && bill.refundedFen >= bill.refundTotalFen) {
    return { label: "已退款", tone: "secondary" };
  }
  if (bill.refundTotalFen > 0) {
    return { label: "退款处理中", tone: "secondary" };
  }
  if (bill.settlementStatus === "PAID") {
    return { label: "已支付", tone: "success" };
  }
  if (bill.settlementStatus === "PARTIALLY_PAID") {
    return { label: "部分已支付", tone: "primary" };
  }
  return { label: "待支付", tone: "neutral" };
};

export const calculateBillEffectiveTotalFen = (
  bill: Pick<BillDisplaySnapshot, "chargeTotalFen" | "refundTotalFen">,
): number => bill.chargeTotalFen - bill.refundTotalFen;
