<template>
  <div class="utility-link-row" data-region="pr-discovery-entry">
    <RouterLink
      class="utility-link"
      :to="{ name: 'pr-discovery' }"
      data-testid="pr-detail.discovery.open"
    >
      {{ t("prPage.discoveryEntry.action") }}
      <span class="utility-link__icon i-mdi:arrow-right" aria-hidden="true" />
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.utility-link-row {
  display: flex;
  justify-content: flex-end;
}

.utility-link {
  @include mx.pu-font(body);
  display: inline-flex;
  align-items: center;
  color: var(--sys-color-secondary);
  text-decoration: none;
  transition:
    color 180ms ease,
    transform 180ms ease;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.utility-link__icon {
  margin-left: var(--sys-spacing-xsmall);
  display: inline-block;
  vertical-align: middle;
  @include mx.pu-icon(medium);
}

@media (hover: hover) and (pointer: fine) {
  .utility-link:hover {
    transform: translateX(2px);
    color: var(--sys-color-primary);
  }
}
</style>
