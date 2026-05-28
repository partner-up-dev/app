export type OrderFamily = "RENTAL" | "RIDE_HAILING";

export type OrderStatus =
  | "OPEN"
  | "CANCELLED"
  | "FAILED"
  | "EXPIRED"
  | "COMPLETED";

export type OrderTerminationAttemptStatus =
  | "PENDING"
  | "APPROVED"
  | "DENIED";

export type OrderTerminationResolutionPath =
  | "TRADE_LOCAL"
  | "RENTAL_FULFILLMENT"
  | "RIDE_HAILING_FULFILLMENT";

export type OrderTerminationEffectKind =
  | "NONE"
  | "POLICY_REFUND"
  | "ABORT_FEE";

export type OrderTerminationAttempt = {
  attemptId: string;
  requestedAt: string;
  requestedBy: string;
  status: OrderTerminationAttemptStatus;
  resolutionPath?: OrderTerminationResolutionPath | null;
  reason?: string | null;
  effectKind?: OrderTerminationEffectKind | null;
  effectAmountFen?: number | null;
  decidedAt?: string | null;
};

export type FulfillmentTerminationDecision = {
  outcome: "APPROVED" | "DENIED";
  reason?: string | null;
  feeFen?: number | null;
};

export type BillTargetAmountSeed = {
  sourceOrderId: string;
  sourceAttemptId: string;
  currency: "CNY";
  targetChargeTotalFen: number;
};

export type SplitRuleSnapshot =
  | {
      type: "RELATIVE";
      shares: Array<{
        userId: string;
        percentBps: number;
      }>;
    }
  | {
      type: "ABSOLUTE";
      shares: Array<{
        userId: string;
        amountFen: number;
      }>;
    };

export type TradeOrder = {
  id: string;
  family: OrderFamily;
  status: OrderStatus;
  terminationAttempts: OrderTerminationAttempt[];
};
