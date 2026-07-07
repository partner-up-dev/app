<template>
  <ul
    ref="listRef"
    class="anchor-event-horizontal-list"
    :class="[
      `anchor-event-horizontal-list--${variant}`,
      {
        'anchor-event-horizontal-list--looping': loopEnabled,
      },
    ]"
    @pointerdown="handlePointerDown"
    @scroll.passive="handleScroll"
  >
    <li
      v-for="(item, index) in renderedEvents"
      :key="item.key"
      :ref="(element) => setItemRef(index, element)"
      class="anchor-event-horizontal-list__item"
    >
      <EventCard
        class="anchor-event-horizontal-list__card"
        :event="item.event"
        :variant="resolvedCardVariant"
        :surface="cardSurface"
        @click="emitCardClick(item.event.id, item.sourceIndex)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import {
  type ComponentPublicInstance,
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  watchEffect,
} from "vue";
import EventCard from "@/domains/event/ui/primitives/EventCard.vue";
import type { AnchorEventListItem } from "@/domains/event/model/types";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";

type RenderedEventItem = {
  key: string;
  event: AnchorEventListItem;
  sourceIndex: number;
};

const props = withDefaults(
  defineProps<{
    events: readonly AnchorEventListItem[];
    maxCount?: number;
    variant?: "full-bleed" | "contained";
    cardVariant?: "default" | "shorter";
    cardSurface?: "filled" | "outline";
    autoScroll?: boolean;
    autoScrollSpeedPxPerSecond?: number;
  }>(),
  {
    maxCount: 4,
    variant: "contained",
    cardSurface: "filled",
    autoScroll: false,
    autoScrollSpeedPxPerSecond: 32,
  },
);

const emit = defineEmits<{
  "card-click": [payload: { eventId: number; index: number }];
}>();

const visibleEvents = computed(() => props.events.slice(0, props.maxCount));
const resolvedCardVariant = computed(
  () =>
    props.cardVariant ??
    (props.variant === "full-bleed" ? "default" : "shorter"),
);
const renderedEvents = computed<RenderedEventItem[]>(() => {
  const baseItems = visibleEvents.value.map((event, sourceIndex) => ({
    key: `${event.id}-0-${sourceIndex}`,
    event,
    sourceIndex,
  }));

  if (!loopEnabled.value) {
    return baseItems;
  }

  return Array.from({ length: 3 }, (_, copyIndex) =>
    visibleEvents.value.map((event, sourceIndex) => ({
      key: `${event.id}-${copyIndex}-${sourceIndex}`,
      event,
      sourceIndex,
    })),
  ).flat();
});
const listRef = ref<HTMLUListElement | null>(null);
const itemRefs = ref<Array<HTMLLIElement | null>>([]);
const loopEnabled = ref(false);
const loopSegmentWidth = ref(0);
const isPointerHolding = ref(false);
const isInteractionPaused = ref(false);
const containerWidth = ref(0);
const leadingItemWidth = ref(0);
const { prefersReducedMotion } = useReducedMotion();

let resizeObserver: ResizeObserver | null = null;
let animationFrameId: number | null = null;
let lastAnimationFrameAt: number | null = null;
let resumeTimerId: number | null = null;
let detachWindowListeners: (() => void) | null = null;

const resolveItemElement = (
  element: Element | ComponentPublicInstance | null,
): HTMLLIElement | null => {
  if (element instanceof HTMLLIElement) {
    return element;
  }

  if (element && "$el" in element && element.$el instanceof HTMLLIElement) {
    return element.$el;
  }

  return null;
};

const setItemRef = (
  index: number,
  element: Element | ComponentPublicInstance | null,
) => {
  const itemElement = resolveItemElement(element);
  if (itemElement) {
    itemRefs.value[index] = itemElement;
    return;
  }

  itemRefs.value[index] = null;
};

const stopAnimation = () => {
  if (animationFrameId !== null) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  lastAnimationFrameAt = null;
};

const clearResumeTimer = () => {
  if (resumeTimerId !== null) {
    window.clearTimeout(resumeTimerId);
    resumeTimerId = null;
  }
};

const resetLoopState = () => {
  const list = listRef.value;
  loopEnabled.value = false;
  loopSegmentWidth.value = 0;
  isPointerHolding.value = false;
  isInteractionPaused.value = false;
  clearResumeTimer();

  if (list) {
    list.scrollTo({ left: 0, behavior: "auto" });
  }
};

const resolveLoopSegmentWidth = () => {
  const firstItem = itemRefs.value[0];
  const middleCopyStart = itemRefs.value[visibleEvents.value.length];
  if (!(firstItem instanceof HTMLLIElement)) {
    return 0;
  }
  if (!(middleCopyStart instanceof HTMLLIElement)) {
    return 0;
  }

  return middleCopyStart.offsetLeft - firstItem.offsetLeft;
};

