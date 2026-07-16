import type { PRId } from "@partner-up-dev/backend";
import { computed, reactive } from "vue";

export type RouteHandoffRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type MatchedPRHandoffPhase = "IDLE" | "PREVIEW" | "NAVIGATING" | "ALIGNING" | "SETTLING";

type MatchedPRHandoffState = {
  phase: MatchedPRHandoffPhase;
  prId: PRId | null;
  originRect: RouteHandoffRect | null;
  targetRect: RouteHandoffRect | null;
};

const state = reactive<MatchedPRHandoffState>({
  phase: "IDLE",
  prId: null,
  originRect: null,
  targetRect: null,
});

const reset = () => {
  state.phase = "IDLE";
  state.prId = null;
  state.originRect = null;
  state.targetRect = null;
};

export const useMatchedPRHandoff = () => {
  const isActive = computed(() => state.phase !== "IDLE");

  const begin = (input: { prId: PRId; originRect: RouteHandoffRect }) => {
    state.phase = "PREVIEW";
    state.prId = input.prId;
    state.originRect = input.originRect;
    state.targetRect = null;
  };

  const markNavigating = () => {
    if (state.phase !== "PREVIEW") {
      return;
    }
    state.phase = "NAVIGATING";
  };

  const registerTargetRect = (prId: PRId, rect: RouteHandoffRect) => {
    if (state.prId !== prId) {
      return;
    }
    if (state.phase !== "NAVIGATING" && state.phase !== "ALIGNING") {
      return;
    }

    state.targetRect = rect;
    state.phase = "ALIGNING";
  };

  const beginSettling = () => {
    if (state.phase !== "ALIGNING") {
      return;
    }
    state.phase = "SETTLING";
  };

  const isActiveForPR = (prId: PRId | null): boolean =>
    prId !== null && state.prId === prId && state.phase !== "IDLE";

  const shouldHideTargetForPR = (prId: PRId | null): boolean =>
    prId !== null &&
    state.prId === prId &&
    (state.phase === "NAVIGATING" || state.phase === "ALIGNING");

  return {
    state,
    isActive,
    begin,
    cancel: reset,
    finish: reset,
    markNavigating,
    registerTargetRect,
    beginSettling,
    isActiveForPR,
    shouldHideTargetForPR,
  };
};
