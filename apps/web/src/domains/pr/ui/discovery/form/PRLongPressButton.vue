<template>
  <button
    ref="buttonRef"
    class="pr-discovery-long-press-button"
    :class="{
      'pr-discovery-long-press-button--disabled': props.disabled || props.pending,
      'pr-discovery-long-press-button--charging': phase === 'CHARGING',
      'pr-discovery-long-press-button--overload': phase === 'OVERLOAD',
      'pr-discovery-long-press-button--burst': phase === 'BURST',
      'pr-discovery-long-press-button--rollback': phase === 'ROLLBACK',
    }"
    type="button"
    :disabled="props.disabled || props.pending"
    :style="buttonStyle"
    @pointerdown="handlePointerDown"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
    @pointerleave="handlePointerLeave"
    @contextmenu.capture.prevent
    @dragstart.prevent
    @selectstart.prevent
    @touchstart.prevent
    @touchmove.prevent
    @touchend.prevent
    @touchcancel.prevent
  >
    <span class="pr-discovery-long-press-button__fill" aria-hidden="true" />
    <span class="pr-discovery-long-press-button__splash" aria-hidden="true" />
    <span class="pr-discovery-long-press-button__label">
      {{ props.pending ? props.pendingLabel ?? props.label : props.label }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";

type ButtonPhase = "IDLE" | "CHARGING" | "OVERLOAD" | "BURST" | "ROLLBACK";
export type LongPressOriginRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

const props = withDefaults(
  defineProps<{
    label: string;
    pending?: boolean;
    pendingLabel?: string;
    disabled?: boolean;
    chargeDurationMs?: number;
    overloadDurationMs?: number;
  }>(),
  {
    pending: false,
    pendingLabel: undefined,
    disabled: false,
    chargeDurationMs: 760,
    overloadDurationMs: 240,
  },
);

const emit = defineEmits<{
  complete: [originRect: LongPressOriginRect];
}>();

const buttonRef = ref<HTMLButtonElement | null>(null);
const phase = ref<ButtonPhase>("IDLE");
const fillProgress = ref(0);
const overloadProgress = ref(0);
const pointerId = ref<number | null>(null);
const startedAt = ref(0);
const rafId = ref<number | null>(null);
const resetTimeoutId = ref<number | null>(null);
const hasCompleted = ref(false);
const longPressGuardsActive = ref(false);

const longPressGuardOptions: AddEventListenerOptions = {
  capture: true,
  passive: false,
};

const preventLongPressDefault = (event: Event): void => {
  if (!longPressGuardsActive.value) {
    return;
  }

  if (event.cancelable) {
    event.preventDefault();
  }
  event.stopImmediatePropagation();
};

const addLongPressGuards = (): void => {
  if (longPressGuardsActive.value || typeof document === "undefined") {
    return;
  }

  longPressGuardsActive.value = true;
  document.addEventListener("contextmenu", preventLongPressDefault, longPressGuardOptions);
  document.addEventListener("selectstart", preventLongPressDefault, longPressGuardOptions);
  document.addEventListener("dragstart", preventLongPressDefault, longPressGuardOptions);
  document.addEventListener("touchmove", preventLongPressDefault, longPressGuardOptions);
};

const removeLongPressGuards = (): void => {
  if (!longPressGuardsActive.value || typeof document === "undefined") {
    return;
  }

  longPressGuardsActive.value = false;
  document.removeEventListener("contextmenu", preventLongPressDefault, longPressGuardOptions);
  document.removeEventListener("selectstart", preventLongPressDefault, longPressGuardOptions);
  document.removeEventListener("dragstart", preventLongPressDefault, longPressGuardOptions);
  document.removeEventListener("touchmove", preventLongPressDefault, longPressGuardOptions);
};

const clearAnimationFrame = () => {
  if (rafId.value !== null && typeof window !== "undefined") {
    window.cancelAnimationFrame(rafId.value);
    rafId.value = null;
  }
};

const clearResetTimeout = () => {
  if (resetTimeoutId.value !== null && typeof window !== "undefined") {
    window.clearTimeout(resetTimeoutId.value);
    resetTimeoutId.value = null;
  }
};

const releasePointerCapture = () => {
  if (pointerId.value === null) {
    return;
  }

  try {
    if (buttonRef.value?.hasPointerCapture(pointerId.value)) {
      buttonRef.value.releasePointerCapture(pointerId.value);
    }
  } catch {
    // Ignore stale pointer-capture errors.
  }
};

const resetToIdle = () => {
  clearAnimationFrame();
  clearResetTimeout();
  releasePointerCapture();
  pointerId.value = null;
  startedAt.value = 0;
  phase.value = "IDLE";
  fillProgress.value = 0;
  overloadProgress.value = 0;
  hasCompleted.value = false;
  removeLongPressGuards();
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const toCssPx = (value: number): string => `${value.toFixed(2)}px`;
const toCssDeg = (value: number): string => `${value.toFixed(3)}deg`;

const easing = (value: number): number => 1 - (1 - value) ** 2.2;

const runTick = (timestamp: number) => {
  if (startedAt.value === 0) {
    startedAt.value = timestamp;
  }

  const elapsed = timestamp - startedAt.value;
  if (elapsed < props.chargeDurationMs) {
    phase.value = "CHARGING";
    fillProgress.value = easing(elapsed / props.chargeDurationMs);
    overloadProgress.value = 0;
    rafId.value = window.requestAnimationFrame(runTick);
    return;
  }

  fillProgress.value = 1;
  const overloadElapsed = elapsed - props.chargeDurationMs;
  if (overloadElapsed < props.overloadDurationMs) {
    phase.value = "OVERLOAD";
    overloadProgress.value = overloadElapsed / props.overloadDurationMs;
    rafId.value = window.requestAnimationFrame(runTick);
    return;
  }

  if (!hasCompleted.value) {
    hasCompleted.value = true;
    phase.value = "BURST";
    overloadProgress.value = 1;
    emit("complete", resolveOriginRect());
  }

  clearAnimationFrame();
  clearResetTimeout();
  resetTimeoutId.value = window.setTimeout(() => {
    if (phase.value === "BURST") {
      resetToIdle();
    }
  }, 420);
};

const startCharging = (event: PointerEvent) => {
  if (props.disabled || props.pending) {
    return;
  }

  event.preventDefault();
  addLongPressGuards();
  clearAnimationFrame();
  clearResetTimeout();
  hasCompleted.value = false;
  pointerId.value = event.pointerId;
  startedAt.value = 0;
  phase.value = "CHARGING";
  fillProgress.value = 0;
  overloadProgress.value = 0;

  try {
    buttonRef.value?.setPointerCapture(event.pointerId);
  } catch {
    // Ignore capture failures.
  }

  rafId.value = window.requestAnimationFrame(runTick);
};

const triggerRollback = () => {
  if (phase.value === "BURST" || phase.value === "IDLE") {
    return;
  }

  clearAnimationFrame();
  clearResetTimeout();
  releasePointerCapture();
  pointerId.value = null;
  phase.value = "ROLLBACK";
  fillProgress.value = 0;
  overloadProgress.value = 0;
  resetTimeoutId.value = window.setTimeout(() => {
    if (phase.value === "ROLLBACK") {
      resetToIdle();
    }
  }, 220);
};

const handlePointerDown = (event: PointerEvent) => {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }
  startCharging(event);
};

const handlePointerUp = (event: PointerEvent) => {
  if (pointerId.value !== event.pointerId) {
    return;
  }

  if (phase.value === "BURST") {
    releasePointerCapture();
    pointerId.value = null;
    return;
  }

  triggerRollback();
};

const handlePointerCancel = (event: PointerEvent) => {
  if (pointerId.value !== event.pointerId) {
    return;
  }
  triggerRollback();
};

const handlePointerLeave = (event: PointerEvent) => {
  if (pointerId.value !== event.pointerId) {
    return;
  }
  if (event.pointerType === "mouse") {
    triggerRollback();
  }
};

onBeforeUnmount(() => {
  clearAnimationFrame();
  clearResetTimeout();
  removeLongPressGuards();
});

const buttonStyle = computed(() => {
  const pressure = clamp(fillProgress.value ** 1.35 + overloadProgress.value * 0.58, 0, 1.35);
  const outlinePressure = clamp(fillProgress.value * 0.36 + overloadProgress.value * 0.82, 0, 1);

  return {
    "--pr-discovery-long-press-progress": String(fillProgress.value),
    "--pr-discovery-long-press-overload": String(overloadProgress.value),
    "--pr-discovery-long-press-tremble-duration": `${Math.round(132 - pressure * 44)}ms`,
    "--pr-discovery-long-press-tremble-left": toCssPx(-(0.85 + pressure * 2.75)),
    "--pr-discovery-long-press-tremble-right": toCssPx(0.95 + pressure * 2.95),
    "--pr-discovery-long-press-tremble-left-soft": toCssPx(-(0.38 + pressure * 1.42)),
    "--pr-discovery-long-press-tremble-right-soft": toCssPx(0.42 + pressure * 1.48),
    "--pr-discovery-long-press-tremble-up": toCssPx(-(0.18 + pressure * 1.02)),
    "--pr-discovery-long-press-tremble-down": toCssPx(0.14 + pressure * 0.86),
    "--pr-discovery-long-press-tremble-rotate-left": toCssDeg(-(0.08 + pressure * 0.34)),
    "--pr-discovery-long-press-tremble-rotate-right": toCssDeg(0.08 + pressure * 0.36),
    "--pr-discovery-long-press-pressure-outline": toCssPx(outlinePressure * 7.5),
  };
});

const resolveOriginRect = (): LongPressOriginRect => {
  const rect = buttonRef.value?.getBoundingClientRect();
  if (rect) {
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  }

  const fallbackWidth = typeof window === "undefined" ? 1 : window.innerWidth;
  const fallbackHeight = typeof window === "undefined" ? 1 : window.innerHeight;
  return {
    left: 0,
    top: fallbackHeight,
    right: fallbackWidth,
    bottom: fallbackHeight,
    width: fallbackWidth,
    height: 1,
  };
};
</script>

<style lang="scss" scoped>
.pr-discovery-long-press-button {
  --pr-discovery-long-press-pressure-outline: 0;
  --pr-discovery-long-press-progress: 0;
  --pr-discovery-long-press-tremble-duration: 112ms;
  --pr-discovery-long-press-tremble-left: 0;
  --pr-discovery-long-press-tremble-left-soft: 0;
  --pr-discovery-long-press-tremble-right: 0;
  --pr-discovery-long-press-tremble-right-soft: 0;
  --pr-discovery-long-press-tremble-up: 0;
  --pr-discovery-long-press-tremble-down: 0;
  --pr-discovery-long-press-tremble-rotate-left: 0deg;
  --pr-discovery-long-press-tremble-rotate-right: 0deg;

  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 3.5rem;
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
  border: 1.5px solid var(--sys-color-primary);
  border-radius: 0;
  background: var(--sys-color-surface);
  color: var(--sys-color-primary);
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease,
    outline-width 100ms ease;
  outline: 0 solid color-mix(in srgb, var(--sys-color-primary) 14%, transparent);
  outline-offset: 0;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
  will-change: transform, outline-width;
  @include mx.pu-font(section);
}

.pr-discovery-long-press-button__label {
  position: relative;
  z-index: 2;
  pointer-events: none;
  backface-visibility: hidden;
  transform: translateZ(0);
}

.pr-discovery-long-press-button__fill,
.pr-discovery-long-press-button__splash {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.pr-discovery-long-press-button__fill {
  z-index: 0;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--sys-color-primary-container) 82%, white),
    color-mix(in srgb, var(--sys-color-primary) 54%, white)
  );
  transform-origin: left center;
  transform: scaleX(var(--pr-discovery-long-press-progress, 0));
  transition: transform 180ms cubic-bezier(0.25, 1, 0.5, 1);
}

