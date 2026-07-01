<template>
  <article
    class="demand-card"
    :class="{
      'demand-card--dragging': isDragging,
      'demand-card--pending': isPendingState,
      'demand-card--preview': preview,
      'demand-card--interactive': isDetailActionAvailable,
    }"
    :role="isDetailActionAvailable ? 'button' : undefined"
    :style="cardStyle"
    :tabindex="isDetailActionAvailable ? 0 : undefined"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
    @keydown.enter.prevent="handleDetailKeydown"
    @keydown.space.prevent="handleDetailKeydown"
    @transitionend="handleTransitionEnd"
  >
    <div
      v-if="coverImage"
      class="demand-card__cover demand-card__cover--image"
    >
      <PuImg
        class="demand-card__cover-image"
        :src="coverImage"
        alt=""
        mode="aspectFill"
        :show-loading="false"
      />
      <PuTag
        class="demand-card__location-tag"
        :text="displayLocationName"
        tone="neutral"
        variant="soft"
        shape="pill"
        size="sm"
      />
    </div>
    <div v-else class="demand-card__cover demand-card__cover--fallback">
      <span class="demand-card__fallback-location">{{
        displayLocationName
      }}</span>
    </div>

    <div class="demand-card__body">
      <section class="demand-card__primary">
        <p class="demand-card__time">{{ timeLabel }}</p>
        <PuChipGroup
          v-if="preferenceTags.length > 0"
          class="demand-card__preference-list"
          gap="sm"
        >
          <PuChip
            v-for="tag in preferenceTags"
            :key="tag"
            tone="neutral"
            variant="outline"
            size="sm"
          >
            {{ tag }}
          </PuChip>
        </PuChipGroup>
        <p v-if="displayNotes" class="demand-card__notes">
          {{ displayNotes }}
        </p>
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { PuChip, PuChipGroup, PuImg, PuTag } from "@partner-up-dev/design-web";
import {
  DEMAND_CARD_EXIT_TRANSITION,
  DEMAND_CARD_REBOUND_TRANSITION,
  createDemandCardSwipePreviewState,
  type DemandCardSwipePreviewAnchorCorner,
  type DemandCardSwipePreviewPhase,
  type DemandCardSwipePreviewState,
} from "@/domains/event/ui/demand-card-swipe-feedback";

const MAX_DRAG_DISTANCE = 260;
const MIN_DISTANCE_THRESHOLD = 96;
const DISTANCE_THRESHOLD_RATIO = 0.34;
const FLICK_VELOCITY_THRESHOLD = 760;
const FLICK_MIN_DISTANCE = 22;
const ROTATION_DIVISOR = 22;
const MAX_ROTATION_DEG = 18;
const MILLISECONDS_PER_SECOND = 1000;
const VELOCITY_SAMPLE_WINDOW_MS = 90;
const MAX_VELOCITY_SAMPLES = 8;
const PREVIEW_BASE_OFFSET_Y = 14;
const PREVIEW_OFFSET_STEP_Y = 12;
const PREVIEW_BASE_SCALE = 0.972;
const PREVIEW_SCALE_STEP = 0.028;
const PREVIEW_MIN_SCALE = 0.88;
const PREVIEW_OPACITY_STEP = 0.12;
const PREVIEW_MIN_OPACITY = 0.72;
const EXIT_VIEWPORT_MULTIPLIER = 1.1;
const EXIT_DRAG_MULTIPLIER = 1.5;
const HINT_WOBBLE_TRANSITION = "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)";
const HINT_WOBBLE_STEP_MS = 180;
const HINT_WOBBLE_INTENSITIES = [0.5, -0.5, 0.36, -0.36, 0] as const;
const TAP_DETAIL_MAX_DISTANCE = 12;

type MotionSample = {
  x: number;
  timestamp: number;
};

type PointerState = {
  pointerId: number;
  startX: number;
  startY: number;
  tiltDirectionFactor: number;
  pivotY: number;
  motionSamples: MotionSample[];
};

type SwipeAction = "skip" | "view-detail";
type SwipePhase = DemandCardSwipePreviewPhase;

