<template>
  <PuCard
    :as="cardAs"
    class="ride-hailing-sku-card"
    :class="{ 'is-readonly': readonly, 'is-selected': selected && !readonly }"
    :type="cardType"
    :selectable="!readonly"
    :active="selected && !readonly"
    :disabled="readonly ? undefined : !selectable"
    variant="soft"
    tone="neutral"
    padding="sm"
    gap="sm"
    :data-testid="dataTestId"
    @click="handleSelect"
  >
    <div class="ride-hailing-sku-card__layout">
      <div class="ride-hailing-sku-card__meta">
        <div class="ride-hailing-sku-card__name-row">
          <strong>{{ displayName }}</strong>
          <span
            class="ride-hailing-sku-card__info-icon i-mdi-information-outline"
            aria-hidden="true"
          ></span>
        </div>

        <div class="ride-hailing-sku-card__preview" aria-hidden="true">
          <img
            v-if="resolvedPreviewSrc && !previewFailed"
            :src="resolvedPreviewSrc"
            :alt="displayName"
            @error="previewFailed = true"
          />
          <span v-else class="i-mdi-car-side"></span>
        </div>
      </div>

      <div class="ride-hailing-sku-card__pricing">
        <span class="ride-hailing-sku-card__estimate">预估</span>
        <div class="ride-hailing-sku-card__amount-stack">
          <strong>{{ priceLabel }}</strong>
          <span
            v-if="!readonly"
            class="ride-hailing-sku-card__checkbox"
            :class="{ 'is-checked': selected }"
            :data-testid="selected ? 'ordering.ride-hailing.vehicle-card.selected' : undefined"
            aria-hidden="true"
          >
            <PuCheckbox
              :model-value="selected"
              :disabled="!selectable"
              size="sm"
              aria-label="选择车型"
              tabindex="-1"
            />
          </span>
        </div>
      </div>
    </div>
  </PuCard>
</template>

<script setup lang="ts">
import { PuCard, PuCheckbox } from "@partner-up-dev/design-web";
import { computed, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    displayName: string;
    priceLabel: string;
    selectable: boolean;
    selected: boolean;
    previewSrc?: string | null;
    readonly?: boolean;
  }>(),
  {
    readonly: false,
  },
);

const emit = defineEmits<{
  select: [];
}>();

const previewFailed = ref(false);
const cardAs = computed(() => (props.readonly ? "article" : "button"));
const cardType = computed(() => (props.readonly ? undefined : "button"));
const dataTestId = computed(() =>
  props.readonly ? "order-detail.ride-hailing.vehicle-card" : "ordering.ride-hailing.vehicle-card",
);

const resolvedPreviewSrc = computed(() => {
  const value = props.previewSrc?.trim() ?? "";
  if (!value) return null;
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value.startsWith("/")
  ) {
    return value;
  }
  return null;
});

watch(
  () => props.previewSrc,
  () => {
    previewFailed.value = false;
  },
);

const handleSelect = (): void => {
  if (props.readonly || !props.selectable) return;
  emit("select");
};
</script>

<style scoped lang="scss">
.ride-hailing-sku-card {
  width: 100%;
  min-width: 0;
  border-radius: var(--sys-radius-small);
  text-align: left;

  &.is-readonly {
    cursor: default;
  }
}

.ride-hailing-sku-card__layout {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: stretch;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
}

.ride-hailing-sku-card__meta {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.ride-hailing-sku-card__name-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--sys-spacing-xsmall);

  strong {
    @include mx.pu-font(control);
    min-width: 0;
    overflow-wrap: anywhere;
  }
}

.ride-hailing-sku-card__info-icon {
  @include mx.pu-icon(small);
  flex: 0 0 auto;
  color: var(--sys-color-on-surface-variant);
}

.ride-hailing-sku-card__preview {
  display: grid;
  width: min(13.5rem, 100%);
  min-height: 5rem;
  aspect-ratio: 16 / 9;
  place-items: center;
  overflow: hidden;
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-primary-container);
  color: var(--sys-color-on-primary-container);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  span {
    @include mx.pu-icon(large);
  }
}

.ride-hailing-sku-card__pricing {
  display: flex;
  flex: 0 0 auto;
  min-width: 5.25rem;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
  text-align: right;

  .ride-hailing-sku-card__estimate {
    @include mx.pu-font(caption);
    color: var(--sys-color-on-surface-variant);
  }
}

.ride-hailing-sku-card__amount-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--sys-spacing-small);

  strong {
    @include mx.pu-font(section);
    white-space: nowrap;
  }
}

.ride-hailing-sku-card__checkbox {
  display: grid;
  place-items: center;
  color: var(--sys-color-on-surface-variant);
  pointer-events: none;

  &.is-checked {
    color: var(--sys-color-primary);
  }

  :deep(.pu-checkbox) {
    pointer-events: none;
  }
}

@media (max-width: 420px) {
  .ride-hailing-sku-card__layout {
    gap: var(--sys-spacing-small);
  }

  .ride-hailing-sku-card__preview {
    width: min(10rem, 100%);
    min-height: 4.5rem;
  }

  .ride-hailing-sku-card__pricing {
    min-width: 4.75rem;
  }
}
</style>