.pr-discovery-long-press-button__splash {
  z-index: 1;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--sys-color-primary) 72%, white) 42%,
    var(--sys-color-primary) 100%
  );
  opacity: 0;
  transform: translateX(calc(-100% + var(--pr-discovery-long-press-progress, 0) * 100%))
    scaleX(0.1);
}

.pr-discovery-long-press-button--charging {
  background: color-mix(
    in srgb,
    var(--sys-color-primary-container) 18%,
    var(--sys-color-surface)
  );
  animation: pr-discovery-long-press-tremble
    var(--pr-discovery-long-press-tremble-duration, 112ms) linear infinite;
  outline-width: var(--pr-discovery-long-press-pressure-outline, 0);
}

.pr-discovery-long-press-button--overload {
  background: color-mix(
    in srgb,
    var(--sys-color-primary-container) 28%,
    var(--sys-color-surface)
  );
  animation: pr-discovery-long-press-tremble
    var(--pr-discovery-long-press-tremble-duration, 76ms) linear infinite;
  outline-color: color-mix(in srgb, var(--sys-color-primary) 24%, transparent);
  outline-width: var(--pr-discovery-long-press-pressure-outline, 0);
}

.pr-discovery-long-press-button--burst {
  border-color: var(--sys-color-primary);
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
}