const props = withDefaults(
  defineProps<{
    displayLocationName: string;
    timeLabel: string;
    preferenceTags: string[];
    notes?: string | null;
    coverImage?: string | null;
    detailPrId?: number | null;
    actionAvailable?: boolean | null;
    pending?: boolean;
    preview?: boolean;
    previewDepth?: number;
  }>(),
  {
    notes: null,
    coverImage: null,
    detailPrId: null,
    actionAvailable: null,
    pending: false,
    preview: false,
    previewDepth: 1,
  },
);

const emit = defineEmits<{
  skip: [];
  "view-detail": [];
  "swipe-preview": [previewState: DemandCardSwipePreviewState];
}>();

const activePointer = ref<PointerState | null>(null);
const translateX = ref(0);
const rawTranslateX = ref(0);
const swipeThreshold = ref(MIN_DISTANCE_THRESHOLD);
const settleTransition = ref(DEMAND_CARD_REBOUND_TRANSITION);
const swipePhase = ref<SwipePhase>("idle");
const pendingAction = ref<SwipeAction | null>(null);
const hasDispatchedExitAction = ref(false);
const previewAnchorViewportY = ref<number | null>(null);
const previewAnchorCorner = ref<DemandCardSwipePreviewAnchorCorner | null>(
  null,
);
const hintWobbleRunId = ref(0);
const isHintWobbling = ref(false);
const tapDetailEligible = ref(false);
let hintWobbleTimerId: number | null = null;
let dragAnimationFrameId: number | null = null;
let pendingDragPointerId: number | null = null;
let pendingDragClientX: number | null = null;
let pendingDragTimestamp: number | null = null;

const isDragging = computed(() => swipePhase.value === "dragging");
const isPendingState = computed(
  () => (!props.preview && props.pending) || swipePhase.value === "exiting",
);
const displayNotes = computed(() => {
  const normalized = props.notes?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
});
const isDetailActionAvailable = computed(
  () =>
    !props.preview &&
    (props.actionAvailable ?? props.detailPrId !== null),
);
const isInteractionLocked = computed(
  () =>
    props.preview ||
    props.pending ||
    swipePhase.value === "exiting" ||
    swipePhase.value === "rebounding",
);
const dragProgress = computed(() =>
  Math.min(Math.abs(rawTranslateX.value) / swipeThreshold.value, 1),
);
const rotationDeg = computed(() => {
  const tiltDirectionFactor = activePointer.value?.tiltDirectionFactor ?? 1;
  const rotation = (translateX.value / ROTATION_DIVISOR) * tiltDirectionFactor;
  return Math.max(Math.min(rotation, MAX_ROTATION_DEG), -MAX_ROTATION_DEG);
});
const transformOrigin = computed(() => {
  if (props.preview) {
    return "center top";
  }

  const pivotY = activePointer.value?.pivotY;
  if (typeof pivotY !== "number") {
    return "50% 50%";
  }
  return `50% ${pivotY}px`;
});

const cardStyle = computed(() => {
  if (props.preview) {
    const depth = Math.max(props.previewDepth, 1);
    const offsetY = PREVIEW_BASE_OFFSET_Y + (depth - 1) * PREVIEW_OFFSET_STEP_Y;
    const previewScale = Math.max(
      PREVIEW_BASE_SCALE - (depth - 1) * PREVIEW_SCALE_STEP,
      PREVIEW_MIN_SCALE,
    );
    const previewOpacity = Math.max(
      1 - (depth - 1) * PREVIEW_OPACITY_STEP,
      PREVIEW_MIN_OPACITY,
    );

    return {
      transformOrigin: transformOrigin.value,
      transform: `translateY(${offsetY}px) scale(${previewScale})`,
      transition: "none",
      opacity: previewOpacity,
    };
  }

  const scale = 1 - dragProgress.value * 0.02;
  return {
    transformOrigin: transformOrigin.value,
    transform: `translate3d(${translateX.value}px, 0, 0) rotate(${rotationDeg.value}deg) scale(${scale})`,
    transition:
      swipePhase.value === "dragging" ? "none" : settleTransition.value,
  };
});

