export type DemandCardSwipePreviewPhase =
  | "idle"
  | "hinting"
  | "dragging"
  | "exiting"
  | "rebounding";

export type DemandCardSwipePreviewAnchorCorner = "top" | "bottom";

export type DemandCardSwipePreviewState = {
  intensity: number;
  phase: DemandCardSwipePreviewPhase;
  anchorViewportY: number | null;
  anchorCorner: DemandCardSwipePreviewAnchorCorner | null;
};

export const DEMAND_CARD_EXIT_TIMING = "280ms cubic-bezier(0.16, 1, 0.3, 1)";
export const DEMAND_CARD_REBOUND_TIMING =
  "440ms cubic-bezier(0.22, 1.35, 0.36, 1)";

export const DEMAND_CARD_EXIT_TRANSITION =
  `transform ${DEMAND_CARD_EXIT_TIMING}`;
export const DEMAND_CARD_REBOUND_TRANSITION =
  `transform ${DEMAND_CARD_REBOUND_TIMING}`;

export const clampDemandCardSwipePreviewIntensity = (value: number): number =>
  Math.max(Math.min(value, 1), -1);

export const createDemandCardSwipePreviewState = (
  intensity: number,
  phase: DemandCardSwipePreviewPhase,
  anchorViewportY: number | null = null,
  anchorCorner: DemandCardSwipePreviewAnchorCorner | null = null,
): DemandCardSwipePreviewState => ({
  intensity: clampDemandCardSwipePreviewIntensity(intensity),
  phase,
  anchorViewportY,
  anchorCorner,
});

export const createIdleDemandCardSwipePreviewState =
  (): DemandCardSwipePreviewState =>
    createDemandCardSwipePreviewState(0, "idle", null, null);
