export type PlacementType = "BUTTON";

export type PlacementSlotKey = "PR_UTILITY_ACTIONS_BUTTON";

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

export type PlacementInstance = {
  id: number;
  slotKey: PlacementSlotKey;
  placementType: PlacementType;
  matchingRule: unknown;
  priority: number;
  creative: ButtonPlacementCreative;
  target: PlacementTarget;
};
