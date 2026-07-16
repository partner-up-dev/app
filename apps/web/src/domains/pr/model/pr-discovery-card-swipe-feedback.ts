export type PRDiscoveryCardSwipePreviewPhase =
  | "idle"
  | "hinting"
  | "dragging"
  | "exiting"
  | "rebounding";

export type PRDiscoveryCardSwipePreviewPivotCorner = "top" | "bottom";

export type PRDiscoveryCardSwipePreviewState = {
  intensity: number;
  phase: PRDiscoveryCardSwipePreviewPhase;
  pivotViewportY: number | null;
  pivotCorner: PRDiscoveryCardSwipePreviewPivotCorner | null;
};

export const PR_DISCOVERY_CARD_EXIT_TIMING = "280ms cubic-bezier(0.16, 1, 0.3, 1)";
export const PR_DISCOVERY_CARD_REBOUND_TIMING = "440ms cubic-bezier(0.22, 1.35, 0.36, 1)";

export const PR_DISCOVERY_CARD_EXIT_TRANSITION = `transform ${PR_DISCOVERY_CARD_EXIT_TIMING}`;
export const PR_DISCOVERY_CARD_REBOUND_TRANSITION = `transform ${PR_DISCOVERY_CARD_REBOUND_TIMING}`;

export const clampPRDiscoveryCardSwipePreviewIntensity = (value: number): number =>
  Math.max(Math.min(value, 1), -1);

export const createPRDiscoveryCardSwipePreviewState = (
  intensity: number,
  phase: PRDiscoveryCardSwipePreviewPhase,
  pivotViewportY: number | null = null,
  pivotCorner: PRDiscoveryCardSwipePreviewPivotCorner | null = null,
): PRDiscoveryCardSwipePreviewState => ({
  intensity: clampPRDiscoveryCardSwipePreviewIntensity(intensity),
  phase,
  pivotViewportY,
  pivotCorner,
});

export const createIdlePRDiscoveryCardSwipePreviewState = (): PRDiscoveryCardSwipePreviewState =>
  createPRDiscoveryCardSwipePreviewState(0, "idle", null, null);
