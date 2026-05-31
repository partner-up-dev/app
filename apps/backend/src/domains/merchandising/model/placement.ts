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

export type PlacementBindingFieldKey =
  | "participantCount"
  | "serviceStartAt"
  | "serviceEndAt";

export type PlacementBindingContextPath =
  | "activeParticipantCount"
  | "time.startAt"
  | "time.endAt";

export type PlacementBindingRule = {
  fieldKey: PlacementBindingFieldKey;
  contextPath: PlacementBindingContextPath;
  lock: true;
};

export const defaultPrRentalPlacementBindingRules: PlacementBindingRule[] = [
  {
    fieldKey: "participantCount",
    contextPath: "activeParticipantCount",
    lock: true,
  },
  {
    fieldKey: "serviceStartAt",
    contextPath: "time.startAt",
    lock: true,
  },
  {
    fieldKey: "serviceEndAt",
    contextPath: "time.endAt",
    lock: true,
  },
];

export type PlacementInstance = {
  id: number;
  slotKey: PlacementSlotKey;
  placementType: PlacementType;
  matchingRule: PlacementMatchingRuleJson;
  priority: number;
  creative: ButtonPlacementCreative;
  target: PlacementTarget;
  bindingRules: PlacementBindingRule[];
};
