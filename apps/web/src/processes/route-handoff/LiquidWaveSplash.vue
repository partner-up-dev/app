<template>
  <svg
    ref="rootRef"
    class="liquid-wave-splash"
    :style="splashStyle"
    :viewBox="viewBox"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path
      v-for="layer in waveLayers"
      :key="layer.id"
      class="liquid-wave-splash__layer"
      :class="`liquid-wave-splash__layer--${layer.id}`"
      :d="layer.path"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

export type LiquidSplashOriginRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type LiquidSplashPhase = "FILL" | "HOLD" | "DRAIN";

type WaveLayerId = "body" | "volume" | "shine";

type WaveLayerConfig = {
  id: WaveLayerId;
  amplitudeScale: number;
  phaseOffset: number;
  speed: number;
  yOffset: number;
  wavelengthScale: number;
};

type WaveLayerState = {
  id: WaveLayerId;
  path: string;
};

const props = withDefaults(
  defineProps<{
    durationMs?: number;
    originRect?: LiquidSplashOriginRect | null;
    phase: LiquidSplashPhase;
  }>(),
  {
    durationMs: 980,
    originRect: null,
  },
);

const emit = defineEmits<{
  "fill-complete": [];
  "drain-complete": [];
}>();

const WAVE_LAYERS: readonly WaveLayerConfig[] = [
  {
    id: "body",
    amplitudeScale: 1,
    phaseOffset: 0,
    speed: 1.7,
    yOffset: -10,
    wavelengthScale: 1,
  },
  {
    id: "volume",
    amplitudeScale: 0.72,
    phaseOffset: Math.PI * 0.72,
    speed: 1.25,
    yOffset: 8,
    wavelengthScale: 0.78,
  },
  {
    id: "shine",
    amplitudeScale: 0.42,
    phaseOffset: Math.PI * 1.34,
    speed: 0.92,
    yOffset: 24,
    wavelengthScale: 1.22,
  },
];

const rootRef = ref<SVGSVGElement | null>(null);
const viewportSize = ref({
  height: 1,
  width: 1,
});
const waveLayers = ref<WaveLayerState[]>(
  WAVE_LAYERS.map((layer) => ({
    id: layer.id,
    path: "",
  })),
);
const prefersReducedMotion = ref(false);
const revealClipPath = ref("none");

let animationFrameId: number | null = null;
let drainStartedAt: number | null = null;
let fillStartedAt: number | null = null;
let drainCompleted = false;
let fillCompleted = false;
let resizeObserver: ResizeObserver | null = null;
let motionQuery: MediaQueryList | null = null;

const viewBox = computed(
  () => `0 0 ${viewportSize.value.width} ${viewportSize.value.height}`,
);

const splashStyle = computed(() => ({
  clipPath: revealClipPath.value,
}));

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const smoothstep = (edge0: number, edge1: number, value: number): number => {
  const progress = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return progress * progress * (3 - 2 * progress);
};

const easeInQuad = (value: number): number => value * value;

const easeOutCubic = (value: number): number => 1 - (1 - value) ** 3;

const interpolate = (start: number, end: number, progress: number): number =>
  start + (end - start) * progress;

const getCurrentTime = (): number =>
  typeof window === "undefined" ? 0 : window.performance.now();

const updateViewportSize = () => {
  if (typeof window === "undefined") {
    return;
  }

  const rect = rootRef.value?.getBoundingClientRect();
  viewportSize.value = {
    height: Math.max(1, Math.round(rect?.height ?? window.innerHeight)),
    width: Math.max(1, Math.round(rect?.width ?? window.innerWidth)),
  };
};

const getDrainProgress = (now: number): number => {
  if (props.phase !== "DRAIN" || drainStartedAt === null) {
    return 0;
  }
  return clamp((now - drainStartedAt) / props.durationMs, 0, 1);
};

const getFillProgress = (now: number): number => {
  if (props.phase !== "FILL" || fillStartedAt === null) {
    return props.phase === "HOLD" ? 1 : 0;
  }
  return clamp((now - fillStartedAt) / props.durationMs, 0, 1);
};

