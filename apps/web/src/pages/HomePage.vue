<template>
  <div class="home-page" data-page="landing">
    <main class="home-flow">
      <section class="home-section home-section--hero" data-region="hero">
        <LandingHeroSection @reveal-values="handleHeroValuesReveal" />
        <LandingValuePropsSection
          class="hero-values"
          :start-reveal="shouldRevealHeroValues"
          data-region="value-props"
        />
      </section>

      <section class="home-section home-section--discovery">
        <div class="section-paper section-paper--discovery">
          <PRDiscoveryHighlightsSection />
          <PRDiscoveryCatalogEntry />
        </div>
      </section>

      <section class="home-section home-section--creator">
        <div class="section-stack section-stack--creator">
          <header class="section-header section-header--creator">
            <h2>{{ t("home.landing.secondaryActionsTitle") }}</h2>
            <p>{{ t("home.landing.secondaryActionsHint") }}</p>
          </header>
          <RouterLink
            class="creator-entry"
            :to="{ name: 'pr-create' }"
            @click="handleFallbackCreateClick"
          >
            <div class="creator-text">
              <h3>{{ t("home.landing.secondaryCreateTitle") }}</h3>
              <p>{{ t("home.landing.secondaryCreateDescription") }}</p>
            </div>
            <span class="creator-action-text">
              {{ t("home.landing.secondaryCreateAction") }}
              <span class="creator-action-icon i-mdi:arrow-right" aria-hidden="true"></span>
            </span>
          </RouterLink>
          <LandingWeChatAccessSection />
        </div>
      </section>
    </main>

    <PageFooter variant="brand" data-region="footer" />

    <OfficialAccountFollowNudge
      :open="officialAccountFollowPrompt.isVisible.value"
      @dismiss="officialAccountFollowPrompt.dismissPrompt"
      @complete="officialAccountFollowPrompt.markPromptCompleted"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import LandingHeroSection from "@/domains/landing/ui/sections/LandingHeroSection.vue";
import LandingValuePropsSection from "@/domains/landing/ui/sections/LandingValuePropsSection.vue";
import LandingWeChatAccessSection from "@/domains/landing/ui/sections/LandingWeChatAccessSection.vue";
import OfficialAccountFollowNudge from "@/domains/marketing/ui/OfficialAccountFollowNudge.vue";
import { useOfficialAccountFollowPrompt } from "@/domains/marketing/use-cases/useOfficialAccountFollowPrompt";
import PRDiscoveryCatalogEntry from "@/domains/pr/ui/discovery/landing/PRDiscoveryCatalogEntry.vue";
import PRDiscoveryHighlightsSection from "@/domains/pr/ui/discovery/landing/PRDiscoveryHighlightsSection.vue";
import { trackEvent } from "@/shared/telemetry/track";
import PageFooter from "@/shared/ui/sections/PageFooter.vue";

const HOME_SCROLL_SNAP_CLASS = "home-scroll-snap";
const OFFICIAL_ACCOUNT_FOLLOW_PROMPT_DELAY_MS = 14_000;

const { t } = useI18n();

const shouldRevealHeroValues = ref(false);
const officialAccountFollowPrompt = useOfficialAccountFollowPrompt("home");

const handleHeroValuesReveal = () => {
  shouldRevealHeroValues.value = true;
};

const handleFallbackCreateClick = () => {
  trackEvent("home_create_entry_click", {
    source: "fallback_section",
    target: "pr-create",
  });
};

onMounted(() => {
  if (typeof window === "undefined") return;
  document.documentElement.classList.add(HOME_SCROLL_SNAP_CLASS);
  document.body.classList.add(HOME_SCROLL_SNAP_CLASS);
  officialAccountFollowPrompt.requestPromptAfterDelay(OFFICIAL_ACCOUNT_FOLLOW_PROMPT_DELAY_MS);
});

