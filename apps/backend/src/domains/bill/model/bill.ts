export type BillStatus = "ACTIVE" | "VOIDED" | "CLOSED";

export type BillLineKind = "CHARGE" | "REFUND";

export type BillLine = {
  id: string;
  userId: string;
  kind: BillLineKind;
  amountFen: number;
  label: string;
  description?: string | null;
  sourceLineId?: string | null;
};

export type Bill = {
  id: string;
  status: BillStatus;
  currency: "CNY";
  lines: BillLine[];
};

export type BillSeed = {
  sourceOrderId: string;
  currency: "CNY";
  chargeLines: Array<{
    userId: string;
    amountFen: number;
    label: string;
    description?: string | null;
  }>;
};
