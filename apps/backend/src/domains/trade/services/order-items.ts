import type {
  CancellationPolicySnapshot,
  ChoiceSetOrderItemSnapshot,
  FixedOrderItemSnapshot,
  OrderItemSnapshot,
  RideHailingProviderBindingSnapshot,
  SkuSnapshot,
} from "../model";
import type { FixedTotalPricingModel, PricingModel } from "../../merchandising";

const isFixedTotalPricingModel = (value: PricingModel): value is FixedTotalPricingModel =>
  value.type === "FIXED_TOTAL";

export function isFixedOrderItemSnapshot(item: OrderItemSnapshot): item is FixedOrderItemSnapshot {
  return item.kind === undefined || item.kind === "FIXED";
}

export function isChoiceSetOrderItemSnapshot(
  item: OrderItemSnapshot,
): item is ChoiceSetOrderItemSnapshot {
  return item.kind === "CHOICE_SET";
}

export function assertFixedOrderItemSnapshot(item: OrderItemSnapshot): FixedOrderItemSnapshot {
  if (!isFixedOrderItemSnapshot(item)) {
    throw new Error(`Order item ${item.itemId} is not a fixed SKU item`);
  }
  return item;
}

export function getOrderItemSkuName(item: OrderItemSnapshot): string {
  if (!isFixedOrderItemSnapshot(item)) {
    return (
      item.resolution?.sku?.name ??
      item.resolution?.providerVehicleTypeName ??
      item.candidates[0]?.sku.name ??
      "待确认车型"
    );
  }
  return item.sku.name;
}

export function getOrderItemPricingAmountFen(item: OrderItemSnapshot): number {
  const fixedItem = assertFixedOrderItemSnapshot(item);
  const pricingModel = fixedItem.sku.pricingModelSnapshot;
  if (!isFixedTotalPricingModel(pricingModel)) {
    throw new Error(
      `Order item ${fixedItem.itemId} requires materialized bill amount for dynamic pricing`,
    );
  }

  return pricingModel.amountFen * fixedItem.quantity;
}

export function getOrderItemsTotalFen(items: OrderItemSnapshot[]): number {
  return items.reduce((sum, item) => sum + getOrderItemPricingAmountFen(item), 0);
}

export function getOrderItemCancellationPolicy(
  item: OrderItemSnapshot,
): CancellationPolicySnapshot {
  const fixedItem = assertFixedOrderItemSnapshot(item);
  const policy = fixedItem.sku.cancellationPolicySnapshot;
  if (!policy) {
    throw new Error(`Cancellation policy snapshot missing for item ${fixedItem.itemId}`);
  }

  return policy;
}

export function getRideHailingChoiceSetItem(
  items: OrderItemSnapshot[],
): ChoiceSetOrderItemSnapshot | null {
  return (
    items.find(
      (item): item is ChoiceSetOrderItemSnapshot =>
        isChoiceSetOrderItemSnapshot(item) && item.productType === "RIDE_HAILING",
    ) ?? null
  );
}

export function getRideHailingResolvedSku(item: ChoiceSetOrderItemSnapshot): SkuSnapshot | null {
  return item.resolution?.sku ?? null;
}

export function getRideHailingProviderBinding(
  item: ChoiceSetOrderItemSnapshot,
): RideHailingProviderBindingSnapshot | null {
  return item.resolution?.providerBinding ?? null;
}