.pr-discovery-long-press-button--burst.pr-discovery-long-press-button--disabled {
  cursor: progress;
  opacity: 1;
}

.pr-discovery-long-press-button--burst .pr-discovery-long-press-button__splash {
  opacity: 1;
  transform: translateX(0) scaleX(11);
  transition:
    opacity 120ms ease,
    transform 420ms cubic-bezier(0.12, 0.82, 0.16, 1);
}

.pr-discovery-long-press-button--rollback .pr-discovery-long-press-button__fill {
  transition: transform 220ms cubic-bezier(0.2, 1, 0.2, 1);
}

.pr-discovery-long-press-button--disabled {
  cursor: not-allowed;
  opacity: 0.56;
  outline: 0;
}

@keyframes pr-discovery-long-press-tremble {
  0% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
  12% {
    transform: translate3d(
        var(--pr-discovery-long-press-tremble-left),
        var(--pr-discovery-long-press-tremble-up),
        0
      )
      rotate(var(--pr-discovery-long-press-tremble-rotate-left));
  }
  27% {
    transform: translate3d(
        var(--pr-discovery-long-press-tremble-right),
        var(--pr-discovery-long-press-tremble-down),
        0
      )
      rotate(var(--pr-discovery-long-press-tremble-rotate-right));
  }
  43% {
    transform: translate3d(
        var(--pr-discovery-long-press-tremble-left-soft),
        var(--pr-discovery-long-press-tremble-down),
        0
      )
      rotate(var(--pr-discovery-long-press-tremble-rotate-left));
  }
  58% {
    transform: translate3d(
        var(--pr-discovery-long-press-tremble-right),
        var(--pr-discovery-long-press-tremble-up),
        0
      )
      rotate(var(--pr-discovery-long-press-tremble-rotate-right));
  }
  73% {
    transform: translate3d(
        var(--pr-discovery-long-press-tremble-left),
        var(--pr-discovery-long-press-tremble-up),
        0
      )
      rotate(var(--pr-discovery-long-press-tremble-rotate-left));
  }
  88% {
    transform: translate3d(
        var(--pr-discovery-long-press-tremble-right-soft),
        var(--pr-discovery-long-press-tremble-down),
        0
      )
      rotate(var(--pr-discovery-long-press-tremble-rotate-right));
  }
  100% {
    transform: translate3d(0, 0, 0) rotate(0deg);
  }
}

@media (hover: hover) and (pointer: fine) {
  .pr-discovery-long-press-button:hover:not(.pr-discovery-long-press-button--disabled) {
    background: color-mix(
      in srgb,
      var(--sys-color-primary-container) 18%,
      var(--sys-color-surface)
    );
  }
}

@media (prefers-reduced-motion: reduce) {
  .pr-discovery-long-press-button,
  .pr-discovery-long-press-button__fill,
  .pr-discovery-long-press-button__splash {
    transition: none;
  }

  .pr-discovery-long-press-button--charging,
  .pr-discovery-long-press-button--overload {
    animation: none;
    outline-width: 0;
  }
}
</style>
