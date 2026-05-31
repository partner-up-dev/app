import * as jsonLogicNamespace from "json-logic-js";
import type { RulesLogic } from "json-logic-js";
import type { Offer } from "../../../entities/offer";
import type { ProductSku } from "../../../entities/product-sku";
import type { ProductSpu } from "../../../entities/product-spu";
import type {
  FixedTotalPricingModel,
  PriceExplanation,
  PricingModel,
  PricingRule,
  PricingRuleTarget,
} from "../../merchandising";
import type {
  OrderItemPricingSnapshot,
  OrderPricingSnapshot,
} from "../model";

const jsonLogicModule = jsonLogicNamespace as typeof jsonLogicNamespace & {
  default?: typeof jsonLogicNamespace;
};

const jsonLogic = jsonLogicModule.default ?? jsonLogicModule;

type PricingTargetData = {
  target: PricingRuleTarget;
  pricingModel: PricingModel;
  amountFen: number | null;
  sku?: {
    id: number;
    facts: unknown;
  };
  spu?: {
    id: number;
    facts: unknown;
    skuSelectionPolicy: ProductSpu["salesPolicy"]["skuSelectionPolicy"];
    quantityPolicy: ProductSpu["salesPolicy"]["quantityPolicy"];
  };
  order?: {
    selectedSkuIds: number[];
    serviceTime?: string | null;
    quoteTotalFen?: number | null;
  };
};

type PricingItemInput = {
  itemId: string;
  spu: ProductSpu;
  sku: ProductSku;
  quantity: number;
};

export type PricingApplicationInput = {
  offer: Offer;
  items: PricingItemInput[];
  orderContext?: {
    serviceTime?: string | null;
    quoteTotalFen?: number | null;
  };
};

