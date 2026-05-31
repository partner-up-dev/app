import type { AdminProductSpuInput } from "@/domains/admin-commerce/queries/useAdminCommerce";
import {
  createDraftId,
  parseIntegerField,
  type NumberInput,
} from "@/domains/admin-commerce/model/product-management/shared";
import {
  buildPricingRules,
  toPricingRuleDrafts,
  type PricingRuleBuildLabels,
  type PricingRuleDraft,
} from "@/domains/admin-commerce/model/pricing-rules/pricingRuleEditorModel";

type RentalServicePolicy = Extract<AdminProductSpuInput["servicePolicy"], { type: "RENTAL" }>;
type QuantityPolicyType = AdminProductSpuInput["salesPolicy"]["quantityPolicy"]["type"];

export type FactValueKind = "string" | "number" | "boolean" | "null" | "preserve";

export type EditableStringItem = {
  id: string;
  value: string;
};

export type ProductParameterItemDraft = {
  id: string;
  label: string;
  value: string;
};

export type ProductParameterGroupDraft = {
  id: string;
  title: string;
  items: ProductParameterItemDraft[];
};

export type ProductNoticeBlockDraft = {
  id: string;
  title: string;
  content: string;
};

export type FactEntryDraft = {
  id: string;
  key: string;
  valueKind: FactValueKind;
  valueText: string;
  booleanValue: boolean;
  originalValue: unknown;
};

export type SpuEditorForm = {
  name: string;
  productType: AdminProductSpuInput["productType"];
  status: AdminProductSpuInput["status"];
  quantityPolicyType: QuantityPolicyType;
  fixedQuantity: NumberInput;
  userSelectedMin: NumberInput;
  userSelectedMax: NumberInput;
  rentalBookingLeadTimeMinutes: NumberInput;
  rentalRequiresContactPhone: boolean;
  rentalRequiresRealName: boolean;
  rentalRequiresNationalId: boolean;
  pricingRules: PricingRuleDraft[];
  heroImageAssetIds: EditableStringItem[];
  detailImageAssetIds: EditableStringItem[];
  sellingPoints: EditableStringItem[];
  parameterGroups: ProductParameterGroupDraft[];
  noticeBlocks: ProductNoticeBlockDraft[];
  facts: FactEntryDraft[];
};

export type SpuBuildLabels = PricingRuleBuildLabels & {
  quantityRangeError: string;
  fixedQuantityLabel: string;
  minQuantityLabel: string;
  maxQuantityLabel: string;
  serviceRentalLeadTimeLabel: string;
  factsLabel: string;
  factKeyLabel: string;
};

export const defaultRentalServicePolicy = (): RentalServicePolicy => ({
  type: "RENTAL",
  bookingLeadTimeMinutes: 1440,
  requiresContactPhone: true,
  requiresRealName: true,
  requiresNationalId: false,
});

export const emptySpuInput = (): AdminProductSpuInput => ({
  name: "",
  productType: "RENTAL",
  status: "DRAFT",
  salesPolicy: {
    skuSelectionPolicy: { type: "EXACTLY_ONE" },
    quantityPolicy: { type: "FIXED", quantity: 1 },
  },
  servicePolicy: defaultRentalServicePolicy(),
  pricingRules: [],
  presentation: {
    heroImageAssetIds: [],
    detailImageAssetIds: [],
    sellingPoints: [],
    parameterGroups: [],
    noticeBlocks: [],
  },
  facts: {},
});

const toStringItems = (values: string[], prefix: string): EditableStringItem[] =>
  values.map((value) => ({ id: createDraftId(prefix), value }));

const buildStringList = (items: EditableStringItem[]): string[] =>
  items.map((item) => item.value.trim()).filter((value) => value.length > 0);

