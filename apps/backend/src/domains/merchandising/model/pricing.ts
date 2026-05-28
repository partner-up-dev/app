export type QuoteNumericExpr =
  | {
      type: "CONST";
      value: number;
    }
  | {
      type: "INPUT";
      path: string;
    }
  | {
      type: "VAR";
      name: string;
    }
  | {
      type: "ADD";
      args: QuoteNumericExpr[];
    }
  | {
      type: "SUB";
      left: QuoteNumericExpr;
      right: QuoteNumericExpr;
    }
  | {
      type: "MUL";
      left: QuoteNumericExpr;
      right: QuoteNumericExpr;
    }
  | {
      type: "DIV";
      left: QuoteNumericExpr;
      right: QuoteNumericExpr;
      rounding?: "NONE" | "CEIL" | "FLOOR" | "ROUND";
    }
  | {
      type: "ROUND";
      expr: QuoteNumericExpr;
      mode: "CEIL" | "FLOOR" | "ROUND";
      unit: number;
    }
  | {
      type: "MAX";
      args: QuoteNumericExpr[];
    }
  | {
      type: "MIN";
      args: QuoteNumericExpr[];
    }
  | {
      type: "IF";
      when: unknown;
      then: QuoteNumericExpr;
      else: QuoteNumericExpr;
    };

export type QuoteCalculationDsl = {
  version: 1;
  currency: "CNY";
  variables?: Array<{
    name: string;
    value: QuoteNumericExpr;
  }>;
  components: Array<{
    id: string;
    label: string;
    description?: string;
    when?: unknown;
    amount: QuoteNumericExpr;
  }>;
  postAdjustments?: Array<
    | {
        id: string;
        type: "MIN_TOTAL";
        label: string;
        amountFen: number;
      }
    | {
        id: string;
        type: "MAX_TOTAL";
        label: string;
        amountFen: number;
      }
  >;
};

export type FixedTotalPricingModel = {
  type: "FIXED_TOTAL";
  amountFen: number;
};

export type DynamicQuotePricingModel = {
  type: "DYNAMIC_QUOTE";
  calculatorSpec: QuoteCalculationDsl;
};

export type PricingModel =
  | FixedTotalPricingModel
  | DynamicQuotePricingModel;

export type PricingRuleAction =
  | {
      type: "RESET";
      payload: {
        pricingModel: PricingModel;
      };
    }
  | {
      type: "MINUS";
      payload: {
        amountFen: number;
      };
    }
  | {
      type: "RATIO";
      payload: {
        ratioBps: number;
      };
    };

export type PricingRuleTarget =
  | {
      level: "SKU";
      skuId?: number;
    }
  | {
      level: "SPU";
      spuId?: number;
    }
  | {
      level: "ORDER";
    };

export type PricingRule = {
  id: number;
  label: string;
  description: string;
  conditionRule: unknown;
  action: PricingRuleAction;
  target: PricingRuleTarget;
  continue: boolean;
};

export type PriceExplanationPhase =
  | "SKU_BASE"
  | "SPU_POLICY"
  | "OFFER_POLICY";

export type PriceExplanationSourceType =
  | "PRICING_MODEL"
  | "QUOTE_COMPONENT"
  | "PRICING_RULE";

export type PriceExplanation = {
  phase: PriceExplanationPhase;
  sourceType: PriceExplanationSourceType;
  sourceId: string;
  label: string;
  description: string;
  deltaFen: number | null;
  resultAmountFen: number | null;
};