onUnmounted(() => {
  if (typeof window === "undefined") return;
  document.documentElement.classList.remove(HOME_SCROLL_SNAP_CLASS);
  document.body.classList.remove(HOME_SCROLL_SNAP_CLASS);
});
</script>

<style lang="scss" scoped>
:global(html.home-scroll-snap),
:global(body.home-scroll-snap) {
  scroll-snap-type: y proximity;
}

.home-page {
  position: relative;
  isolation: isolate;
  overflow-x: clip;
  min-height: var(--pu-vh);
  --landing-section-gap: clamp(1rem, 4vw, 1.9rem);
  --landing-section-gap-compact: clamp(1.35rem, 5vw, 2.3rem);
  --landing-section-padding-block: clamp(1.25rem, 5vw, 3rem);
  --landing-section-padding-inline-compact: clamp(1rem, 4.8vw, 1.3rem);
  --landing-panel-gap: clamp(1rem, 4vw, 1.9rem);
  --landing-panel-padding: clamp(1rem, 3.6vw, 1.4rem);
  --landing-panel-padding-compact: clamp(1.12rem, 4.8vw, 1.58rem);
  --landing-entry-padding: clamp(0.95rem, 3.8vw, 1.45rem);
  --landing-entry-padding-compact: clamp(1.1rem, 4.8vw, 1.52rem);
  --landing-hero-padding-block: clamp(2.5rem, 9vw, 4.5rem);
  --landing-hero-padding-block-compact: clamp(2.7rem, 10.5vw, 4.7rem);
  --landing-hero-gap-compact: clamp(0.9rem, 4vw, 1.3rem);
  --landing-hero-title-measure: 9.5ch;
  --landing-hero-title-measure-compact: 8.8ch;
  --landing-hero-subtitle-measure: 30ch;
  --landing-hero-subtitle-measure-compact: 25ch;
  --page-footer-gap: clamp(1.3rem, 4.8vw, 2rem);
  --page-footer-copy-measure: 34ch;
  --landing-value-panel-max-height: 26rem;
}

.home-page::before,
.home-page::after {
  content: "";
  position: absolute;
  pointer-events: none;
  z-index: 0;
  border-radius: 999px;
}

.home-page::before {
  width: clamp(11rem, 32vw, 18rem);
  height: clamp(11rem, 32vw, 18rem);
  top: clamp(2rem, 8vh, 6rem);
  right: -20vw;
  background: color-mix(in srgb, var(--sys-color-tertiary) 18%, transparent);
  filter: blur(10px);
  animation: home-glow-drift-a 16s ease-in-out infinite alternate;
}

.home-page::after {
  width: clamp(9rem, 26vw, 15rem);
  height: clamp(9rem, 26vw, 15rem);
  top: clamp(20rem, 42vh, 32rem);
  left: -14vw;
  background: color-mix(in srgb, var(--sys-color-primary) 16%, transparent);
  filter: blur(6px);
  animation: home-glow-drift-b 14s ease-in-out infinite alternate;
}

.home-page > .home-flow,
.home-page > .home-section--footer {
  position: relative;
  z-index: 1;
}

.home-flow {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.home-section {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  scroll-snap-align: start;
  scroll-snap-stop: normal;
  justify-content: center;
  gap: var(--landing-section-gap);
  padding-block: var(--landing-section-padding-block);
  padding-left: calc(var(--sys-spacing-medium) + var(--pu-safe-left));
  padding-right: calc(var(--sys-spacing-medium) + var(--pu-safe-right));
  opacity: 0;
  transform: translate3d(0, 0.8rem, 0);
  animation: section-enter 620ms cubic-bezier(0.22, 0.72, 0.2, 1) forwards;
}

.home-section--hero {
  min-height: var(--pu-vh);
  justify-content: space-between;
  padding-top: calc(var(--landing-section-padding-block) + var(--pu-safe-top));
  animation-delay: 40ms;
}

.home-section--discovery {
  animation-delay: 100ms;
}

.hero-values {
  margin-top: auto;
}

.home-section--creator {
  justify-content: center;
  animation-delay: 150ms;
}

.section-paper {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: var(--landing-panel-gap);
  padding: var(--landing-panel-padding);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-large);
  @include mx.pu-elevation(1);
}

