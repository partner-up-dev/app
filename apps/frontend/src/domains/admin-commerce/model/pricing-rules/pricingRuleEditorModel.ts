import type { AdminOfferInput } from "@/domains/admin-commerce/queries/useAdminCommerce";
import {
  buildJsonLogicRule,
  toJsonLogicRuleDraft,
  type JsonLogicFieldOption,
  type JsonLogicRuleBuildLabels,
  type JsonLogicRuleDraft,
} from "@/domains/admin-commerce/model/json-logic/jsonLogicRuleEditorModel";
import {
  createDraftId,
  isRecord,
  parseIntegerField,
  parseOptionalPositiveInteger,
  type NumberInput,
} from "@/domains/admin-commerce/model/product-management/shared";

export type CommercePricingRule = AdminOfferInput["pricingRules"][number];
export type CommercePricingRules = AdminOfferInput["pricingRules"];
export type PricingRuleTargetLevel = CommercePricingRule["target"]["level"];
type ResetPricingModelMode = "FIXED_TOTAL" | "PRESERVE";

export type PricingRuleDraft = {
  draftId: string;
  id: NumberInput;
  label: string;
  description: string;
  conditionDraft: JsonLogicRuleDraft;
  actionType: CommercePricingRule["action"]["type"];
  amountFen: NumberInput;
  ratioBps: NumberInput;
  resetPricingModelMode: ResetPricingModelMode;
  resetAmountFen: NumberInput;
  resetPricingModel: unknown;
  targetLevel: PricingRuleTargetLevel;
  targetIdText: string;
  continue: boolean;
};

export type PricingRuleBuildLabels = {
  pricingRuleIdLabel: string;
  targetIdLabel: string;
  amountFenLabel: string;
  ratioBpsLabel: string;
  resetAmountFenLabel: string;
};

const isFixedTotalPricingModel = (
  value: unknown,
): value is { type: "FIXED_TOTAL"; amountFen: number } =>
  isRecord(value) &&
  value.type === "FIXED_TOTAL" &&
  typeof value.amountFen === "number";

const readTargetIdText = (target: CommercePricingRule["target"]): string => {
  if (target.level === "SKU" && typeof target.skuId === "number") {
    return String(target.skuId);
  }
  if (target.level === "SPU" && typeof target.spuId === "number") {
    return String(target.spuId);
  }
  return "";
};

export const toPricingRuleDrafts = (
  rules: readonly CommercePricingRule[],
): PricingRuleDraft[] =>
  rules.map((rule) => {
    const resetPricingModel =
      rule.action.type === "RESET" ? rule.action.payload.pricingModel : null;
    const fixedResetModel = isFixedTotalPricingModel(resetPricingModel)
      ? resetPricingModel
      : null;

    return {
      draftId: createDraftId("pricing-rule"),
      id: rule.id,
      label: rule.label,
      description: rule.description,
      conditionDraft: toPricingConditionRuleDraft(rule.conditionRule),
      actionType: rule.action.type,
      amountFen: rule.action.type === "MINUS" ? rule.action.payload.amountFen : 0,
      ratioBps: rule.action.type === "RATIO" ? rule.action.payload.ratioBps : 10000,
      resetPricingModelMode:
        fixedResetModel || resetPricingModel === null ? "FIXED_TOTAL" : "PRESERVE",
      resetAmountFen: fixedResetModel?.amountFen ?? 0,
      resetPricingModel,
      targetLevel: rule.target.level,
      targetIdText: readTargetIdText(rule.target),
      continue: rule.continue,
    };
  });

const buildPricingRuleTarget = (
  rule: PricingRuleDraft,
  labels: PricingRuleBuildLabels,
): CommercePricingRule["target"] => {
  if (rule.targetLevel === "ORDER") {
    return { level: "ORDER" };
  }

  const targetId = parseOptionalPositiveInteger(
    rule.targetIdText,
    labels.targetIdLabel,
  );

  if (rule.targetLevel === "SPU") {
    return targetId === undefined
      ? { level: "SPU" }
      : { level: "SPU", spuId: targetId };
  }

  return targetId === undefined
    ? { level: "SKU" }
    : { level: "SKU", skuId: targetId };
};

