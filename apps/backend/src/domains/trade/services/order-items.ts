import type {
  CancellationPolicySnapshot,
  OrderItemSnapshot,
} from "../model";
import type { FixedTotalPricingModel, PricingModel } from "../../merchandising";

const isFixedTotalPricingModel = (
  value: PricingModel,
): value is FixedTotalPricingModel => value.type === "FIXED_TOTAL";

export function getOrderItemSkuName(item: OrderItemSnapshot): string {
  return item.sku.name;
}

export function getOrderItemPricingAmountFen(item: OrderItemSnapshot): number {
  const pricingModel = item.sku.pricingModelSnapshot;
  if (!isFixedTotalPricingModel(pricingModel)) {
    throw new Error(
      `Order item ${item.itemId} requires materialized bill amount for dynamic pricing`,
    );
  }

  return pricingModel.amountFen * item.quantity;
}

export function getOrderItemsTotalFen(items: OrderItemSnapshot[]): number {
  return items.reduce(
    (sum, item) => sum + getOrderItemPricingAmountFen(item),
    0,
  );
}

export function getOrderItemCancellationPolicy(
  item: OrderItemSnapshot,
): CancellationPolicySnapshot {
  const policy = item.sku.cancellationPolicySnapshot;
  if (!policy) {
    throw new Error(
      `Cancellation policy snapshot missing for item ${item.itemId}`,
    );
  }

  return policy;
}