.section-paper--discovery {
  position: relative;
  z-index: 1;
  justify-content: flex-start;
  overflow: visible;
}

.section-stack {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--landing-panel-gap);
}

.section-stack--creator {
  max-width: min(100%, 32rem);
  padding-top: var(--sys-spacing-small);
  border-top: 1px dashed var(--sys-color-outline-variant);
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);

  h2 {
    font-size: 1.5rem;
    font-weight: 200;
    line-height: 2.25rem;
    color: var(--sys-color-on-surface);
    margin: 0;
  }

  p {
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface-variant);
    margin: 0;
    max-width: 28ch;
  }
}

.section-header--creator h2 {
  font-size: 1.375rem;
  font-weight: 400;
  line-height: 2rem;
}

.creator-entry {
  text-decoration: none;
  padding: var(--landing-entry-padding);
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--sys-spacing-small);
  border: 1px dashed var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container-low);
  transition:
    transform 210ms ease,
    border-color 210ms ease,
    background-color 210ms ease;

  &:hover {
    transform: translateY(-1px);
    border-color: var(--sys-color-primary);
    background: var(--sys-color-primary-container);
  }

  &:active {
    transform: scale(0.99);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 3px;
  }
}

.creator-text {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);

  h3 {
    font-size: 1.5rem;
    font-weight: 200;
    line-height: 2.25rem;
    color: var(--sys-color-on-surface);
    margin: 0;
  }

  p {
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface-variant);
    margin: 0;
  }
}

.creator-action-text {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.4286;
  color: var(--sys-color-primary);
  flex-shrink: 0;
  transition:
    transform 180ms ease,
    color 180ms ease;

  .creator-action-icon {
    margin-left: var(--sys-spacing-xsmall);
    display: inline-block;
    vertical-align: middle;
    @include mx.pu-icon(medium);
  }
}

.creator-entry:hover .creator-action-text {
  transform: translateX(4px);
}

@media (max-width: 768px) {
  .home-section {
    gap: var(--landing-section-gap-compact);
    padding-left: calc(var(--landing-section-padding-inline-compact) + var(--pu-safe-left));
    padding-right: calc(var(--landing-section-padding-inline-compact) + var(--pu-safe-right));
  }

  .section-header h2 {
    font-size: 1.375rem;
    font-weight: 400;
    line-height: 2rem;
  }

  .section-paper {
    padding: var(--landing-panel-padding-compact);
  }

  .section-header p {
    @include mx.pu-font(body);
  }

  .creator-entry {
    min-height: 3.7rem;
    padding: var(--landing-entry-padding-compact);
  }

  .creator-text h3 {
    font-size: 1.375rem;
    font-weight: 400;
    line-height: 2rem;
  }

  .creator-text p {
    @include mx.pu-font(body);
  }

  .creator-action-text {
    font-size: 1.125rem;
    line-height: 1.5;
  }
}

@keyframes section-enter {
  from {
    opacity: 0;
    transform: translate3d(0, 0.8rem, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes home-glow-drift-a {
  from {
    transform: translate3d(0, 0, 0) scale(0.94);
  }
  to {
    transform: translate3d(-1.2rem, 1rem, 0) scale(1.08);
  }
}

@keyframes home-glow-drift-b {
  from {
    transform: translate3d(0, 0, 0) scale(0.92);
  }
  to {
    transform: translate3d(1rem, -0.6rem, 0) scale(1.05);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-page::before,
  .home-page::after,
  .home-section,
  .creator-entry,
  .creator-action-text,
  .page-footer__nav-link,
  .page-footer__nav-link::before {
    animation: none !important;
    transition: none !important;
  }
}
</style>
