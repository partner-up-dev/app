<template>
  <header class="hero">
    <h1 class="hero-title" :aria-label="heroTitleRaw">
      <span class="hero-title-prefix">{{ heroTitlePrefix }}</span>
      <span v-if="heroTitleTyping" class="hero-title-typing" aria-hidden="true">
        {{ typedHeroTitle }}
      </span>
      <span
        v-if="
          heroTitleTyping.length > 0 &&
          typedHeroTitle.length < heroTitleTyping.length
        "
        class="hero-title-caret"
        aria-hidden="true"
      ></span>
    </h1>
    <p class="subtitle" :class="{ 'is-visible': showMeta }">
      {{ t("home.landing.heroSubtitle") }}
    </p>

    <div class="hero-actions" :class="{ 'is-visible': showMeta }">
      <RouterLink
        class="hero-action hero-action--primary"
        :to="{ name: 'event-plaza' }"
        @click="handlePrimaryClick"
      >
        {{ t("home.landing.heroPrimaryAction") }}
        <span class="i-mdi-arrow-right" />
      </RouterLink>
      <RouterLink
        class="hero-action hero-action--secondary"
        :to="{ name: 'pr-create' }"
        @click="handleSecondaryClick"
      >
        {{ t("home.landing.heroSecondaryAction") }}
        <span class="i-mdi-arrow-right" />
      </RouterLink>
    </div>

    <div class="hero-art" aria-hidden="true">
      <span class="hero-art-ring"></span>
      <span class="hero-art-ring hero-art-ring--offset"></span>
      <div class="hero-art-mark">
        <img
          src="/share-logo.png"
          alt=""
          class="hero-art-mark-image"
          :class="{ loading: logoLoading }"
          @load="logoLoading = false"
          @error="logoLoading = false"
        />
        <span v-if="logoLoading" class="hero-art-mark-fallback">搭一把</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { trackEvent } from "@/shared/telemetry/track";

const { t } = useI18n();
const emit = defineEmits<{
  (event: "reveal-values"): void;
}>();

const HERO_TYPING_START_DELAY_MS = 180;
const HERO_TYPING_BASE_INTERVAL_MS = 92;
const HERO_TYPING_PUNCTUATION_INTERVAL_MS = 140;
const HERO_META_REVEAL_REMAINING_CHARS = 2;
const HERO_VALUE_REVEAL_DELAY_MS = 280;

const heroTitleRaw = computed(() => t("home.landing.heroTitle").trim());

const heroTitleParts = computed(() => {
  const rawTitle = heroTitleRaw.value;
  const splitIndex = rawTitle.search(/[，,]/);

  if (splitIndex < 0 || splitIndex + 1 >= rawTitle.length) {
    return {
      prefix: rawTitle,
      typing: "",
    };
  }

  return {
    prefix: rawTitle.slice(0, splitIndex + 1),
    typing: rawTitle.slice(splitIndex + 1).trimStart(),
  };
});

const heroTitlePrefix = computed(() => heroTitleParts.value.prefix);
const heroTitleTyping = computed(() => heroTitleParts.value.typing);
const typedHeroTitle = ref("");
const showMeta = ref(false);
const logoLoading = ref(true);

let typingTimeoutId: number | null = null;
let valueRevealTimeoutId: number | null = null;
let hasEmittedValueReveal = false;

const clearAnimationTimers = () => {
  if (typeof window === "undefined") return;
  if (typingTimeoutId !== null) {
    window.clearTimeout(typingTimeoutId);
    typingTimeoutId = null;
  }
  if (valueRevealTimeoutId !== null) {
    window.clearTimeout(valueRevealTimeoutId);
    valueRevealTimeoutId = null;
  }
};

const emitValueReveal = () => {
  if (hasEmittedValueReveal) return;
  hasEmittedValueReveal = true;
  emit("reveal-values");
};

const scheduleValueReveal = () => {
  if (typeof window === "undefined") return;
  if (valueRevealTimeoutId !== null || hasEmittedValueReveal) return;

  valueRevealTimeoutId = window.setTimeout(() => {
    valueRevealTimeoutId = null;
    emitValueReveal();
  }, HERO_VALUE_REVEAL_DELAY_MS);
};

const revealMeta = () => {
  if (showMeta.value) return;
  showMeta.value = true;
  scheduleValueReveal();
};

const getTypingInterval = (char: string): number => {
  return /[，。！？,.!?]/.test(char)
    ? HERO_TYPING_PUNCTUATION_INTERVAL_MS
    : HERO_TYPING_BASE_INTERVAL_MS;
};

const typeNextCharacter = (index: number) => {
  const target = heroTitleTyping.value;
  if (index >= target.length) {
    typedHeroTitle.value = target;
    revealMeta();
    return;
  }

  typedHeroTitle.value = target.slice(0, index + 1);

  const remainingChars = target.length - (index + 1);
  if (remainingChars <= HERO_META_REVEAL_REMAINING_CHARS) {
    revealMeta();
  }

  const currentChar = target[index] ?? "";
  typingTimeoutId = window.setTimeout(() => {
    typeNextCharacter(index + 1);
  }, getTypingInterval(currentChar));
};

