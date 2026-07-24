import type {
  ProductSkuValue,
  ProductType,
} from "@/domains/admin-commerce/model/product-management/productValues";
import {
  parseIntegerField,
  type NumberInput,
} from "@/domains/admin-commerce/model/product-management/shared";

type SkuPricingModel = ProductSkuValue["pricingModel"];
type SkuFacts = ProductSkuValue["facts"];
type SkuPresentation = ProductSkuValue["presentation"];

export type SkuEditorForm = {
  name: string;
  status: ProductSkuValue["status"];
  sortOrder: NumberInput;
  rentalZoneCode: string;
  rentalParticipantCount: NumberInput;
  rentalDurationMinutes: NumberInput;
  rideProviderInstanceId: string;
  rideProviderVehicleTypeCode: string;
  pricingModelType: SkuPricingModel["type"];
  fixedAmountFen: NumberInput;
  dynamicPricingModel: Extract<SkuPricingModel, { type: "DYNAMIC_QUOTE" }> | null;
};

export type SkuBuildLabels = {
  sortOrderLabel: string;
  participantCountLabel: string;
  durationMinutesLabel: string;
  amountFenLabel: string;
  dynamicPricingMissingError: string;
};

const isDynamicQuotePricingModel = (
  value: SkuPricingModel,
): value is Extract<SkuPricingModel, { type: "DYNAMIC_QUOTE" }> => value.type === "DYNAMIC_QUOTE";

const isRentalSkuFacts = (value: SkuFacts): value is Extract<SkuFacts, { type: "RENTAL" }> =>
  "type" in value && value.type === "RENTAL";

const isRideHailingSkuFacts = (value: SkuFacts): value is Exclude<SkuFacts, { type: "RENTAL" }> =>
  "rideHailingProviderInstanceId" in value && "providerVehicleTypeCode" in value;

const emptySkuPresentation = (): SkuPresentation => ({
  heroImageAssetIds: [],
  detailImageAssetIds: [],
  sellingPoints: [],
  parameterGroups: [],
  noticeBlocks: [],
});

export const emptySkuInput = (): ProductSkuValue => ({
  name: "",
  status: "DRAFT",
  sortOrder: 0,
  presentation: emptySkuPresentation(),
  facts: {
    type: "RENTAL",
    zoneCode: "",
    participantCount: 2,
    durationMinutes: 180,
  },
  pricingModel: {
    type: "FIXED_TOTAL",
    amountFen: 0,
  },
  cancellationPolicyRef: null,
});

export const toSkuForm = (input: ProductSkuValue): SkuEditorForm => {
  const pricingModel = input.pricingModel;
  return {
    name: input.name,
    status: input.status,
    sortOrder: input.sortOrder,
    rentalZoneCode: isRentalSkuFacts(input.facts) ? input.facts.zoneCode : "",
    rentalParticipantCount: isRentalSkuFacts(input.facts) ? input.facts.participantCount : 2,
    rentalDurationMinutes: isRentalSkuFacts(input.facts) ? input.facts.durationMinutes : 180,
    rideProviderInstanceId: isRideHailingSkuFacts(input.facts)
      ? input.facts.rideHailingProviderInstanceId
      : "",
    rideProviderVehicleTypeCode: isRideHailingSkuFacts(input.facts)
      ? input.facts.providerVehicleTypeCode
      : "",
    pricingModelType: pricingModel.type,
    fixedAmountFen: pricingModel.type === "FIXED_TOTAL" ? pricingModel.amountFen : 0,
    dynamicPricingModel: isDynamicQuotePricingModel(pricingModel) ? pricingModel : null,
  };
};

const buildSkuFacts = (
  form: SkuEditorForm,
  productType: ProductType | null,
  labels: SkuBuildLabels,
): SkuFacts => {
  if (productType === "RIDE_HAILING") {
    return {
      rideHailingProviderInstanceId: form.rideProviderInstanceId.trim(),
      providerVehicleTypeCode: form.rideProviderVehicleTypeCode.trim(),
    };
  }
  return {
    type: "RENTAL",
    zoneCode: form.rentalZoneCode.trim(),
    participantCount: parseIntegerField(form.rentalParticipantCount, labels.participantCountLabel, {
      min: 1,
    }),
    durationMinutes: parseIntegerField(form.rentalDurationMinutes, labels.durationMinutesLabel, {
      min: 1,
    }),
  };
};

const buildSkuPricingModel = (form: SkuEditorForm, labels: SkuBuildLabels): SkuPricingModel => {
  if (form.pricingModelType === "DYNAMIC_QUOTE") {
    if (form.dynamicPricingModel === null) {
      throw new Error(labels.dynamicPricingMissingError);
    }
    return form.dynamicPricingModel;
  }
  return {
    type: "FIXED_TOTAL",
    amountFen: parseIntegerField(form.fixedAmountFen, labels.amountFenLabel, { min: 0 }),
  };
};

export const buildSkuInput = (
  form: SkuEditorForm,
  productType: ProductType | null,
  presentation: SkuPresentation | null | undefined,
  cancellationPolicyRef: ProductSkuValue["cancellationPolicyRef"],
  labels: SkuBuildLabels,
): ProductSkuValue => ({
  name: form.name.trim(),
  status: form.status,
  sortOrder: parseIntegerField(form.sortOrder, labels.sortOrderLabel),
  presentation: presentation ?? emptySkuPresentation(),
  facts: buildSkuFacts(form, productType, labels),
  pricingModel: buildSkuPricingModel(form, labels),
  cancellationPolicyRef: cancellationPolicyRef ?? null,
});
