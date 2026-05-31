import type { RulesLogic } from "json-logic-js";

export type PlacementType = "BUTTON";

export type PlacementSlotKey = "PR_UTILITY_ACTIONS_BUTTON";

export type PlacementMatchingRuleJson = RulesLogic;

export type PlacementTarget =
  | {
      kind: "OFFER";
      offerId: number;
    }
  | {
      kind: "ORDER";
      orderId: number;
    };

export type ButtonPlacementCreative = {
  title: string;
  subtitle?: string | null;
  ctaLabel: string;
};

export type PlacementBindingRule = {
  fieldKey: string;
  contextPath: string;
  lock: true;
};

export type PlacementInstance = {
  id: number;
  slotKey: PlacementSlotKey;
  placementType: PlacementType;
  matchingRule: PlacementMatchingRuleJson;
  priority: number;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  creative: ButtonPlacementCreative;
  target: PlacementTarget;
  bindingRules: PlacementBindingRule[];
};
