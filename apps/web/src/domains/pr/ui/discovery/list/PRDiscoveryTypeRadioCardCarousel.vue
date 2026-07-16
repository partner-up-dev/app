<template>
  <PRPeekRadioCarousel
    class="pr-discovery-type-radio-card-carousel"
    :model-value="modelValue"
    :items="radioItems"
    :disabled="disabled"
    :aria-label="ariaLabel"
    data-testid="prd.other-types.carousel"
    @update:model-value="handleUpdate"
  >
    <template #item="{ item, selected }">
      <div
        class="pr-discovery-type-radio-card-carousel__card-target"
        @pointerdown="handleCardPointerDown"
        @pointermove="handleCardPointerMove"
        @pointercancel="resetCardPointerState"
        @click="handleCardClick($event, resolveCatalogItem(item))"
      >
        <PRDiscoveryCard
          mode="select"
          variant="default"
          surface="outline"
          :item="resolveCatalogItem(item)"
          :selected="selected"
          :disabled="disabled"
        />
      </div>
    </template>
  </PRPeekRadioCarousel>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { PRDiscoveryCatalogItem } from "@/domains/pr/model/pr-discovery-types";
import PRPeekRadioCarousel, {
  type PRPeekRadioCarouselItem,
} from "@/domains/pr/ui/discovery/form/PRPeekRadioCarousel.vue";
import PRDiscoveryCard from "@/domains/pr/ui/discovery/PRDiscoveryCard.vue";

const CARD_CLICK_DRAG_TOLERANCE_PX = 8;
type RadioCatalogItem = PRPeekRadioCarouselItem & {
  item: PRDiscoveryCatalogItem;
};

const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    items: readonly PRDiscoveryCatalogItem[];
    disabled?: boolean;
    ariaLabel?: string;
    activateOnCardClick?: boolean;
  }>(),
  {
    disabled: false,
    ariaLabel: undefined,
    activateOnCardClick: true,
  },
);
const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  activate: [type: string];
}>();

const radioItems = computed<RadioCatalogItem[]>(() =>
  props.items.map((item) => ({ id: item.type, item })),
);
const resolveCatalogItem = (value: PRPeekRadioCarouselItem): PRDiscoveryCatalogItem =>
  (value as RadioCatalogItem).item;

const cardPointerId = ref<number | null>(null);
const cardPointerStartX = ref(0);
const cardPointerStartY = ref(0);
const hasCardPointerMoved = ref(false);

const resetCardPointerState = () => {
  cardPointerId.value = null;
  cardPointerStartX.value = 0;
  cardPointerStartY.value = 0;
  hasCardPointerMoved.value = false;
};
const handleCardPointerDown = (event: PointerEvent) => {
  if (!props.activateOnCardClick || props.disabled) return;
  cardPointerId.value = event.pointerId;
  cardPointerStartX.value = event.clientX;
  cardPointerStartY.value = event.clientY;
  hasCardPointerMoved.value = false;
};
const handleCardPointerMove = (event: PointerEvent) => {
  if (event.pointerId !== cardPointerId.value) return;
  const deltaX = event.clientX - cardPointerStartX.value;
  const deltaY = event.clientY - cardPointerStartY.value;
  if (Math.hypot(deltaX, deltaY) >= CARD_CLICK_DRAG_TOLERANCE_PX) {
    hasCardPointerMoved.value = true;
  }
};
const handleCardClick = (event: MouseEvent, item: PRDiscoveryCatalogItem) => {
  if (!props.activateOnCardClick || props.disabled) return;
  event.stopPropagation();
  if (hasCardPointerMoved.value) {
    resetCardPointerState();
    return;
  }
  resetCardPointerState();
  emit("activate", item.type);
};
const handleUpdate = (value: string | number | null): void => {
  emit("update:modelValue", typeof value === "string" ? value : null);
};
</script>

<style scoped lang="scss">
.pr-discovery-type-radio-card-carousel__card-target {
  display: flex;
  width: 100%;
  min-height: 100%;
  block-size: 100%;
}

.pr-discovery-type-radio-card-carousel :deep(.pr-discovery-card) {
  min-height: 100%;
  block-size: 100%;
}
</style>
