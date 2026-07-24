import type { InferRequestType, InferResponseType } from "hono";
import type { OfferValue } from "@/domains/admin-commerce/model/pricing-rules/offerValues";
import type {
  ProductPresentationValue,
  ProductSkuValue,
  ProductSpuValue,
  SkuCancellationPolicyValue,
} from "@/domains/admin-commerce/model/product-management/productValues";
import { adminClient } from "@/lib/admin-rpc";

type AdminApi = typeof adminClient.api.admin;
type CommerceApi = AdminApi["commerce"];
type ProductsApi = CommerceApi["products"];
type ProductWorkspaceRoute = ProductsApi["workspace"];
type ProductSpuCreateRoute = ProductsApi["spus"];
type ProductSpuUpdateRoute = ProductsApi["spus"][":spuId"];
type ProductSkuCreateRoute = ProductsApi["skus"];
type ProductSkuUpdateRoute = ProductsApi["skus"][":skuId"];
type CancellationPolicyRoute = ProductSkuUpdateRoute["cancellation-policy"];
type PlacementOfferWorkspaceRoute = CommerceApi["placement-offer"]["workspace"];
type OfferCreateRoute = CommerceApi["offers"];
type OfferUpdateRoute = CommerceApi["offers"][":offerId"];
type OrdersBillsWorkspaceRoute = CommerceApi["orders-bills"]["workspace"];
type FulfillmentsWorkspaceRoute = CommerceApi["fulfillments"]["workspace"];

export type AdminCommerceProductWorkspaceResponse = InferResponseType<
  ProductWorkspaceRoute["$get"]
>;
export type AdminCommercePlacementOfferWorkspaceResponse = InferResponseType<
  PlacementOfferWorkspaceRoute["$get"]
>;
export type AdminCommerceOrderBillWorkspaceResponse = InferResponseType<
  OrdersBillsWorkspaceRoute["$get"]
>;
export type AdminCommerceFulfillmentWorkspaceResponse = InferResponseType<
  FulfillmentsWorkspaceRoute["$get"]
>;

type ProductWorkspace = NonNullable<AdminCommerceProductWorkspaceResponse>;
type ProductWorkspaceRecord = ProductWorkspace["products"][number];
type ProductSkuWorkspaceRecord = ProductWorkspaceRecord["skus"][number];
type OfferWorkspace = NonNullable<AdminCommercePlacementOfferWorkspaceResponse>;
type OfferWorkspaceRecord = OfferWorkspace["offers"][number];

type ProductSpuCreateBody = InferRequestType<ProductSpuCreateRoute["$post"]>["json"];
type ProductSpuUpdateBody = InferRequestType<ProductSpuUpdateRoute["$patch"]>["json"];
type ProductSkuCreateBody = InferRequestType<ProductSkuCreateRoute["$post"]>["json"];
type ProductSkuUpdateBody = InferRequestType<ProductSkuUpdateRoute["$patch"]>["json"];
type CancellationPolicyBody = InferRequestType<CancellationPolicyRoute["$post"]>["json"];
type OfferCreateBody = InferRequestType<OfferCreateRoute["$post"]>["json"];
type OfferUpdateBody = InferRequestType<OfferUpdateRoute["$patch"]>["json"];

const mapPresentation = (presentation: ProductPresentationValue): ProductPresentationValue => ({
  heroImageAssetIds: [...presentation.heroImageAssetIds],
  detailImageAssetIds: [...presentation.detailImageAssetIds],
  sellingPoints: [...presentation.sellingPoints],
  parameterGroups: presentation.parameterGroups.map((group) => ({
    title: group.title,
    items: group.items.map((item) => ({
      label: item.label,
      value: item.value,
    })),
  })),
  noticeBlocks: presentation.noticeBlocks.map((block) => ({
    title: block.title,
    content: block.content,
  })),
});

