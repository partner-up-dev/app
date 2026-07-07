<template>
  <div class="thumb" :style="thumbStyles" ref="thumbElement">
    <div class="shape" :style="shapeStyles"></div>
    <div class="text" :style="textStyles">{{ displayText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

interface Props {
  keyText: string;
  style: number;
}

const props = defineProps<Props>();
const thumbElement = ref<HTMLElement>();

const displayText = computed(() => props.keyText.trim().slice(0, 4));

const palette = computed(() => {
  const idx = ((Math.floor(props.style) % 3) + 3) % 3;

  const palettes = [
    { bg: "#F7F7F8", fg: "#111827", accent: "#93C5FD" },
    { bg: "#FFF7ED", fg: "#111827", accent: "#FDBA74" },
    { bg: "#F0FDF4", fg: "#052E16", accent: "#86EFAC" },
  ] as const;

  return palettes[idx];
});

const thumbStyles = computed(() => ({
  width: "300px",
  height: "300px",
  position: "relative" as const,
  overflow: "hidden" as const,
  background: palette.value.bg,
  borderRadius: "24px",
  fontFamily:
    '"PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}));

const shapeStyles = computed(() => ({
  position: "absolute" as const,
  inset: "-40px" as const,
  background: `radial-gradient(circle at 30% 20%, ${palette.value.accent} 0%, transparent 55%)`,
  opacity: "0.9",
}));

const textStyles = computed(() => ({
  position: "absolute" as const,
  inset: "0" as const,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: palette.value.fg,
  fontSize: "120px",
  fontWeight: "700",
  letterSpacing: "-0.02em",
}));

defineExpose({
  thumbElement,
});
</script>

<style scoped>
.thumb {
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