const toFactDrafts = (facts: Record<string, unknown>): FactEntryDraft[] =>
  Object.entries(facts).map(([key, value]) => {
    if (typeof value === "string") {
      return createFactDraft({ key, valueKind: "string", valueText: value, originalValue: value });
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return createFactDraft({
        key,
        valueKind: "number",
        valueText: String(value),
        originalValue: value,
      });
    }
    if (typeof value === "boolean") {
      return createFactDraft({
        key,
        valueKind: "boolean",
        booleanValue: value,
        originalValue: value,
      });
    }
    if (value === null) {
      return createFactDraft({ key, valueKind: "null", originalValue: value });
    }
    return createFactDraft({ key, valueKind: "preserve", originalValue: value });
  });

const toParameterGroups = (
  groups: AdminProductSpuInput["presentation"]["parameterGroups"],
): ProductParameterGroupDraft[] =>
  groups.map((group) => ({
    id: createDraftId("parameter-group"),
    title: group.title,
    items: group.items.map((item) => ({
      id: createDraftId("parameter-item"),
      label: item.label,
      value: item.value,
    })),
  }));

const toNoticeBlocks = (
  blocks: AdminProductSpuInput["presentation"]["noticeBlocks"],
): ProductNoticeBlockDraft[] =>
  blocks.map((block) => ({
    id: createDraftId("notice"),
    title: block.title,
    content: block.content,
  }));

export const toSpuForm = (input: AdminProductSpuInput): SpuEditorForm => {
  const quantityPolicy = input.salesPolicy.quantityPolicy;
  const rentalPolicy =
    input.servicePolicy.type === "RENTAL"
      ? input.servicePolicy
      : defaultRentalServicePolicy();

  return {
    name: input.name,
    productType: input.productType,
    status: input.status,
    quantityPolicyType: quantityPolicy.type,
    fixedQuantity: quantityPolicy.type === "FIXED" ? quantityPolicy.quantity : 1,
    userSelectedMin: quantityPolicy.type === "USER_SELECTED" ? quantityPolicy.min : 1,
    userSelectedMax: quantityPolicy.type === "USER_SELECTED" ? quantityPolicy.max : 1,
    rentalBookingLeadTimeMinutes: rentalPolicy.bookingLeadTimeMinutes,
    rentalRequiresContactPhone: rentalPolicy.requiresContactPhone,
    rentalRequiresRealName: rentalPolicy.requiresRealName,
    rentalRequiresNationalId: rentalPolicy.requiresNationalId,
    pricingRules: toPricingRuleDrafts(input.pricingRules),
    heroImageAssetIds: toStringItems(input.presentation.heroImageAssetIds, "hero-image"),
    detailImageAssetIds: toStringItems(input.presentation.detailImageAssetIds, "detail-image"),
    sellingPoints: toStringItems(input.presentation.sellingPoints, "selling-point"),
    parameterGroups: toParameterGroups(input.presentation.parameterGroups),
    noticeBlocks: toNoticeBlocks(input.presentation.noticeBlocks),
    facts: toFactDrafts(input.facts),
  };
};

const buildQuantityPolicy = (
  form: SpuEditorForm,
  labels: SpuBuildLabels,
): AdminProductSpuInput["salesPolicy"]["quantityPolicy"] => {
  if (form.quantityPolicyType === "PER_PARTICIPANT") {
    return { type: "PER_PARTICIPANT" };
  }
  if (form.quantityPolicyType === "USER_SELECTED") {
    const min = parseIntegerField(form.userSelectedMin, labels.minQuantityLabel, { min: 0 });
    const max = parseIntegerField(form.userSelectedMax, labels.maxQuantityLabel, { min: 1 });
    if (min > max) {
      throw new Error(labels.quantityRangeError);
    }
    return { type: "USER_SELECTED", min, max };
  }
  return {
    type: "FIXED",
    quantity: parseIntegerField(form.fixedQuantity, labels.fixedQuantityLabel, { min: 1 }),
  };
};