const applyDamping = (offsetX: number): number => {
  const sign = offsetX >= 0 ? 1 : -1;
  const abs = Math.abs(offsetX);
  const damped = MAX_DRAG_DISTANCE * Math.tanh((abs / MAX_DRAG_DISTANCE) * 1.2);
  return sign * damped;
};

const resolveSwipeThreshold = (): number => {
  if (typeof window === "undefined") {
    return MIN_DISTANCE_THRESHOLD;
  }

  return Math.max(
    MIN_DISTANCE_THRESHOLD,
    window.innerWidth * DISTANCE_THRESHOLD_RATIO,
  );
};

const appendMotionSample = (
  pointer: PointerState,
  x: number,
  timestamp: number,
) => {
  pointer.motionSamples.push({ x, timestamp });
  const sampleWindowStart = timestamp - VELOCITY_SAMPLE_WINDOW_MS * 2;
  pointer.motionSamples = pointer.motionSamples
    .filter((sample) => sample.timestamp >= sampleWindowStart)
    .slice(-MAX_VELOCITY_SAMPLES);
};

const clearDragAnimationFrame = () => {
  if (typeof window === "undefined" || dragAnimationFrameId === null) {
    return;
  }

  window.cancelAnimationFrame(dragAnimationFrameId);
  dragAnimationFrameId = null;
};

const applyDragFrame = (
  pointer: PointerState,
  clientX: number,
  timestamp: number,
) => {
  rawTranslateX.value = clientX - pointer.startX;
  translateX.value = applyDamping(rawTranslateX.value);
  emitSwipePreview(rawTranslateX.value / swipeThreshold.value, "dragging");
  appendMotionSample(pointer, clientX, timestamp);
};

const scheduleDragFrame = (
  pointerId: number,
  clientX: number,
  timestamp: number,
) => {
  pendingDragPointerId = pointerId;
  pendingDragClientX = clientX;
  pendingDragTimestamp = timestamp;

  if (dragAnimationFrameId !== null) {
    return;
  }

  if (typeof window === "undefined") {
    const pointer = activePointer.value;
    if (
      pointer &&
      pointer.pointerId === pointerId &&
      swipePhase.value === "dragging"
    ) {
      applyDragFrame(pointer, clientX, timestamp);
    }
    return;
  }

  dragAnimationFrameId = window.requestAnimationFrame(() => {
    dragAnimationFrameId = null;

    const pointer = activePointer.value;
    if (!pointer || swipePhase.value !== "dragging") {
      return;
    }

    if (pendingDragPointerId !== pointer.pointerId) {
      return;
    }

    if (pendingDragClientX === null || pendingDragTimestamp === null) {
      return;
    }

    applyDragFrame(pointer, pendingDragClientX, pendingDragTimestamp);
  });
};

const resolveVelocityX = (
  pointer: PointerState,
  endX: number,
  endTimestamp: number,
): number => {
  const samples = [
    ...pointer.motionSamples,
    { x: endX, timestamp: endTimestamp },
  ].sort((left, right) => left.timestamp - right.timestamp);
  const windowStart = endTimestamp - VELOCITY_SAMPLE_WINDOW_MS;
  const earliestWindowSample =
    samples.find((sample) => sample.timestamp >= windowStart) ?? samples[0];

  const timeDelta = Math.max(endTimestamp - earliestWindowSample.timestamp, 1);
  return (
    ((endX - earliestWindowSample.x) / timeDelta) * MILLISECONDS_PER_SECOND
  );
};

const emitSwipePreview = (
  intensity: number,
  phase: SwipePhase = swipePhase.value,
  anchorViewportY: number | null = previewAnchorViewportY.value,
  anchorCorner: DemandCardSwipePreviewAnchorCorner | null = previewAnchorCorner.value,
) => {
  if (props.preview) {
    return;
  }

  emit(
    "swipe-preview",
    createDemandCardSwipePreviewState(
      intensity,
      phase,
      anchorViewportY,
      anchorCorner,
    ),
  );
};

