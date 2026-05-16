import { computed, onUnmounted, ref, watch, type Ref } from "vue";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";

const AUTO_EXPAND_DELAY_MS = 1000;
const AUTO_EXPAND_FLASH_DURATION_MS = 900;

export const useExpandableCardAttention = (input: {
  defaultExpanded: Ref<boolean>;
  autoExpandContextKey: Ref<string | number | null | undefined>;
}) => {
  const { prefersReducedMotion } = useReducedMotion();
  const expandableDefaultExpanded = ref(input.defaultExpanded.value);
  const expandableCardVersion = ref(0);
  const autoExpandHighlightActive = ref(false);
  let autoExpandTimerId: number | null = null;
  let autoExpandHighlightTimerId: number | null = null;
  let autoExpandHighlightAnimationFrameId: number | null = null;

  const expandableCardKey = computed(() => {
    const contextKey = input.autoExpandContextKey.value ?? "default";
    const expandedState = expandableDefaultExpanded.value
      ? "expanded"
      : "collapsed";
    return `${contextKey}:${expandedState}:${expandableCardVersion.value}`;
  });

  const clearAutoExpandTimer = () => {
    if (typeof window === "undefined" || autoExpandTimerId === null) {
      return;
    }

    window.clearTimeout(autoExpandTimerId);
    autoExpandTimerId = null;
  };

  const clearAutoExpandHighlightTimer = () => {
    if (typeof window === "undefined" || autoExpandHighlightTimerId === null) {
      return;
    }

    window.clearTimeout(autoExpandHighlightTimerId);
    autoExpandHighlightTimerId = null;
  };

  const clearAutoExpandHighlightAnimationFrame = () => {
    if (
      typeof window === "undefined" ||
      autoExpandHighlightAnimationFrameId === null
    ) {
      return;
    }

    window.cancelAnimationFrame(autoExpandHighlightAnimationFrameId);
    autoExpandHighlightAnimationFrameId = null;
  };

  const resetAutoExpandAttention = () => {
    clearAutoExpandHighlightTimer();
    clearAutoExpandHighlightAnimationFrame();
    autoExpandHighlightActive.value = false;
  };

  const remountExpandableCard = (expanded: boolean) => {
    expandableDefaultExpanded.value = expanded;
    expandableCardVersion.value += 1;
  };

  const triggerAutoExpandHighlight = () => {
    resetAutoExpandAttention();

    if (prefersReducedMotion.value || typeof window === "undefined") {
      return;
    }

    autoExpandHighlightAnimationFrameId = window.requestAnimationFrame(() => {
      autoExpandHighlightAnimationFrameId = null;
      autoExpandHighlightActive.value = true;
      autoExpandHighlightTimerId = window.setTimeout(() => {
        autoExpandHighlightTimerId = null;
        autoExpandHighlightActive.value = false;
      }, AUTO_EXPAND_FLASH_DURATION_MS);
    });
  };

  watch(
    [input.autoExpandContextKey, input.defaultExpanded],
    ([contextKey, shouldAutoExpand], previousValues) => {
      clearAutoExpandTimer();
      resetAutoExpandAttention();

      const previousContextKey = previousValues?.[0];
      const previousShouldAutoExpand = previousValues?.[1] ?? false;
      const isFirstSync = previousValues === undefined;
      const contextChanged = !isFirstSync && contextKey !== previousContextKey;
      const hasAutoExpandContext = contextKey !== null && contextKey !== undefined;
      const shouldDelayAutoExpand =
        shouldAutoExpand &&
        hasAutoExpandContext &&
        (isFirstSync || contextChanged || !previousShouldAutoExpand);

      if (!shouldDelayAutoExpand) {
        remountExpandableCard(shouldAutoExpand);
        return;
      }

      remountExpandableCard(false);

      if (!shouldAutoExpand) {
        return;
      }

      if (typeof window === "undefined") {
        remountExpandableCard(true);
        return;
      }

      autoExpandTimerId = window.setTimeout(() => {
        autoExpandTimerId = null;
        remountExpandableCard(true);
        triggerAutoExpandHighlight();
      }, AUTO_EXPAND_DELAY_MS);
    },
    { immediate: true },
  );

  watch(prefersReducedMotion, (reduced) => {
    if (!reduced) {
      return;
    }

    resetAutoExpandAttention();
  });

  onUnmounted(() => {
    clearAutoExpandTimer();
    resetAutoExpandAttention();
  });

  return {
    autoExpandHighlightActive,
    expandableCardKey,
    expandableDefaultExpanded,
  };
};