const buildServicePolicy = (
  form: SpuEditorForm,
  labels: SpuBuildLabels,
): AdminProductSpuInput["servicePolicy"] => {
  if (form.productType === "RIDE_HAILING") {
    return { type: "RIDE_HAILING" };
  }
  return {
    type: "RENTAL",
    bookingLeadTimeMinutes: parseIntegerField(
      form.rentalBookingLeadTimeMinutes,
      labels.serviceRentalLeadTimeLabel,
      { min: 0 },
    ),
    requiresContactPhone: form.rentalRequiresContactPhone,
    requiresRealName: form.rentalRequiresRealName,
    requiresNationalId: form.rentalRequiresNationalId,
  };
};

const buildFactValue = (fact: FactEntryDraft, labels: SpuBuildLabels): unknown => {
  if (fact.valueKind === "preserve") return fact.originalValue;
  if (fact.valueKind === "null") return null;
  if (fact.valueKind === "boolean") return fact.booleanValue;
  if (fact.valueKind === "number") {
    const parsed = Number(fact.valueText.trim());
    if (!Number.isFinite(parsed)) {
      throw new Error(`${fact.key || labels.factKeyLabel} 必须是数字`);
    }
    return parsed;
  }
  return fact.valueText;
};

const buildFactsRecord = (
  facts: FactEntryDraft[],
  labels: SpuBuildLabels,
): Record<string, unknown> => {
  const record: Record<string, unknown> = {};
  const seen = new Set<string>();
  for (const fact of facts) {
    const key = fact.key.trim();
    if (!key) continue;
    if (seen.has(key)) {
      throw new Error(`${labels.factsLabel} 有重复 Key: ${key}`);
    }
    seen.add(key);
    record[key] = buildFactValue(fact, labels);
  }
  return record;
};

const buildPresentation = (
  form: SpuEditorForm,
): AdminProductSpuInput["presentation"] => ({
  heroImageAssetIds: buildStringList(form.heroImageAssetIds),
  detailImageAssetIds: buildStringList(form.detailImageAssetIds),
  sellingPoints: buildStringList(form.sellingPoints),
  parameterGroups: form.parameterGroups
    .map((group) => ({
      title: group.title.trim(),
      items: group.items
        .map((item) => ({
          label: item.label.trim(),
          value: item.value.trim(),
        }))
        .filter((item) => item.label.length > 0 || item.value.length > 0),
    }))
    .filter((group) => group.title.length > 0 || group.items.length > 0),
  noticeBlocks: form.noticeBlocks
    .map((block) => ({
      title: block.title.trim(),
      content: block.content.trim(),
    }))
    .filter((block) => block.title.length > 0 || block.content.length > 0),
});

export const buildSpuInput = (
  form: SpuEditorForm,
  labels: SpuBuildLabels,
): AdminProductSpuInput => ({
  name: form.name.trim(),
  productType: form.productType,
  status: form.status,
  salesPolicy: {
    skuSelectionPolicy: { type: "EXACTLY_ONE" },
    quantityPolicy: buildQuantityPolicy(form, labels),
  },
  servicePolicy: buildServicePolicy(form, labels),
  pricingRules: buildPricingRules(form.pricingRules, labels),
  presentation: buildPresentation(form),
  facts: buildFactsRecord(form.facts, labels),
});

export const createParameterGroupDraft = (): ProductParameterGroupDraft => ({
  id: createDraftId("parameter-group"),
  title: "",
  items: [],
});

export const createParameterItemDraft = (): ProductParameterItemDraft => ({
  id: createDraftId("parameter-item"),
  label: "",
  value: "",
});

export const createNoticeBlockDraft = (): ProductNoticeBlockDraft => ({
  id: createDraftId("notice"),
  title: "",
  content: "",
});

export const createFactDraft = (
  overrides: Partial<Omit<FactEntryDraft, "id">> = {},
): FactEntryDraft => ({
  id: createDraftId("fact"),
  key: "",
  valueKind: "string",
  valueText: "",
  booleanValue: false,
  originalValue: "",
  ...overrides,
});