const mapSpuValue = (value: ProductSpuValue): ProductSpuValue => ({
  name: value.name,
  productType: value.productType,
  status: value.status,
  salesPolicy: {
    skuSelectionPolicy:
      value.salesPolicy.skuSelectionPolicy.type === "EXACTLY_ONE"
        ? { type: "EXACTLY_ONE" }
        : {
            type: "CHOICE_SET",
            min: value.salesPolicy.skuSelectionPolicy.min,
            ...(value.salesPolicy.skuSelectionPolicy.max === undefined
              ? {}
              : { max: value.salesPolicy.skuSelectionPolicy.max }),
            resolvesTo: 1,
          },
    quantityPolicy:
      value.salesPolicy.quantityPolicy.type === "FIXED"
        ? {
            type: "FIXED",
            quantity: value.salesPolicy.quantityPolicy.quantity,
          }
        : value.salesPolicy.quantityPolicy.type === "USER_SELECTED"
          ? {
              type: "USER_SELECTED",
              min: value.salesPolicy.quantityPolicy.min,
              max: value.salesPolicy.quantityPolicy.max,
            }
          : { type: "PER_PARTICIPANT" },
  },
  servicePolicy:
    value.servicePolicy.type === "RIDE_HAILING"
      ? { type: "RIDE_HAILING" }
      : {
          type: "RENTAL",
          bookingLeadTimeMinutes: value.servicePolicy.bookingLeadTimeMinutes,
          ...(value.servicePolicy.serviceWindow === undefined
            ? {}
            : {
                serviceWindow: {
                  weekdays: [...value.servicePolicy.serviceWindow.weekdays],
                  startTime: value.servicePolicy.serviceWindow.startTime,
                  endTime: value.servicePolicy.serviceWindow.endTime,
                },
              }),
          requiresContactPhone: value.servicePolicy.requiresContactPhone,
          requiresRealName: value.servicePolicy.requiresRealName,
          requiresNationalId: value.servicePolicy.requiresNationalId,
        },
  presentation: mapPresentation(value.presentation),
  facts: { ...value.facts },
});

const mapSkuValue = (value: ProductSkuValue): ProductSkuValue => {
  const sku = {
    name: value.name,
    status: value.status,
    sortOrder: value.sortOrder,
    presentation: mapPresentation(value.presentation),
    facts:
      "type" in value.facts
        ? {
            type: "RENTAL" as const,
            zoneCode: value.facts.zoneCode,
            participantCount: value.facts.participantCount,
            durationMinutes: value.facts.durationMinutes,
          }
        : {
            rideHailingProviderInstanceId: value.facts.rideHailingProviderInstanceId,
            providerVehicleTypeCode: value.facts.providerVehicleTypeCode,
          },
    pricingModel:
      value.pricingModel.type === "FIXED_TOTAL"
        ? {
            type: "FIXED_TOTAL" as const,
            amountFen: value.pricingModel.amountFen,
          }
        : {
            type: "DYNAMIC_QUOTE" as const,
            calculatorSpec: value.pricingModel.calculatorSpec,
          },
  };

  if (value.cancellationPolicyRef === undefined) {
    return sku;
  }

  return {
    ...sku,
    cancellationPolicyRef:
      value.cancellationPolicyRef === null
        ? null
        : {
            policyId: value.cancellationPolicyRef.policyId,
            policyVersion: value.cancellationPolicyRef.policyVersion,
          },
  };
};

const mapPricingRules = (rules: OfferValue["pricingRules"]): OfferValue["pricingRules"] =>
  rules.map((rule) => ({
    id: rule.id,
    label: rule.label,
    description: rule.description,
    conditionRule: rule.conditionRule,
    action:
      rule.action.type === "RESET"
        ? {
            type: "RESET",
            payload: {
              pricingModel: rule.action.payload.pricingModel,
            },
          }
        : rule.action.type === "MINUS"
          ? {
              type: "MINUS",
              payload: {
                amountFen: rule.action.payload.amountFen,
              },
            }
          : {
              type: "RATIO",
              payload: {
                ratioBps: rule.action.payload.ratioBps,
              },
            },
    target:
      rule.target.level === "ORDER"
        ? { level: "ORDER" }
        : rule.target.level === "SPU"
          ? rule.target.spuId === undefined
            ? { level: "SPU" }
            : { level: "SPU", spuId: rule.target.spuId }
          : rule.target.skuId === undefined
            ? { level: "SKU" }
            : { level: "SKU", skuId: rule.target.skuId },
    continue: rule.continue,
  }));