const clearHintWobbleTimer = () => {
  if (typeof window === "undefined" || hintWobbleTimerId === null) {
    return;
  }

  window.clearTimeout(hintWobbleTimerId);
  hintWobbleTimerId = null;
};

const applyHintWobbleIntensity = (intensity: number) => {
  swipeThreshold.value = resolveSwipeThreshold();
  settleTransition.value = HINT_WOBBLE_TRANSITION;
  rawTranslateX.value = intensity * swipeThreshold.value;
  translateX.value = applyDamping(rawTranslateX.value);
  emitSwipePreview(intensity, "hinting", null, null);
};

const stopHintWobble = () => {
  clearHintWobbleTimer();
  hintWobbleRunId.value += 1;
  clearDragAnimationFrame();

  if (!isHintWobbling.value) {
    return;
  }

  isHintWobbling.value = false;
  rawTranslateX.value = 0;
  translateX.value = 0;
  settleTransition.value = HINT_WOBBLE_TRANSITION;
  emitSwipePreview(0, "idle", null, null);
};

const runHintWobbleStep = (runId: number, index: number) => {
  if (hintWobbleRunId.value !== runId) {
    return;
  }

  const intensity = HINT_WOBBLE_INTENSITIES[index];
  if (typeof intensity !== "number") {
    isHintWobbling.value = false;
    settleTransition.value = DEMAND_CARD_REBOUND_TRANSITION;
    return;
  }

  applyHintWobbleIntensity(intensity);

  if (index === HINT_WOBBLE_INTENSITIES.length - 1) {
    isHintWobbling.value = false;
    settleTransition.value = DEMAND_CARD_REBOUND_TRANSITION;
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  hintWobbleTimerId = window.setTimeout(() => {
    hintWobbleTimerId = null;
    runHintWobbleStep(runId, index + 1);
  }, HINT_WOBBLE_STEP_MS);
};

const playHintWobble = () => {
  if (props.preview || props.pending || swipePhase.value !== "idle") {
    return;
  }

  stopHintWobble();

  previewAnchorViewportY.value = null;
  previewAnchorCorner.value = null;
  pendingAction.value = null;
  hasDispatchedExitAction.value = false;
  tapDetailEligible.value = false;

  isHintWobbling.value = true;
  const runId = hintWobbleRunId.value + 1;
  hintWobbleRunId.value = runId;
  runHintWobbleStep(runId, 0);
};

const resetCardState = () => {
  stopHintWobble();
  previewAnchorViewportY.value = null;
  previewAnchorCorner.value = null;
  emitSwipePreview(0, "idle", null, null);
  activePointer.value = null;
  translateX.value = 0;
  rawTranslateX.value = 0;
  settleTransition.value = DEMAND_CARD_REBOUND_TRANSITION;
  swipePhase.value = "idle";
  pendingAction.value = null;
  hasDispatchedExitAction.value = false;
  tapDetailEligible.value = false;
};

const startRebound = () => {
  stopHintWobble();
  clearDragAnimationFrame();
  activePointer.value = null;
  pendingAction.value = null;
  hasDispatchedExitAction.value = false;
  swipePhase.value = "rebounding";
  settleTransition.value = DEMAND_CARD_REBOUND_TRANSITION;
  emitSwipePreview(0, "rebounding");
  translateX.value = 0;
  rawTranslateX.value = 0;
  tapDetailEligible.value = false;
};

const startExit = (action: SwipeAction) => {
  stopHintWobble();
  clearDragAnimationFrame();
  const direction = action === "skip" ? -1 : 1;

  activePointer.value = null;
  pendingAction.value = action;
  hasDispatchedExitAction.value = false;
  swipePhase.value = "exiting";
  settleTransition.value = DEMAND_CARD_EXIT_TRANSITION;
  emitSwipePreview(direction, "exiting");
  rawTranslateX.value = direction * swipeThreshold.value;
  translateX.value =
    direction *
    Math.max(
      window.innerWidth * EXIT_VIEWPORT_MULTIPLIER,
      MAX_DRAG_DISTANCE * EXIT_DRAG_MULTIPLIER,
    );
  tapDetailEligible.value = false;
};

const triggerAction = (action: SwipeAction) => {
  stopHintWobble();
  clearDragAnimationFrame();

  if (isInteractionLocked.value || swipePhase.value !== "idle") {
    return;
  }

  if (action === "view-detail" && !isDetailActionAvailable.value) {
    startRebound();
    return;
  }

  startExit(action);
};

const handlePointerDown = (event: PointerEvent) => {
  stopHintWobble();
  clearDragAnimationFrame();

  if (isInteractionLocked.value || swipePhase.value !== "idle") return;

  const currentTarget = event.currentTarget;
  if (!(currentTarget instanceof HTMLElement)) return;

  const rect = currentTarget.getBoundingClientRect();
  const localY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
  const normalizedY =
    rect.height > 0 ? Math.min(Math.max(localY / rect.height, 0), 1) : 0.5;
  const anchorCorner: DemandCardSwipePreviewAnchorCorner =
    normalizedY <= 0.5 ? "top" : "bottom";
  const tiltDirectionFactor = 1 - normalizedY * 2;
  swipeThreshold.value = Math.max(
    MIN_DISTANCE_THRESHOLD,
    window.innerWidth * DISTANCE_THRESHOLD_RATIO,
  );
  settleTransition.value = DEMAND_CARD_REBOUND_TRANSITION;
  pendingAction.value = null;
  hasDispatchedExitAction.value = false;
  swipePhase.value = "dragging";
  previewAnchorViewportY.value = event.clientY;
  previewAnchorCorner.value = anchorCorner;
  tapDetailEligible.value = true;
  emitSwipePreview(0, "dragging", event.clientY, anchorCorner);

  currentTarget.setPointerCapture(event.pointerId);
  activePointer.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    tiltDirectionFactor,
    pivotY: localY,
    motionSamples: [{ x: event.clientX, timestamp: event.timeStamp }],
  };
};

