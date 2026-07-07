type BillDisplaySnapshot = {
  currency: string;
  totalAmountFen: number;
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

export type BillLineSettlementTagDisplay = {
  label: "待支付" | "支付中" | "已支付" | "支付失败" | "退款处理中" | "已退款";
  tone: BillSettlementTagTone | "danger";
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

export const resolveBillLineSettlementTag = (status: string): BillLineSettlementTagDisplay => {
  if (status === "PAID") return { label: "已支付", tone: "success" };
  if (status === "PROCESSING" || status === "ACTION_REQUIRED") {
    return { label: "支付中", tone: "primary" };
  }
  if (status === "FAILED") return { label: "支付失败", tone: "danger" };
  if (status === "REFUND_PENDING") {
    return { label: "退款处理中", tone: "secondary" };
  }
  if (status === "REFUNDED") return { label: "已退款", tone: "secondary" };
  return { label: "待支付", tone: "neutral" };
};

export const formatCurrencyAmount = (
  amountFen: number | null | undefined,
  currency: string | null | undefined,
): string => {
  if (typeof amountFen !== "number") return "待确认";
  const normalizedCurrency = currency?.trim() || "CNY";
  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: normalizedCurrency,
    }).format(amountFen / 100);
  } catch {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
    }).format(amountFen / 100);
  }
};
