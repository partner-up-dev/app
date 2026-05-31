import type { RulesLogic } from "json-logic-js";

export type PlacementType = "BUTTON";

export type PlacementMatchingRuleJson = RulesLogic;

export type ButtonPlacementCreative = {
  ctaLabel: string;
  description?: string | null;
};

export type PlacementBindingRule = {
  fieldKey: string;
  contextPath: string;
  lock: true;
};

export type PlacementInstance = {
  id: number;
  placementType: PlacementType;
  offerId: number;
  matchingRule: PlacementMatchingRuleJson;
  priority: number;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  creative: ButtonPlacementCreative;
  bindingRules: PlacementBindingRule[];
};
