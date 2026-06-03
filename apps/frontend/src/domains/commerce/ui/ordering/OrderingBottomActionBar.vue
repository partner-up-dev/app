<template>
  <div class="ordering-bottom-action" data-testid="ordering.bottom-action">
    <div class="ordering-bottom-action__price">
      <strong :data-testid="priceTestid">{{ amountLabel }}</strong>
      <button
        type="button"
        class="ordering-bottom-action__price-detail"
        :disabled="!priceDetailEnabled"
        :data-testid="priceDetailTestid"
        aria-label="查看价格明细"
        @click="$emit('open-price-detail')"
      >
        <span
          class="ordering-bottom-action__chevron i-mdi-chevron-up"
          aria-hidden="true"
        ></span>
      </button>
    </div>

    <Button
      class="ordering-bottom-action__create"
      size="md"
      :disabled="!canCreate"
      :loading="loading"
      :data-testid="createTestid"
      @click="$emit('create')"
    >
      创建订单
    </Button>
  </div>
</template>

<script setup lang="ts">
import Button from "@/shared/ui/actions/Button.vue";

withDefaults(
  defineProps<{
    amountLabel: string;
    canCreate: boolean;
    loading: boolean;
    priceDetailEnabled?: boolean;
    priceTestid?: string;
    priceDetailTestid?: string;
    createTestid?: string;
  }>(),
  {
    priceDetailEnabled: true,
    priceTestid: "ordering.price",
    priceDetailTestid: "ordering.price-detail.open",
    createTestid: "ordering.create-order",
  },
);

defineEmits<{
  "open-price-detail": [];
  create: [];
}>();
</script>

<style scoped lang="scss">
.ordering-bottom-action {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(7.5rem, 8.5rem);
  gap: var(--sys-spacing-small);
  align-items: center;
  min-height: calc(3.625rem + var(--pu-safe-bottom));
  padding: 0 calc(var(--sys-spacing-medium) + var(--pu-safe-right))
    var(--pu-safe-bottom) calc(var(--sys-spacing-medium) + var(--pu-safe-left));
  border-top: 1px solid var(--sys-color-outline);
  background: var(--sys-color-surface-container);
  box-shadow: var(--sys-elevation-level2);
}

.ordering-bottom-action__price {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-xxsmall);
  min-width: 0;
  min-height: 3.625rem;
  color: var(--sys-color-on-surface);

  strong {
    @include mx.pu-font(title-large);
    min-width: 0;
    overflow-wrap: anywhere;
  }
}

.ordering-bottom-action__price-detail {
  display: inline-grid;
  flex: 0 0 auto;
  width: 1.875rem;
  height: 1.875rem;
  place-items: center;
  border: 1px solid var(--sys-color-outline);
  border-radius: 999px;
  padding: 0;
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  cursor: pointer;

  &:disabled {
    opacity: var(--sys-opacity-disabled);
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.ordering-bottom-action__create {
  width: 100%;
  min-height: 2.5rem;
  height: 2.5rem;
  padding: 0 var(--sys-spacing-medium);
}

.ordering-bottom-action__chevron {
  @include mx.pu-icon(small);
}

@media (max-width: 24rem) {
  .ordering-bottom-action {
    grid-template-columns: minmax(0, 1fr) minmax(6.5rem, 7.5rem);
  }
}
</style>
