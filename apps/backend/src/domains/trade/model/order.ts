import type {
  PriceExplanation,
  PricingModel,
  PricingRule,
  ProductPresentation,
  ProductType,
  SkuFacts,
  SpuSalesPolicy,
} from "../../merchandising";

export type OrderFamily = "RENTAL" | "RIDE_HAILING";

export type OrderStatus = "INITIATING" | "OPEN" | "CANCELLED" | "FAILED" | "EXPIRED" | "COMPLETED";

export type OrderTerminationAttemptStatus = "PENDING" | "APPROVED" | "DENIED";

export type OrderTerminationResolutionPath =
  | "TRADE_LOCAL"
  | "RENTAL_FULFILLMENT"
  | "RIDE_HAILING_FULFILLMENT";

export type OrderTerminationEffectKind = "NONE" | "POLICY_REFUND" | "ABORT_FEE";

export type OrderParticipantRole = "CREATOR" | "PARTICIPANT";

export type OrderParticipantSnapshot = {
  participantId: string;
  userId: string;
  role: OrderParticipantRole;
  joinedVia: "PR_ACTIVE_PARTICIPANT" | "API";
  joinedAt?: string | null;
  removedAt?: string | null;
};

export type SkuSnapshot = {
  id: number;
  version: number;
  name: string;
  presentationSnapshot: ProductPresentation;
  factsSnapshot: SkuFacts;
  pricingModelSnapshot: PricingModel;
  cancellationPolicySnapshot?: CancellationPolicySnapshot | null;
};

export type OrderPricingSkuSnapshot = {
  id: number;
  version: number;
  name: string;
  factsSnapshot: SkuFacts;
  pricingModelSnapshot: PricingModel;
};

export type OrderPricingSpuSnapshot = {
  id: number;
  version: number;
  productType: ProductType;
  factsSnapshot: Record<string, unknown>;
  salesPolicySnapshot: SpuSalesPolicy;
};

export type OrderPricingExecutionSnapshot = {
  version: 1;
  offer: {
    id: number;
    productType: ProductType;
    termsVersion: number;
    pricingPolicySnapshot: {
      rules: PricingRule[];
    };
  };
  items: Array<{
    itemId: string;
    quantity: number;
    spu: OrderPricingSpuSnapshot;
    sku: OrderPricingSkuSnapshot;
  }>;
  orderContext: {
    serviceTime?: string | null;
  };
};

export type FixedOrderItemSnapshot = {
  kind?: "FIXED";
  itemId: string;
  sku: SkuSnapshot;
  quantity: number;
};

export type RideHailingQuoteSnapshot = {
  amountFen: number;
  currency: "CNY";
  displayName: string;
  estimateAmountFen?: number | null;
  quotedAt: string;
  expiresAt?: string | null;
  explanations: PriceExplanation[];
};

export type RideHailingChoiceSetCandidateSnapshot = {
  sku: SkuSnapshot;
  quoteSnapshot: RideHailingQuoteSnapshot;
};

export type RideHailingChoiceSetResolutionSnapshot = {
  sku?: SkuSnapshot | null;
  providerVehicleTypeCode?: string | null;
  providerVehicleTypeName?: string | null;
  quoteSnapshot?: RideHailingQuoteSnapshot | null;
  source: "PROVIDER_ACCEPTED" | "PROVIDER_CALLBACK";
  candidateRelation: "IN_CANDIDATES" | "PROVIDER_UPGRADE" | "PROVIDER_SUBSTITUTION";
  reason?: string | null;
  resolvedAt: string;
};

export type ChoiceSetOrderItemSnapshot = {
  kind: "CHOICE_SET";
  itemId: string;
  productType: "RIDE_HAILING";
  candidates: RideHailingChoiceSetCandidateSnapshot[];
  resolution: RideHailingChoiceSetResolutionSnapshot | null;
  quantity: 1;
};

export type OrderItemSnapshot = FixedOrderItemSnapshot | ChoiceSetOrderItemSnapshot;

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
  offerId: number;
  createdBy: string;
  status: OrderStatus;
  participants: OrderParticipantSnapshot[];
  splitRuleSnapshot: SplitRuleSnapshot;
  pricingExecutionSnapshot?: OrderPricingExecutionSnapshot | null;
  items: OrderItemSnapshot[];
  timeout: OrderTimeout;
  terminationAttempts: OrderTerminationAttempt[];
};