const getFallProgress = (progress: number): number => {
  const surfaceRelease = smoothstep(0, 0.16, progress) * 0.08;
  const gravityFall = easeInQuad(clamp((progress - 0.08) / 0.92, 0, 1)) * 0.92;
  return clamp(surfaceRelease + gravityFall, 0, 1);
};

const getRiseProgress = (progress: number): number => {
  const impactPush = easeOutCubic(clamp(progress / 0.28, 0, 1)) * 0.54;
  const pressureSettle =
    smoothstep(0.18, 1, progress) * smoothstep(0.08, 0.92, progress) * 0.46;
  return clamp(impactPush + pressureSettle, 0, 1);
};

const getWaveAmplitude = (progress: number, shortSide: number): number => {
  const calmAmplitude = clamp(shortSide * 0.018, 7, 15);
  const flowAmplitude = clamp(shortSide * 0.064, 28, 54);
  const flowSurge = Math.pow(Math.sin(Math.PI * progress), 0.72);
  const nearEmpty = smoothstep(0.72, 1, progress);
  return (
    interpolate(calmAmplitude, flowAmplitude, flowSurge) *
    (1 - nearEmpty * 0.62)
  );
};

const getOriginCenter = () => {
  const origin = props.originRect;
  const { height, width } = viewportSize.value;

  if (!origin) {
    return {
      x: width / 2,
      y: height,
    };
  }

  return {
    x: origin.left + origin.width / 2,
    y: origin.top + origin.height / 2,
  };
};

const getCoverRadius = (): number => {
  const { height, width } = viewportSize.value;
  const center = getOriginCenter();
  const farthestCornerDistance = Math.max(
    Math.hypot(center.x, center.y),
    Math.hypot(width - center.x, center.y),
    Math.hypot(center.x, height - center.y),
    Math.hypot(width - center.x, height - center.y),
  );
  return farthestCornerDistance + 96;
};

const updateRevealClipPath = (progress: number) => {
  if (props.phase !== "FILL") {
    revealClipPath.value = "none";
    return;
  }

  const center = getOriginCenter();
  const origin = props.originRect;
  const startRadius = origin
    ? Math.max(origin.width, origin.height) * 0.48
    : 16;
  const pressureProgress = easeOutCubic(progress);
  const radius =
    startRadius + (getCoverRadius() - startRadius) * pressureProgress;
  revealClipPath.value = `circle(${radius.toFixed(2)}px at ${center.x.toFixed(
    2,
  )}px ${center.y.toFixed(2)}px)`;
};

const buildWavePath = (
  layer: WaveLayerConfig,
  now: number,
  progress: number,
): string => {
  const { height, width } = viewportSize.value;
  const shortSide = Math.min(width, height);
  const amplitude = getWaveAmplitude(progress, shortSide) * layer.amplitudeScale;
  const offscreenPadding = Math.max(64, amplitude * 2.4);
  const fallProgress = getFallProgress(progress);
  const riseProgress = getRiseProgress(progress);
  const origin = props.originRect;
  const originSurfaceY = origin ? origin.top - amplitude * 0.3 : height;
  const baseY =
    props.phase === "FILL"
      ? interpolate(originSurfaceY, -offscreenPadding, riseProgress)
      : props.phase === "DRAIN"
        ? interpolate(-offscreenPadding, height + offscreenPadding, fallProgress)
        : -offscreenPadding;
  const phase = (now / 1000) * layer.speed * Math.PI + layer.phaseOffset;
  const wavelength = clamp(width * 0.48 * layer.wavelengthScale, 160, 420);
  const secondaryWavelength = wavelength * 0.56;
  const tertiaryWavelength = wavelength * 1.76;
  const step = clamp(width / 42, 10, 20);
  const startX = -step;
  const endX = width + step;

  const waveY = (x: number): number =>
    baseY +
    layer.yOffset +
    amplitude * Math.sin((x / wavelength) * Math.PI * 2 + phase) +
    amplitude *
      0.46 *
      Math.sin((x / secondaryWavelength) * Math.PI * 2 + phase * 0.72) +
    amplitude *
      0.2 *
      Math.sin((x / tertiaryWavelength) * Math.PI * 2 - phase * 0.54);

  const segments: string[] = [
    `M ${startX.toFixed(2)} ${waveY(startX).toFixed(2)}`,
  ];
  for (let x = 0; x <= width; x += step) {
    segments.push(`L ${x.toFixed(2)} ${waveY(x).toFixed(2)}`);
  }
  segments.push(`L ${endX.toFixed(2)} ${waveY(endX).toFixed(2)}`);
  segments.push(
    `L ${endX.toFixed(2)} ${(height + offscreenPadding).toFixed(2)}`,
  );
  segments.push(
    `L ${startX.toFixed(2)} ${(height + offscreenPadding).toFixed(2)} Z`,
  );

  return segments.join(" ");
};