const syncMeasuredLayout = () => {
  const list = listRef.value;
  containerWidth.value = list?.clientWidth ?? 0;
  leadingItemWidth.value =
    itemRefs.value[0]?.getBoundingClientRect().width ?? 0;
};

const BASELINE_CONTAINER_WIDTH_PX = 350;
const BASELINE_CARD_FOOTPRINT_RATIO = 0.78;
const MIN_CARD_FOOTPRINT_RATIO = 0.55;
const MAX_CARD_FOOTPRINT_RATIO = 1.15;
const MIN_AUTO_SCROLL_SPEED_PX_PER_SECOND = 12;
const MAX_AUTO_SCROLL_SPEED_PX_PER_SECOND = 72;

const resolvedAutoScrollSpeedPxPerSecond = computed(() => {
  if (prefersReducedMotion.value) {
    return 0;
  }

  const baselineSpeed = props.autoScrollSpeedPxPerSecond;
  if (baselineSpeed <= 0) {
    return 0;
  }

  const measuredContainerWidth =
    containerWidth.value > 0
      ? containerWidth.value
      : BASELINE_CONTAINER_WIDTH_PX;
  const measuredItemWidth =
    leadingItemWidth.value > 0
      ? leadingItemWidth.value
      : measuredContainerWidth * BASELINE_CARD_FOOTPRINT_RATIO;
  const clampedCardFootprintRatio = Math.min(
    MAX_CARD_FOOTPRINT_RATIO,
    Math.max(
      MIN_CARD_FOOTPRINT_RATIO,
      measuredItemWidth / measuredContainerWidth,
    ),
  );
  const containerFactor = measuredContainerWidth / BASELINE_CONTAINER_WIDTH_PX;
  const cardFactor =
    clampedCardFootprintRatio / BASELINE_CARD_FOOTPRINT_RATIO;
  const scaledSpeed =
    baselineSpeed * containerFactor * Math.sqrt(cardFactor);

  return Math.min(
    MAX_AUTO_SCROLL_SPEED_PX_PER_SECOND,
    Math.max(MIN_AUTO_SCROLL_SPEED_PX_PER_SECOND, scaledSpeed),
  );
});

const normalizeLoopPosition = () => {
  const list = listRef.value;
  const segmentWidth = loopSegmentWidth.value;
  if (!list || !loopEnabled.value || segmentWidth <= 0) {
    return;
  }

  let nextScrollLeft = list.scrollLeft;
  if (nextScrollLeft < segmentWidth) {
    nextScrollLeft += segmentWidth;
  } else if (nextScrollLeft >= segmentWidth * 2) {
    nextScrollLeft -= segmentWidth;
  }

  if (nextScrollLeft !== list.scrollLeft) {
    list.scrollTo({
      left: nextScrollLeft,
      behavior: "auto",
    });
  }
};

const updateLoopAvailability = async () => {
  await nextTick();

  const list = listRef.value;
  if (!list) {
    return;
  }

  syncMeasuredLayout();

  if (!props.autoScroll || visibleEvents.value.length <= 1) {
    resetLoopState();
    return;
  }

  if (!loopEnabled.value) {
    const hasOverflow = list.scrollWidth - list.clientWidth > 1;
    if (!hasOverflow) {
      resetLoopState();
      return;
    }

    loopEnabled.value = true;
    await nextTick();
  }

  const refreshedList = listRef.value;
  if (!refreshedList) {
    return;
  }

  const segmentWidth = resolveLoopSegmentWidth();
  if (segmentWidth <= refreshedList.clientWidth + 1) {
    resetLoopState();
    return;
  }

  loopSegmentWidth.value = segmentWidth;
  normalizeLoopPosition();
};

const emitCardClick = (eventId: number, index: number) => {
  emit("card-click", { eventId, index });
};

const scheduleResume = () => {
  if (!loopEnabled.value) {
    return;
  }

  clearResumeTimer();
  resumeTimerId = window.setTimeout(() => {
    resumeTimerId = null;
    normalizeLoopPosition();
    isInteractionPaused.value = false;
  }, 140);
};

const handlePointerDown = (event: PointerEvent) => {
  if (!loopEnabled.value) {
    return;
  }

  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  clearResumeTimer();
  isPointerHolding.value = true;
  isInteractionPaused.value = true;
};

const finishPointerInteraction = () => {
  if (!loopEnabled.value || !isPointerHolding.value) {
    return;
  }

  isPointerHolding.value = false;
  scheduleResume();
};