type PricingState = {
  pricingModel: PricingModel;
  amountFen: number;
  explanations: PriceExplanation[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isJsonLogicRule = (value: unknown): value is RulesLogic =>
  value === null ||
  typeof value === "boolean" ||
  typeof value === "number" ||
  typeof value === "string" ||
  (isRecord(value) && jsonLogic.is_logic(value));

const isFixedTotalPricingModel = (
  value: PricingModel,
): value is FixedTotalPricingModel => value.type === "FIXED_TOTAL";

function resolvePricingModelAmount(pricingModel: PricingModel): number {
  if (isFixedTotalPricingModel(pricingModel)) {
    return pricingModel.amountFen;
  }

  throw new Error("Dynamic quote pricing requires a resolved quote input");
}

function matchesTarget(
  ruleTarget: PricingRuleTarget,
  candidateTarget: PricingRuleTarget,
): boolean {
  if (ruleTarget.level !== candidateTarget.level) return false;

  if (ruleTarget.level === "SKU" && candidateTarget.level === "SKU") {
    return ruleTarget.skuId === undefined || ruleTarget.skuId === candidateTarget.skuId;
  }

  if (ruleTarget.level === "SPU" && candidateTarget.level === "SPU") {
    return ruleTarget.spuId === undefined || ruleTarget.spuId === candidateTarget.spuId;
  }

  return ruleTarget.level === "ORDER";
}

function doesRuleMatch(rule: PricingRule, targetData: PricingTargetData): boolean {
  if (!matchesTarget(rule.target, targetData.target)) return false;
  if (!isJsonLogicRule(rule.conditionRule)) return false;

  try {
    return jsonLogic.truthy(
      jsonLogic.apply(rule.conditionRule as RulesLogic, targetData),
    );
  } catch {
    return false;
  }
}

function applyPricingRule(input: {
  phase: PriceExplanation["phase"];
  rule: PricingRule;
  state: PricingState;
  target: PricingRuleTarget;
}): PricingState {
  const beforeAmountFen = input.state.amountFen;
  let nextPricingModel = input.state.pricingModel;
  let nextAmountFen = beforeAmountFen;

  if (input.rule.action.type === "RESET") {
    nextPricingModel = input.rule.action.payload.pricingModel;
    nextAmountFen = resolvePricingModelAmount(nextPricingModel);
  }

  if (input.rule.action.type === "MINUS") {
    nextAmountFen = Math.max(
      0,
      beforeAmountFen - input.rule.action.payload.amountFen,
    );
  }

  if (input.rule.action.type === "RATIO") {
    nextAmountFen = Math.round(
      (beforeAmountFen * input.rule.action.payload.ratioBps) / 10_000,
    );
  }

  return {
    pricingModel: nextPricingModel,
    amountFen: nextAmountFen,
    explanations: [
      ...input.state.explanations,
      {
        phase: input.phase,
        sourceType: "PRICING_RULE",
        sourceId: `rule:${input.phase}:${input.target.level}:${input.rule.id}`,
        label: input.rule.label,
        description: input.rule.description,
        deltaFen: nextAmountFen - beforeAmountFen,
        resultAmountFen: nextAmountFen,
      },
    ],
  };
}

function applyRules(input: {
  phase: PriceExplanation["phase"];
  rules: readonly PricingRule[];
  state: PricingState;
  targetData: Omit<PricingTargetData, "pricingModel" | "amountFen">;
}): PricingState {
  let state = input.state;

  for (const rule of input.rules) {
    const targetData: PricingTargetData = {
      ...input.targetData,
      pricingModel: state.pricingModel,
      amountFen: state.amountFen,
    };

    if (!doesRuleMatch(rule, targetData)) continue;

    state = applyPricingRule({
      phase: input.phase,
      rule,
      state,
      target: input.targetData.target,
    });

    if (!rule.continue) break;
  }

  return state;
}

function buildSkuBaseState(item: PricingItemInput): PricingState {
  const amountFen = resolvePricingModelAmount(item.sku.pricingModel);

  return {
    pricingModel: item.sku.pricingModel,
    amountFen,
    explanations: [
      {
        phase: "SKU_BASE",
        sourceType: "PRICING_MODEL",
        sourceId: `sku:${item.sku.id}`,
        label: item.sku.name,
        description: "固定总价",
        deltaFen: amountFen,
        resultAmountFen: amountFen,
      },
    ],
  };
}

export class PricingApplication {
  resolve(input: PricingApplicationInput): OrderPricingSnapshot {
    if (input.items.length === 0) {
      throw new Error("Pricing requires at least one item");
    }

    const selectedSkuIds = input.items.map((item) => item.sku.id);
    const itemBreakdowns: OrderItemPricingSnapshot[] = [];

    for (const item of input.items) {
      const baseState = buildSkuBaseState(item);
      const spuState = applyRules({
        phase: "SPU_POLICY",
        rules: item.spu.pricingPolicy.rules,
        state: baseState,
        targetData: {
          target: {
            level: "SKU",
            skuId: item.sku.id,
          },
          sku: {
            id: item.sku.id,
            facts: item.sku.facts,
          },
          spu: {
            id: item.spu.id,
            facts: item.spu.facts,
            skuSelectionPolicy: item.spu.salesPolicy.skuSelectionPolicy,
            quantityPolicy: item.spu.salesPolicy.quantityPolicy,
          },
          order: {
            selectedSkuIds,
            serviceTime: input.orderContext?.serviceTime ?? null,
            quoteTotalFen: input.orderContext?.quoteTotalFen ?? null,
          },
        },
      });

      const offerSkuState = applyRules({
        phase: "OFFER_POLICY",
        rules: input.offer.pricingPolicy.rules,
        state: spuState,
        targetData: {
          target: {
            level: "SKU",
            skuId: item.sku.id,
          },
          sku: {
            id: item.sku.id,
            facts: item.sku.facts,
          },
          spu: {
            id: item.spu.id,
            facts: item.spu.facts,
            skuSelectionPolicy: item.spu.salesPolicy.skuSelectionPolicy,
            quantityPolicy: item.spu.salesPolicy.quantityPolicy,
          },
          order: {
            selectedSkuIds,
            serviceTime: input.orderContext?.serviceTime ?? null,
            quoteTotalFen: input.orderContext?.quoteTotalFen ?? null,
          },
        },
      });

      const offerSpuState = applyRules({
        phase: "OFFER_POLICY",
        rules: input.offer.pricingPolicy.rules,
        state: offerSkuState,
        targetData: {
          target: {
            level: "SPU",
            spuId: item.spu.id,
          },
          sku: {
            id: item.sku.id,
            facts: item.sku.facts,
          },
          spu: {
            id: item.spu.id,
            facts: item.spu.facts,
            skuSelectionPolicy: item.spu.salesPolicy.skuSelectionPolicy,
            quantityPolicy: item.spu.salesPolicy.quantityPolicy,
          },
          order: {
            selectedSkuIds,
            serviceTime: input.orderContext?.serviceTime ?? null,
            quoteTotalFen: input.orderContext?.quoteTotalFen ?? null,
          },
        },
      });

      itemBreakdowns.push({
        itemId: item.itemId,
        resolvedAmountFen: offerSpuState.amountFen * item.quantity,
        explanations: offerSpuState.explanations,
      });
    }

    const subtotalFen = itemBreakdowns.reduce(
      (sum, item) => sum + item.resolvedAmountFen,
      0,
    );
    const orderInitialState: PricingState = {
      pricingModel: {
        type: "FIXED_TOTAL",
        amountFen: subtotalFen,
      },
      amountFen: subtotalFen,
      explanations: [],
    };
    const orderState = applyRules({
      phase: "OFFER_POLICY",
      rules: input.offer.pricingPolicy.rules,
      state: orderInitialState,
      targetData: {
        target: {
          level: "ORDER",
        },
        order: {
          selectedSkuIds,
          serviceTime: input.orderContext?.serviceTime ?? null,
          quoteTotalFen: input.orderContext?.quoteTotalFen ?? null,
        },
      },
    });

    return {
      currency: "CNY",
      itemBreakdowns,
      orderLevelExplanations: orderState.explanations,
      subtotalFen,
      totalFen: orderState.amountFen,
    };
  }
}
