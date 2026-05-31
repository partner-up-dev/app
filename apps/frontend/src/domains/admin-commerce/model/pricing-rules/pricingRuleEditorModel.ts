import type { AdminProductSpuInput } from "@/domains/admin-commerce/queries/useAdminCommerce";
import {
  createDraftId,
  isRecord,
  parseIntegerField,
  parseOptionalPositiveInteger,
  type NumberInput,
} from "@/domains/admin-commerce/model/product-management/shared";

export type CommercePricingRule = AdminProductSpuInput["pricingRules"][number];
export type CommercePricingRules = AdminProductSpuInput["pricingRules"];
export type PricingRuleTargetLevel = CommercePricingRule["target"]["level"];
type PricingRuleConditionMode = "ALWAYS" | "PRESERVE";
type ResetPricingModelMode = "FIXED_TOTAL" | "PRESERVE";

export type PricingRuleDraft = {
  draftId: string;
  id: NumberInput;
  label: string;
  description: string;
  conditionMode: PricingRuleConditionMode;
  conditionRule: unknown;
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
      conditionMode: rule.conditionRule === null ? "ALWAYS" : "PRESERVE",
      conditionRule: rule.conditionRule,
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
      conditionRule: rule.conditionMode === "ALWAYS" ? null : rule.conditionRule,
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
    conditionMode: "ALWAYS",
    conditionRule: null,
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
