<template>
  <div class="ordering-footer-action-bar" data-testid="ordering.bottom-action">
    <div class="ordering-footer-action-bar__price-summary">
      <strong :data-testid="priceTestid">{{ amountLabel }}</strong>
      <PuButton
        class="ordering-footer-action-bar__price-detail-trigger"
        shape="circle"
        tone="neutral"
        variant="ghost"
        size="sm"
        :disabled="!priceDetailEnabled"
        :data-testid="priceDetailTestid"
        :aria-label="t('ordering.priceDetailAria')"
        @click="$emit('open-price-detail')"
      >
        <template #leading>
          <span
            class="ordering-footer-action-bar__chevron i-mdi-chevron-up"
            aria-hidden="true"
          ></span>
        </template>
      </PuButton>
    </div>

    <PuButton
      class="ordering-footer-action-bar__submit-action"
      size="md"
      :disabled="!canCreate"
      :loading="loading"
      :data-testid="createTestid"
      @click="$emit('create')"
    >
      {{ createLabel ?? t("ordering.createOrderAction") }}
    </PuButton>
  </div>
</template>

<script setup lang="ts">
import { PuButton } from "@partner-up-dev/design-web";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

withDefaults(
  defineProps<{
    amountLabel: string;
    canCreate: boolean;
    loading: boolean;
    priceDetailEnabled?: boolean;
    priceTestid?: string;
    priceDetailTestid?: string;
    createTestid?: string;
    createLabel?: string;
  }>(),
  {
    priceDetailEnabled: true,
    priceTestid: "ordering.price",
    priceDetailTestid: "ordering.price-detail.open",
    createTestid: "ordering.create-order",
    createLabel: undefined,
  },
);

defineEmits<{
  "open-price-detail": [];
  create: [];
}>();
</script>

<style scoped lang="scss">
.ordering-footer-action-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(7.5rem, 8.5rem);
  gap: var(--sys-spacing-small);
  align-items: center;
  min-height: calc(3.625rem + var(--pu-safe-bottom));
  padding: 0 calc(var(--sys-spacing-medium) + var(--pu-safe-right))
    var(--pu-safe-bottom) calc(var(--sys-spacing-medium) + var(--pu-safe-left));
  border-top: 1px solid var(--sys-color-outline);
  background: var(--sys-color-surface-container);
  box-shadow: var(--sys-shadow-2);
}

.ordering-footer-action-bar__price-summary {
  display: flex;
  align-items: center;
  gap: calc(var(--sys-spacing-xsmall) / 2);
  min-width: 0;
  min-height: 3.625rem;
  color: var(--sys-color-on-surface);

  strong {
    @include mx.pu-font(title);
    min-width: 0;
    overflow-wrap: anywhere;
  }
}

.ordering-footer-action-bar__price-detail-trigger {
  flex: 0 0 auto;
  width: 1.875rem;
  height: 1.875rem;
  min-width: 1.875rem;
  min-height: 1.875rem;
  padding: 0;
}

.ordering-footer-action-bar__submit-action {
  width: 100%;
  min-height: 2.5rem;
  height: 2.5rem;
  padding: 0 var(--sys-spacing-medium);
}

.ordering-footer-action-bar__chevron {
  @include mx.pu-icon(small);
}

@media (max-width: 24rem) {
  .ordering-footer-action-bar {
    grid-template-columns: minmax(0, 1fr) minmax(6.5rem, 7.5rem);
  }
}
</style>