const startHeroAnimation = () => {
  clearAnimationTimers();
  hasEmittedValueReveal = false;
  typedHeroTitle.value = "";
  showMeta.value = false;

  if (typeof window === "undefined") return;
  const target = heroTitleTyping.value;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (prefersReducedMotion || target.length === 0) {
    typedHeroTitle.value = target;
    showMeta.value = true;
    emitValueReveal();
    return;
  }

  typingTimeoutId = window.setTimeout(() => {
    typeNextCharacter(0);
  }, HERO_TYPING_START_DELAY_MS);
};

const handlePrimaryClick = () => {
  trackEvent("home_hero_primary_click", {
    target: "event-plaza",
  });
};

const handleSecondaryClick = () => {
  trackEvent("home_create_entry_click", {
    source: "hero_secondary",
    target: "pr-create",
  });
};

onMounted(() => {
  startHeroAnimation();
});

onUnmounted(() => {
  clearAnimationTimers();
});
</script>

<style lang="scss" scoped>
.hero {
  position: relative;
  overflow: clip;
  padding: var(--landing-hero-padding-block) 0;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.hero-title {
  font-size: 2.625rem;
  font-weight: 200;
  color: var(--sys-color-on-surface);
  margin: 0;
  max-width: var(--landing-hero-title-measure);
  line-height: 1.02;
  text-wrap: balance;
}

.hero-title-prefix,
.hero-title-typing {
  display: inline;
}

.hero-title-typing {
  white-space: nowrap;
}

.hero-title-caret {
  display: inline-block;
  width: 0.08em;
  height: 0.94em;
  margin-left: 0.06em;
  background: currentColor;
  vertical-align: text-bottom;
  animation: hero-caret-blink 900ms steps(1) infinite;
}

.subtitle {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
  max-width: var(--landing-hero-subtitle-measure);
  opacity: 0;
  transform: translate3d(0, 0.55rem, 0);
  transition:
    opacity 320ms ease,
    transform 320ms ease;
}

.subtitle.is-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.hero-actions {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  margin-top: var(--sys-spacing-small);
  z-index: 1;
  opacity: 0;
  transform: translate3d(0, 0.6rem, 0);
  pointer-events: none;
  transition:
    opacity 340ms ease,
    transform 340ms ease;
}

.hero-actions.is-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
  pointer-events: auto;
}

.hero-action {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.4286;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-xsmall);
  width: fit-content;
  border: 1px solid transparent;
  border-radius: 999px;
  text-decoration: none;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    opacity 180ms ease,
    transform 180ms ease;

  &:active {
    opacity: 0.78;
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.hero-action--primary {
  color: var(--sys-color-on-primary-container);
  border-color: var(--sys-color-primary);
  background: var(--sys-color-primary-container);
  min-height: auto;
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
}

.hero-action--secondary {
  color: var(--sys-color-on-surface-variant);
  border-color: var(--sys-color-outline-variant);
  background: var(--sys-color-surface-container-low);
  min-height: auto;
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
}

.hero-action:hover {
  opacity: 0.92;
}

.hero-art {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hero-art-ring {
  position: absolute;
  right: -5.2rem;
  top: -1.6rem;
  width: 13.8rem;
  height: 13.8rem;
  border-radius: 999px;
  border: 1px solid
    color-mix(in srgb, var(--sys-color-primary) 28%, transparent);
}

.hero-art-ring--offset {
  right: -2.6rem;
  top: 2.2rem;
  width: 9.8rem;
  height: 9.8rem;
  border-color: color-mix(in srgb, var(--sys-color-tertiary) 25%, transparent);
}

.hero-art-mark {
  position: absolute;
  right: 0;
  top: 7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 6rem;
  height: 6rem;
}

.hero-art-mark-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 1;
  transition: opacity 200ms ease;
}

.hero-art-mark-image.loading {
  opacity: 0;
  pointer-events: none;
}

.hero-art-mark-fallback {
  font-size: 1.375rem;
  font-weight: 400;
  line-height: 2rem;
  position: absolute;
  letter-spacing: 0.12em;
  color: var(--sys-color-outline);
}

@media (max-width: 768px) {
  .hero {
    padding: var(--landing-hero-padding-block-compact) 0;
    gap: var(--landing-hero-gap-compact);
  }

  .hero-title {
    font-size: 2.625rem;
    max-width: var(--landing-hero-title-measure-compact);
  }

  .subtitle {
    @include mx.pu-font(body);
    max-width: var(--landing-hero-subtitle-measure-compact);
  }

  .hero-actions {
    gap: var(--sys-spacing-small);
  }

  .hero-action {
    font-size: 1rem;
    line-height: 1.5;
  }

  .hero-action--primary,
  .hero-action--secondary {
    min-height: calc(calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall)) + var(--sys-spacing-small));
    padding: var(--sys-spacing-small) var(--sys-spacing-medium);
  }

  .hero-art-ring {
    right: -5.8rem;
    width: 14.2rem;
    height: 14.2rem;
  }

  .hero-art-ring--offset {
    right: -2.9rem;
    width: 10.2rem;
    height: 10.2rem;
  }

  .hero-art-mark {
    width: 5rem;
    height: 5rem;
    top: 6.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .subtitle,
  .hero-actions,
  .hero-action,
  .hero-title-caret {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes hero-caret-blink {
  0%,
  48% {
    opacity: 1;
  }
  49%,
  100% {
    opacity: 0;
  }
}
</style>
