<template>
  <section class="pr-discovery-catalog-entry" aria-label="PR Discovery">
    <p class="pr-discovery-catalog-entry__description">
      {{ t("home.landing.discoveryCatalogEntry.description") }}
    </p>
    <RouterLink
      class="pr-discovery-catalog-entry__action"
      :to="{ name: 'pr-discovery' }"
      data-testid="home.discovery-catalog.open"
    >
      {{ t("home.landing.discoveryCatalogEntry.action") }}
      <span class="pr-discovery-catalog-entry__icon i-mdi:arrow-right" aria-hidden="true" />
    </RouterLink>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.pr-discovery-catalog-entry {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sys-spacing-xsmall);
}

.pr-discovery-catalog-entry__description {
  @include mx.pu-font(body);
  max-width: 42ch;
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.pr-discovery-catalog-entry__action {
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  color: var(--sys-color-secondary);
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.4286;
  text-decoration: none;
  transition:
    color 180ms ease,
    transform 180ms ease;
}

.pr-discovery-catalog-entry__icon {
  display: inline-block;
  margin-left: var(--sys-spacing-xsmall);
  vertical-align: middle;
  @include mx.pu-icon(medium);
}

.pr-discovery-catalog-entry__action:focus-visible {
  outline: 2px solid var(--sys-color-primary);
  outline-offset: 2px;
}

@media (hover: hover) and (pointer: fine) {
  .pr-discovery-catalog-entry__action:hover {
    color: var(--sys-color-primary);
    transform: translateX(2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pr-discovery-catalog-entry__action {
    transition: none;
  }
}
</style>
