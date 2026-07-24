import type { OrderFamily, OrderStatus } from "./model";

/**
 * The minimum Trade-owned order fact required to decide whether a BillLine
 * may be presented or executed for payment. It deliberately excludes the
 * persistence row, participants, pricing, and lifecycle internals.
 */
export type TradeOrderBillingContext = {
  id: string;
  family: OrderFamily;
  status: OrderStatus;
  unpaidExpiresAt: string;
};

export type AttachedTradeOrderSummary = {
  id: string;
  status: OrderStatus;
  offerId: number;
};

export type AttachedTradeOrderSummaryQuery = {
  orderIds: string[];
  offerId: number;
  statuses: OrderStatus[];
};

/**
 * Stable Trade pricing/allocation inputs consumed by Bill while materialising
 * an owner-owned bill target. They deliberately expose no Trade persistence
 * row, participant snapshot, or lifecycle mutation API.
 */
export type { BillTargetAmountSeed, SplitRuleSnapshot } from "./model";
export type {
  ChoiceSetOrderItemSnapshot,
  RideHailingChoiceSetResolutionSnapshot,
  RideHailingDispatchBindingSnapshot,
  RideHailingDriverSnapshot,
  RideHailingExecutionPhase,
  RideHailingVehicleSnapshot,
} from "./model";
export { getOrderItemSkuName, getRideHailingChoiceSetItem } from "./services/order-items";
export { resolvePricingFromExecutionSnapshot } from "./services/order-pricing-execution";
export { closeRideHailingOrderFromProviderCancellation } from "./services/order-termination";
