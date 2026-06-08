<template>
  <div
    :class="['poster-template', styleConfig.background.className]"
    :style="posterStyles"
    ref="posterElement"
  >
    <div class="poster-body" :style="contentStyles">
      <div class="caption-text" :style="textStyles">
        {{ formattedCaption }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { getPosterStyle, POSTER_DIMENSIONS } from "@/lib/poster-types";
import type { PosterData } from "@/lib/poster-types";

interface Props {
  data: PosterData;
}

const props = defineProps<Props>();
const posterElement = ref<HTMLElement>();

// Get style configuration based on caption style
const styleConfig = computed(() => getPosterStyle(props.data.style));

// Format caption - remove excessive line breaks and normalize spacing
const formattedCaption = computed(() => {
  return props.data.caption
    .trim()
    .replace(/\n{3,}/g, "\n\n") // Max 2 consecutive line breaks
    .replace(/\s+/g, " "); // Normalize spaces
});

// Poster container styles
const posterStyles = computed(() => ({
  width: `${POSTER_DIMENSIONS.width}px`,
  height: `${POSTER_DIMENSIONS.height}px`,
  position: "relative" as const,
  overflow: "hidden" as const,
  fontFamily: styleConfig.value.typography.primaryFont,
  background:
    styleConfig.value.background.type === "gradient"
      ? `linear-gradient(135deg, ${styleConfig.value.background.colors.join(", ")})`
      : styleConfig.value.background.colors[0],
}));

// Content container styles
const contentStyles = computed(() => ({
  padding: styleConfig.value.layout.padding,
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: styleConfig.value.layout.textAlign,
  maxWidth: styleConfig.value.layout.maxWidth,
  margin: "0 auto",
}));

// Text styles
const textStyles = computed(() => ({
  fontSize: styleConfig.value.typography.primarySize,
  fontWeight: styleConfig.value.typography.primaryWeight,
  color: styleConfig.value.typography.primaryColor,
  lineHeight: styleConfig.value.typography.lineHeight,
  letterSpacing: styleConfig.value.typography.letterSpacing || "normal",
  wordBreak: "break-word" as const,
  hyphens: "auto" as const,
}));

// Expose poster element for html2canvas
defineExpose({
  posterElement,
});
</script>

<style scoped>
.poster-template {
  /* Ensure consistent rendering */
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

.poster-body {
  box-sizing: border-box;
}

.caption-text {
  /* Ensure proper text rendering */
  white-space: pre-line;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Background classes for different styles */
.bg-gradient-fresh {
  background: linear-gradient(135deg, #f0f9e9 0%, #e6f3d3 100%);
}

.bg-minimal {
  background: #ffffff;
}

.bg-gradient-warm {
  background: linear-gradient(135deg, #fff5f0 0%, #ffe4d6 100%);
}

.bg-gradient-modern {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.bg-elegant {
  background: #fef9f6;
}
</style>
