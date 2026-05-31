import type { AdminProductSkuInput } from "@/domains/admin-commerce/queries/useAdminCommerce";
import {
  parseIntegerField,
  type NumberInput,
  type ProductType,
} from "@/domains/admin-commerce/model/product-management/shared";

type SkuPricingModel = AdminProductSkuInput["pricingModel"];
type SkuFacts = AdminProductSkuInput["facts"];

export type SkuEditorForm = {
  name: string;
  status: AdminProductSkuInput["status"];
  sortOrder: NumberInput;
  rentalZoneCode: string;
  rentalParticipantCount: NumberInput;
  rentalDurationMinutes: NumberInput;
  rideVehicleClass: string;
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
): value is Extract<SkuPricingModel, { type: "DYNAMIC_QUOTE" }> =>
  value.type === "DYNAMIC_QUOTE";

export const emptySkuInput = (): Omit<AdminProductSkuInput, "spuId"> => ({
  name: "",
  status: "DRAFT",
  sortOrder: 0,
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

export const toSkuForm = (
  input: Omit<AdminProductSkuInput, "spuId">,
): SkuEditorForm => {
  const pricingModel = input.pricingModel;
  return {
    name: input.name,
    status: input.status,
    sortOrder: input.sortOrder,
    rentalZoneCode: input.facts.type === "RENTAL" ? input.facts.zoneCode : "",
    rentalParticipantCount: input.facts.type === "RENTAL" ? input.facts.participantCount : 2,
    rentalDurationMinutes: input.facts.type === "RENTAL" ? input.facts.durationMinutes : 180,
    rideVehicleClass: input.facts.type === "RIDE_HAILING" ? input.facts.vehicleClass : "",
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
      type: "RIDE_HAILING",
      vehicleClass: form.rideVehicleClass.trim(),
    };
  }
  return {
    type: "RENTAL",
    zoneCode: form.rentalZoneCode.trim(),
    participantCount: parseIntegerField(
      form.rentalParticipantCount,
      labels.participantCountLabel,
      { min: 1 },
    ),
    durationMinutes: parseIntegerField(
      form.rentalDurationMinutes,
      labels.durationMinutesLabel,
      { min: 1 },
    ),
  };
};

const buildSkuPricingModel = (
  form: SkuEditorForm,
  labels: SkuBuildLabels,
): SkuPricingModel => {
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
  cancellationPolicyRef: AdminProductSkuInput["cancellationPolicyRef"],
  labels: SkuBuildLabels,
): Omit<AdminProductSkuInput, "spuId"> => ({
  name: form.name.trim(),
  status: form.status,
  sortOrder: parseIntegerField(form.sortOrder, labels.sortOrderLabel),
  facts: buildSkuFacts(form, productType, labels),
  pricingModel: buildSkuPricingModel(form, labels),
  cancellationPolicyRef: cancellationPolicyRef ?? null,
});