const handlePointerMove = (event: PointerEvent) => {
  const pointer = activePointer.value;
  if (
    !pointer ||
    pointer.pointerId !== event.pointerId ||
    swipePhase.value !== "dragging"
  ) {
    return;
  }

  if (
    Math.abs(event.clientX - pointer.startX) > TAP_DETAIL_MAX_DISTANCE ||
    Math.abs(event.clientY - pointer.startY) > TAP_DETAIL_MAX_DISTANCE
  ) {
    tapDetailEligible.value = false;
  }

  scheduleDragFrame(event.pointerId, event.clientX, event.timeStamp);
};

const resolveSwipeAction = (
  offsetX: number,
  velocityX: number,
): SwipeAction | null => {
  const isFastSkipGesture =
    velocityX <= -FLICK_VELOCITY_THRESHOLD && offsetX <= -FLICK_MIN_DISTANCE;
  const isFastDetailGesture =
    velocityX >= FLICK_VELOCITY_THRESHOLD && offsetX >= FLICK_MIN_DISTANCE;

  if (offsetX <= -swipeThreshold.value || isFastSkipGesture) {
    return "skip";
  }

  if (offsetX >= swipeThreshold.value || isFastDetailGesture) {
    return "view-detail";
  }

  return null;
};

const handlePointerUp = (event: PointerEvent) => {
  const pointer = activePointer.value;
  if (
    !pointer ||
    pointer.pointerId !== event.pointerId ||
    swipePhase.value !== "dragging"
  ) {
    return;
  }

  clearDragAnimationFrame();
  pendingDragPointerId = null;
  pendingDragClientX = null;
  pendingDragTimestamp = null;

  const velocityX = resolveVelocityX(pointer, event.clientX, event.timeStamp);
  const offsetX = event.clientX - pointer.startX;
  const action = resolveSwipeAction(offsetX, velocityX);
  activePointer.value = null;

  if (action === "view-detail" && !isDetailActionAvailable.value) {
    startRebound();
    return;
  }

  if (action) {
    startExit(action);
    return;
  }

  if (tapDetailEligible.value && isDetailActionAvailable.value) {
    startExit("view-detail");
    return;
  }

  startRebound();
};