const toDateValue = (value: Date | string | null): string | null =>
  typeof value === "string" || value === null ? value : value.toISOString();

export const toProductSpuValue = (record: ProductWorkspaceRecord["spu"]): ProductSpuValue =>
  mapSpuValue({
    name: record.name,
    productType: record.productType,
    status: record.status,
    salesPolicy: record.salesPolicy,
    servicePolicy: record.servicePolicy,
    presentation: record.presentation,
    facts: record.facts,
  });

export const toProductSkuValue = (record: ProductSkuWorkspaceRecord["sku"]): ProductSkuValue =>
  mapSkuValue({
    name: record.name,
    status: record.status,
    sortOrder: record.sortOrder,
    presentation: record.presentation,
    facts: record.facts,
    pricingModel: record.pricingModel,
    cancellationPolicyRef: record.cancellationPolicyRef,
  });

export const toSkuCancellationPolicyValue = (
  record: NonNullable<ProductSkuWorkspaceRecord["cancellationPolicy"]>,
): SkuCancellationPolicyValue => ({
  operatorBufferMinutes: record.operatorBufferMinutes,
  tiers: record.tiers.map((tier) => ({
    code: tier.code,
    fromMinutesBeforeStart: tier.fromMinutesBeforeStart,
    untilMinutesBeforeStart: tier.untilMinutesBeforeStart,
    refundPercent: tier.refundPercent,
    requiresOperatorHandling: tier.requiresOperatorHandling,
    visibleLabel: tier.visibleLabel,
  })),
});

export const toOfferValue = (record: OfferWorkspaceRecord): OfferValue => ({
  productType: record.productType,
  spuIds: [...record.spuIds],
  status: record.status,
  pricingRules: mapPricingRules(record.pricingPolicy.rules),
  termsVersion: record.termsVersion,
  startsAt: toDateValue(record.startsAt),
  endsAt: toDateValue(record.endsAt),
});

export const toProductSpuCreateBody = (value: ProductSpuValue): ProductSpuCreateBody =>
  mapSpuValue(value);

export const toProductSpuUpdateBody = (value: ProductSpuValue): ProductSpuUpdateBody =>
  mapSpuValue(value);

export const toProductSkuCreateBody = (
  spuId: number,
  value: ProductSkuValue,
): ProductSkuCreateBody => ({
  spuId,
  ...mapSkuValue(value),
});

export const toProductSkuUpdateBody = (value: ProductSkuValue): ProductSkuUpdateBody =>
  mapSkuValue(value);

export const toSkuCancellationPolicyBody = (
  value: SkuCancellationPolicyValue,
): CancellationPolicyBody => ({
  operatorBufferMinutes: value.operatorBufferMinutes,
  tiers: value.tiers.map((tier) => ({
    code: tier.code,
    fromMinutesBeforeStart: tier.fromMinutesBeforeStart,
    untilMinutesBeforeStart: tier.untilMinutesBeforeStart,
    refundPercent: tier.refundPercent,
    requiresOperatorHandling: tier.requiresOperatorHandling,
    visibleLabel: tier.visibleLabel,
  })),
});

const toOfferBody = (value: OfferValue): OfferCreateBody & OfferUpdateBody => ({
  productType: value.productType,
  spuIds: [...value.spuIds],
  status: value.status,
  pricingRules: mapPricingRules(value.pricingRules),
  termsVersion: value.termsVersion,
  startsAt: value.startsAt,
  endsAt: value.endsAt,
});

export const toOfferCreateBody = (value: OfferValue): OfferCreateBody => toOfferBody(value);

export const toOfferUpdateBody = (value: OfferValue): OfferUpdateBody => toOfferBody(value);
