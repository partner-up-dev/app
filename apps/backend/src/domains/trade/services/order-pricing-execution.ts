import type { Offer } from "../../../entities/offer";
import type { ProductSku } from "../../../entities/product-sku";
import type { ProductSpu } from "../../../entities/product-spu";
import type { OrderPricingExecutionSnapshot, OrderPricingSnapshot } from "../model";
import { PricingApplication } from "./pricing-application";

const pricingApplication = new PricingApplication();

export function buildOrderPricingExecutionSnapshot(input: {
  offer: Offer;
  items: Array<{
    itemId: string;
    quantity: number;
    spu: ProductSpu;
    sku: ProductSku;
  }>;
  orderContext?: {
    serviceTime?: string | null;
  };
}): OrderPricingExecutionSnapshot {
  return {
    version: 1,
    offer: {
      id: input.offer.id,
      productType: input.offer.productType,
      termsVersion: input.offer.termsVersion,
      pricingPolicySnapshot: input.offer.pricingPolicy,
    },
    items: input.items.map((item) => ({
      itemId: item.itemId,
      quantity: item.quantity,
      spu: {
        id: item.spu.id,
        version: item.spu.version,
        productType: item.spu.productType,
        factsSnapshot: item.spu.facts,
        salesPolicySnapshot: item.spu.salesPolicy,
      },
      sku: {
        id: item.sku.id,
        version: item.sku.version,
        name: item.sku.name,
        factsSnapshot: item.sku.facts,
        pricingModelSnapshot: item.sku.pricingModel,
      },
    })),
    orderContext: {
      serviceTime: input.orderContext?.serviceTime ?? null,
    },
  };
}

export function resolvePricingFromExecutionSnapshot(input: {
  snapshot: OrderPricingExecutionSnapshot;
  orderContext?: {
    serviceTime?: string | null;
    quoteTotalFen?: number | null;
  };
}): OrderPricingSnapshot {
  return pricingApplication.resolve({
    offer: {
      pricingPolicy: input.snapshot.offer.pricingPolicySnapshot,
    },
    items: input.snapshot.items.map((item) => ({
      itemId: item.itemId,
      quantity: item.quantity,
      spu: {
        id: item.spu.id,
        facts: item.spu.factsSnapshot,
        salesPolicy: item.spu.salesPolicySnapshot,
      },
      sku: {
        id: item.sku.id,
        name: item.sku.name,
        facts: item.sku.factsSnapshot,
        pricingModel: item.sku.pricingModelSnapshot,
      },
    })),
    orderContext: {
      serviceTime:
        input.orderContext?.serviceTime ?? input.snapshot.orderContext.serviceTime ?? null,
      quoteTotalFen: input.orderContext?.quoteTotalFen ?? null,
    },
  });
}