const renderFrame = (now: number) => {
  const progress =
    props.phase === "FILL" ? getFillProgress(now) : getDrainProgress(now);
  updateRevealClipPath(progress);

  if (prefersReducedMotion.value && props.phase === "FILL") {
    revealClipPath.value = "none";
    waveLayers.value = WAVE_LAYERS.map((layer) => ({
      id: layer.id,
      path: buildWavePath(layer, now, 1),
    }));
    if (!fillCompleted) {
      fillCompleted = true;
      emit("fill-complete");
    }
    return;
  }

  if (prefersReducedMotion.value && props.phase === "DRAIN") {
    waveLayers.value = waveLayers.value.map((layer) => ({
      ...layer,
      path: "",
    }));
    if (!drainCompleted) {
      drainCompleted = true;
      emit("drain-complete");
    }
    return;
  }

  waveLayers.value = WAVE_LAYERS.map((layer) => ({
    id: layer.id,
    path: buildWavePath(layer, now, progress),
  }));

  if (props.phase === "FILL" && progress >= 1) {
    if (!fillCompleted) {
      fillCompleted = true;
      emit("fill-complete");
    }
    animationFrameId = window.requestAnimationFrame(renderFrame);
    return;
  }

  if (props.phase === "DRAIN" && progress >= 1) {
    if (!drainCompleted) {
      drainCompleted = true;
      emit("drain-complete");
    }
    return;
  }

  if (typeof window !== "undefined") {
    animationFrameId = window.requestAnimationFrame(renderFrame);
  }
};

const stopAnimation = () => {
  if (typeof window === "undefined" || animationFrameId === null) {
    animationFrameId = null;
    return;
  }

  window.cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
};

const startAnimation = () => {
  if (typeof window === "undefined") {
    return;
  }

  stopAnimation();
  renderFrame(getCurrentTime());
};

const startPhase = (phase: LiquidSplashPhase) => {
  drainCompleted = false;
  fillCompleted = false;
  const now = getCurrentTime();
  drainStartedAt = phase === "DRAIN" ? now : null;
  fillStartedAt = phase === "FILL" ? now : null;
  startAnimation();
};

const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
  prefersReducedMotion.value = event.matches;
  startPhase(props.phase);
};

onMounted(() => {
  updateViewportSize();

  if (typeof ResizeObserver !== "undefined" && rootRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateViewportSize();
    });
    resizeObserver.observe(rootRef.value);
  }

  if (typeof window !== "undefined") {
    motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion.value = motionQuery.matches;
    motionQuery.addEventListener("change", handleMotionPreferenceChange);
  }

  startPhase(props.phase);
});

watch(
  () => props.phase,
  (phase) => {
    if (rootRef.value === null) {
      return;
    }

    startPhase(phase);
  },
);

onBeforeUnmount(() => {
  stopAnimation();
  resizeObserver?.disconnect();
  if (motionQuery !== null) {
    motionQuery.removeEventListener("change", handleMotionPreferenceChange);
    motionQuery = null;
  }
});
</script>

<style scoped lang="scss">
.liquid-wave-splash {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
}

.liquid-wave-splash__layer--body {
  fill: var(--sys-color-primary);
  fill-opacity: 1;
}

.liquid-wave-splash__layer--volume {
  fill: color-mix(in srgb, var(--sys-color-primary) 82%, white);
  fill-opacity: 0.5;
}

.liquid-wave-splash__layer--shine {
  fill: color-mix(in srgb, var(--sys-color-primary) 68%, white);
  fill-opacity: 0.28;
}
</style>
