export type PaymentGateway = "WECHAT_PAY";

export type PaymentDirection = "CHARGE" | "REFUND";

export type PaymentTxStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export type PaymentTx = {
  id: string;
  billId: string;
  billLineId: string;
  gateway: PaymentGateway;
  direction: PaymentDirection;
  status: PaymentTxStatus;
  amountFen: number;
};