export const buildPricingRules = (
  rules: readonly PricingRuleDraft[],
  labels: PricingRuleBuildLabels,
): CommercePricingRules =>
  rules.map((rule) => {
    const id = parseIntegerField(rule.id, labels.pricingRuleIdLabel);

    let action: CommercePricingRule["action"];
    if (rule.actionType === "MINUS") {
      action = {
        type: "MINUS",
        payload: {
          amountFen: parseIntegerField(rule.amountFen, labels.amountFenLabel),
        },
      };
    } else if (rule.actionType === "RATIO") {
      action = {
        type: "RATIO",
        payload: {
          ratioBps: parseIntegerField(rule.ratioBps, labels.ratioBpsLabel, { min: 0 }),
        },
      };
    } else {
      action = {
        type: "RESET",
        payload: {
          pricingModel:
            rule.resetPricingModelMode === "PRESERVE" && rule.resetPricingModel !== null
              ? rule.resetPricingModel
              : {
                  type: "FIXED_TOTAL",
                  amountFen: parseIntegerField(
                    rule.resetAmountFen,
                    labels.resetAmountFenLabel,
                    { min: 0 },
                  ),
                },
        },
      };
    }

    return {
      id,
      label: rule.label.trim(),
      description: rule.description.trim(),
      conditionRule: buildPricingConditionRule(
        rule.conditionDraft,
        rule.targetLevel,
      ),
      action,
      target: buildPricingRuleTarget(rule, labels),
      continue: rule.continue,
    };
  });

export const createPricingRuleDraft = (
  existingRules: readonly PricingRuleDraft[],
): PricingRuleDraft => {
  const nextId =
    existingRules.reduce((max, rule) => {
      const parsed = typeof rule.id === "number" ? rule.id : Number(rule.id);
      return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
    }, 0) + 1;
  return {
    draftId: createDraftId("pricing-rule"),
    id: nextId,
    label: "",
    description: "",
    conditionDraft: createPricingConditionRuleDraft(),
    actionType: "MINUS",
    amountFen: 0,
    ratioBps: 10000,
    resetPricingModelMode: "FIXED_TOTAL",
    resetAmountFen: 0,
    resetPricingModel: null,
    targetLevel: "SKU",
    targetIdText: "",
    continue: true,
  };
};

const commonPricingConditionFields = [
  {
    path: "target.level",
    label: "目标层级",
    valueKind: "string",
    valueOptions: [
      { value: "SKU", label: "SKU" },
      { value: "SPU", label: "SPU" },
      { value: "ORDER", label: "ORDER" },
    ],
  },
  {
    path: "amountFen",
    label: "当前金额",
    valueKind: "number",
  },
  {
    path: "pricingModel.type",
    label: "价格模型类型",
    valueKind: "string",
    valueOptions: [
      { value: "FIXED_TOTAL", label: "FIXED_TOTAL" },
      { value: "DYNAMIC_QUOTE", label: "DYNAMIC_QUOTE" },
    ],
  },
] satisfies readonly JsonLogicFieldOption[];

const itemPricingConditionFields = [
  {
    path: "sku.id",
    label: "SKU ID",
    valueKind: "number",
  },
  {
    path: "spu.id",
    label: "SPU ID",
    valueKind: "number",
  },
  {
    path: "spu.skuSelectionPolicy.type",
    label: "SKU 选择策略",
    valueKind: "string",
    valueOptions: [{ value: "EXACTLY_ONE", label: "EXACTLY_ONE" }],
  },
  {
    path: "spu.quantityPolicy.type",
    label: "数量策略",
    valueKind: "string",
    valueOptions: [
      { value: "FIXED", label: "FIXED" },
      { value: "PER_PARTICIPANT", label: "PER_PARTICIPANT" },
      { value: "USER_SELECTED", label: "USER_SELECTED" },
    ],
  },
] satisfies readonly JsonLogicFieldOption[];

const orderPricingConditionFields = [
  {
    path: "order.serviceTime",
    label: "服务时间",
    valueKind: "string",
  },
  {
    path: "order.quoteTotalFen",
    label: "报价总额",
    valueKind: "number",
  },
] satisfies readonly JsonLogicFieldOption[];

export const getPricingConditionRuleFields = (
  targetLevel: PricingRuleTargetLevel,
): readonly JsonLogicFieldOption[] =>
  targetLevel === "ORDER"
    ? [...commonPricingConditionFields, ...orderPricingConditionFields]
    : [
        ...commonPricingConditionFields,
        ...itemPricingConditionFields,
        ...orderPricingConditionFields,
      ];

export const createPricingConditionRuleDraft = (): JsonLogicRuleDraft =>
  toJsonLogicRuleDraft(null, getPricingConditionRuleFields("SKU"));

export const toPricingConditionRuleDraft = (
  rule: unknown,
): JsonLogicRuleDraft =>
  toJsonLogicRuleDraft(rule, getPricingConditionRuleFields("SKU"));

export const buildPricingConditionRule = (
  draft: JsonLogicRuleDraft,
  targetLevel: PricingRuleTargetLevel,
  labels?: Partial<JsonLogicRuleBuildLabels>,
): unknown =>
  buildJsonLogicRule(draft, {
    fields: getPricingConditionRuleFields(targetLevel),
    alwaysRule: null,
    labels,
  });