const handlePointerCancel = (event: PointerEvent) => {
  const pointer = activePointer.value;
  if (!pointer || pointer.pointerId !== event.pointerId) return;
  clearDragAnimationFrame();
  startRebound();
};

const handleTransitionEnd = (event: TransitionEvent) => {
  if (props.preview) {
    return;
  }

  if (
    event.propertyName !== "transform" ||
    event.target !== event.currentTarget
  ) {
    return;
  }

  if (swipePhase.value === "rebounding") {
    resetCardState();
    return;
  }

  if (
    swipePhase.value !== "exiting" ||
    pendingAction.value === null ||
    hasDispatchedExitAction.value
  ) {
    return;
  }

  hasDispatchedExitAction.value = true;
  if (pendingAction.value === "skip") {
    emit("skip");
    return;
  }

  emit("view-detail");
};

const handleDetailKeydown = () => {
  if (!isDetailActionAvailable.value) {
    return;
  }

  triggerAction("view-detail");
};

watch(
  () => props.pending,
  (isPending, wasPending) => {
    if (
      isPending ||
      !wasPending ||
      swipePhase.value !== "exiting" ||
      pendingAction.value !== "view-detail" ||
      !hasDispatchedExitAction.value
    ) {
      return;
    }

    startRebound();
  },
);

watch(
  () => [
    props.displayLocationName,
    props.timeLabel,
    props.detailPrId,
    props.notes,
    props.preferenceTags.join("|"),
  ],
  () => {
    if (swipePhase.value !== "idle" || isHintWobbling.value) {
      resetCardState();
    }
  },
);

watch(
  () => props.pending,
  (isPending) => {
    if (isPending && isHintWobbling.value) {
      stopHintWobble();
    }

    if (isPending && activePointer.value !== null) {
      startRebound();
    }
  },
);

onUnmounted(() => {
  stopHintWobble();
  clearDragAnimationFrame();
});

defineExpose({
  playHintWobble,
  triggerAction,
});
</script>

<style lang="scss" scoped>
.demand-card {
  position: absolute;
  inset: 0;
  border-radius: var(--sys-radius-large);
  overflow: hidden;
  background: var(--sys-color-surface-container);
  border: 1px solid var(--sys-color-outline-variant);
  box-shadow: var(--sys-shadow-3);
  will-change: transform;
  touch-action: pan-y;
  display: flex;
  flex-direction: column;
}

.demand-card--interactive {
  cursor: pointer;
}

.demand-card--interactive:focus-visible {
  outline: 2px solid var(--sys-color-primary);
  outline-offset: 3px;
}

.demand-card--pending {
  opacity: 0.9;
}

.demand-card--preview {
  box-shadow: var(--sys-shadow-2);
}

.demand-card--preview .demand-card__cover {
  filter: saturate(0.85) brightness(0.9);
}

.demand-card--preview .demand-card__body {
  gap: var(--sys-spacing-small);
}

.demand-card__cover {
  position: relative;
  min-height: calc(calc(var(--sys-spacing-large) * 2) * 4);
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: var(--sys-spacing-small);
  overflow: hidden;
}

.demand-card__cover--image {
  background: var(--sys-color-surface-container-high);
}

.demand-card__cover-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.demand-card__cover--fallback {
  align-items: center;
  justify-content: center;
  background: var(--sys-color-primary-container);
  padding: var(--sys-spacing-medium);
}

.demand-card__fallback-location {
  @include mx.pu-font(title);
  margin: 0;
  color: var(--sys-color-on-primary-container);
  text-align: center;
  overflow-wrap: anywhere;
}

.demand-card__location-tag {
  position: relative;
  z-index: 1;
}

.demand-card__body {
  padding: calc(var(--sys-spacing-medium) + var(--sys-spacing-xsmall));
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  flex: 1;
  min-height: 0;
}

.demand-card__primary {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.demand-card__time {
  @include mx.pu-font(section);
  margin: 0;
  color: var(--sys-color-on-surface);
}

.demand-card__notes {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  text-overflow: ellipsis;
  white-space: pre-line;
  overflow-wrap: anywhere;
}
</style>
