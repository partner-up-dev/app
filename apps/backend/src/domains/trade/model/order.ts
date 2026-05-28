import type { PriceExplanation } from "../../merchandising";

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

export type OrderParticipantRole = "CREATOR" | "PARTICIPANT";

export type OrderParticipantSnapshot = {
  participantId: string;
  userId: string;
  role: OrderParticipantRole;
  joinedVia: "PR_ACTIVE_PARTICIPANT" | "API";
  joinedAt?: string | null;
  removedAt?: string | null;
};

export type OrderOfferSnapshot = {
  offerId: number;
  termsVersion: number;
  productType: "RENTAL" | "RIDE_HAILING";
};

export type OrderItemSnapshot = {
  itemId: string;
  spuId: number;
  spuVersion: number;
  spuName: string;
  skuId: number;
  skuVersion: number;
  skuName: string;
  quantity: number;
  skuFactsSnapshot: unknown;
  pricingModelSnapshot: unknown;
  cancellationPolicySnapshot?: CancellationPolicySnapshot | null;
};

export type OrderItemPricingSnapshot = {
  itemId: string;
  resolvedAmountFen: number;
  explanations: PriceExplanation[];
};

export type OrderPricingSnapshot = {
  currency: "CNY";
  itemBreakdowns: OrderItemPricingSnapshot[];
  orderLevelExplanations: PriceExplanation[];
  subtotalFen: number;
  totalFen: number;
};

export type OrderTimeout = {
  unpaidExpiresAt: string;
  defaultWindowMinutes: number;
};

export type RentalRegistrant = {
  name: string;
  phone?: string | null;
  nationalIdMasked?: string | null;
};

export type CancellationTierSnapshot = {
  code: string;
  fromMinutesBeforeStart: number | null;
  untilMinutesBeforeStart: number | null;
  refundPercent: number;
  requiresOperatorHandling: boolean;
  visibleLabel: string;
};

export type CancellationPolicySnapshot = {
  source: {
    skuPolicyId: string;
    skuPolicyVersion: number;
    skuId: number;
  };
  basis: "CUSTOMER_PAID_AMOUNT";
  operatorBufferMinutes: number;
  tiers: CancellationTierSnapshot[];
};

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
  createdBy: string;
  status: OrderStatus;
  participants: OrderParticipantSnapshot[];
  splitRuleSnapshot: SplitRuleSnapshot;
  offerSnapshot: OrderOfferSnapshot;
  items: OrderItemSnapshot[];
  pricingSnapshot: OrderPricingSnapshot;
  timeout: OrderTimeout;
  terminationAttempts: OrderTerminationAttempt[];
  selectedZoneCodes?: string[];
  serviceStartAt?: string | null;
  serviceEndAt?: string | null;
  participantCount?: number | null;
  contactPhone?: string | null;
  registrants?: RentalRegistrant[];
};