const handleScroll = () => {
  if (!loopEnabled.value) {
    return;
  }

  if (isPointerHolding.value || resumeTimerId !== null) {
    isInteractionPaused.value = true;
    scheduleResume();
  }
};

const stepAutoScroll = (timestamp: number) => {
  const list = listRef.value;
  if (
    !list ||
    !loopEnabled.value ||
    isInteractionPaused.value ||
    resolvedAutoScrollSpeedPxPerSecond.value <= 0
  ) {
    stopAnimation();
    return;
  }

  if (lastAnimationFrameAt !== null) {
    const elapsedMs = timestamp - lastAnimationFrameAt;
    const distance =
      (resolvedAutoScrollSpeedPxPerSecond.value * elapsedMs) / 1000;
    list.scrollLeft += distance;

    if (
      loopSegmentWidth.value > 0 &&
      list.scrollLeft >= loopSegmentWidth.value * 2
    ) {
      list.scrollLeft -= loopSegmentWidth.value;
    }
  }

  lastAnimationFrameAt = timestamp;
  animationFrameId = window.requestAnimationFrame(stepAutoScroll);
};

watch(
  () => renderedEvents.value.length,
  (length) => {
    itemRefs.value = itemRefs.value.slice(0, length);
  },
  { immediate: true },
);

watch(
  [() => visibleEvents.value, () => props.autoScroll, () => props.variant],
  () => {
    void updateLoopAvailability();
  },
  { flush: "post" },
);

watchEffect((onCleanup) => {
  if (typeof window === "undefined") {
    return;
  }

  stopAnimation();

  if (
    !loopEnabled.value ||
    isInteractionPaused.value ||
    resolvedAutoScrollSpeedPxPerSecond.value <= 0
  ) {
    onCleanup(() => {
      stopAnimation();
    });
    return;
  }

  animationFrameId = window.requestAnimationFrame(stepAutoScroll);
  onCleanup(() => {
    stopAnimation();
  });
});

onMounted(() => {
  void updateLoopAvailability();

  if (typeof window !== "undefined") {
    const handleWindowPointerUp = () => {
      finishPointerInteraction();
    };
    const handleWindowResize = () => {
      void updateLoopAvailability();
    };

    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);
    window.addEventListener("resize", handleWindowResize);

    detachWindowListeners = () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
      window.removeEventListener("resize", handleWindowResize);
    };
  }

  if (typeof ResizeObserver !== "undefined" && listRef.value) {
    resizeObserver = new ResizeObserver(() => {
      syncMeasuredLayout();
      void updateLoopAvailability();
    });
    resizeObserver.observe(listRef.value);
  }
});

onBeforeUnmount(() => {
  stopAnimation();
  clearResumeTimer();
  resizeObserver?.disconnect();
  detachWindowListeners?.();
  detachWindowListeners = null;
});
</script>

<style lang="scss" scoped>
.anchor-event-horizontal-list {
  --event-rail-inset: var(--sys-spacing-large);

  list-style: none;
  display: flex;
  flex-direction: row;
  min-width: 0;
  gap: var(--sys-spacing-medium);
  margin: 0;
  padding-top: var(--sys-spacing-small);
  padding-bottom: var(--sys-spacing-small);
  overflow-x: auto;
  overflow-y: visible;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
}

.anchor-event-horizontal-list--looping {
  scroll-snap-type: none;
}

.anchor-event-horizontal-list--full-bleed {
  width: 100vw;
  max-width: none;
  margin-inline: calc(50% - 50vw);
  padding-left: calc(var(--event-rail-inset) + var(--pu-safe-left));
  padding-right: calc(var(--event-rail-inset) + var(--pu-safe-right));
  scroll-padding-inline: calc(var(--event-rail-inset) + var(--pu-safe-left));
  background-color: var(--sys-color-surface);
}

.anchor-event-horizontal-list--contained {
  width: 100%;
  padding-left: 0;
  padding-right: 0;
  scroll-padding-inline: 0;
  background: transparent;
}

.anchor-event-horizontal-list__item {
  flex: 0 0 19rem;
  max-width: 100%;
  min-width: 0;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

.anchor-event-horizontal-list__card {
  @include mx.pu-motion-pressable(0.988);
  @include mx.pu-motion-ripple-base();
  min-height: 100%;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .anchor-event-horizontal-list__card:hover:not(.event-card--outline) {
    transform: translateY(-2px);
    @include mx.pu-elevation(2);
  }
}

@media (max-width: 768px) {
  .anchor-event-horizontal-list {
    --event-rail-inset: var(--sys-spacing-small);
    gap: var(--sys-spacing-small);
  }

  .anchor-event-horizontal-list__item {
    flex-basis: 17rem;
  }
}
</style>
