<template>
  <button
    type="button"
    class="ride-sku-card"
    :class="{ 'is-selected': selected, 'is-disabled': !selectable }"
    :disabled="!selectable"
    data-testid="ordering.ride-hailing.vehicle-card"
    @click="$emit('select')"
  >
    <div class="ride-sku-card__left">
      <div class="ride-sku-card__name">
        <span class="i-mdi-information-outline" aria-hidden="true"></span>
        <strong>{{ displayName }}</strong>
      </div>
      <div class="ride-sku-card__preview" aria-hidden="true">
        <span class="i-mdi-car-side"></span>
      </div>
    </div>

    <div class="ride-sku-card__right">
      <div class="ride-sku-card__price">
        <span>{{ disabledReason ?? "预估" }}</span>
        <strong>{{ priceLabel }}</strong>
      </div>
      <span
        v-if="selected"
        class="ride-sku-card__check i-mdi-checkbox-marked-circle"
        data-testid="ordering.ride-hailing.vehicle-card.selected"
        aria-hidden="true"
      ></span>
    </div>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  displayName: string;
  priceLabel: string;
  selectable: boolean;
  selected: boolean;
  disabledReason: string | null;
}>();

defineEmits<{
  select: [];
}>();
</script>

<style scoped lang="scss">
.ride-sku-card {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
  width: 100%;
  min-width: 0;
  border: 0;
  border-radius: var(--sys-radius-small);
  padding: var(--sys-spacing-small);
  background: var(--sys-color-surface-container);
  color: var(--sys-color-on-surface);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition:
    transform 150ms ease,
    background-color 150ms ease;

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.ride-sku-card.is-selected {
  background: color-mix(in srgb, var(--sys-color-primary) 12%, var(--sys-color-surface));
}

.ride-sku-card.is-disabled {
  opacity: var(--sys-opacity-disabled);
  cursor: not-allowed;
}

.ride-sku-card__left {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.ride-sku-card__name {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-xsmall);

  span {
    @include mx.pu-icon(small);
    color: var(--sys-color-on-surface-variant);
  }

  strong {
    @include mx.pu-font(label-large);
    overflow-wrap: anywhere;
  }
}

.ride-sku-card__preview {
  display: grid;
  width: 6.25rem;
  height: 4.25rem;
  place-items: center;
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-primary-container);
  color: var(--sys-color-on-primary-container);

  span {
    @include mx.pu-icon(large);
  }
}

.ride-sku-card__right {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-around;
  gap: var(--sys-spacing-small);
}

.ride-sku-card__price {
  display: flex;
  align-items: baseline;
  gap: var(--sys-spacing-xsmall);

  span {
    @include mx.pu-font(label-small);
    color: var(--sys-color-on-surface-variant);
  }

  strong {
    @include mx.pu-font(title-medium);
    white-space: nowrap;
  }
}

.ride-sku-card__check {
  @include mx.pu-icon(small);
  color: var(--sys-color-primary);
}
</style>
