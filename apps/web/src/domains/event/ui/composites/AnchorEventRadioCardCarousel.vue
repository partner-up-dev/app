<template>
  <PeekRadioCarousel
    class="anchor-event-radio-card-carousel"
    :model-value="props.modelValue"
    :items="props.events"
    :disabled="props.disabled"
    :aria-label="props.ariaLabel"
    @update:model-value="emit('update:modelValue', $event as number | null)"
  >
    <template #item="{ item, selected }">
      <div
        class="anchor-event-radio-card-carousel__card-target"
        @pointerdown="handleCardPointerDown"
        @pointermove="handleCardPointerMove"
        @pointercancel="resetCardPointerState"
        @click="handleCardClick($event, asAnchorEventListItem(item))"
      >
        <EventCard
          mode="select"
          :event="asAnchorEventListItem(item)"
          :selected="selected"
          :disabled="props.disabled"
        />
      </div>
    </template>
  </PeekRadioCarousel>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { AnchorEventListItem } from "@/domains/event/model/types";
import EventCard from "@/domains/event/ui/primitives/EventCard.vue";
import PeekRadioCarousel from "@/domains/event/ui/composites/PeekRadioCarousel.vue";

const CARD_CLICK_DRAG_TOLERANCE_PX = 8;

const props = withDefaults(
  defineProps<{
    modelValue: number | null;
    events: readonly AnchorEventListItem[];
    disabled?: boolean;
    ariaLabel?: string;
    activateOnCardClick?: boolean;
  }>(),
  {
    disabled: false,
    ariaLabel: undefined,
    activateOnCardClick: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [eventId: number | null];
  activate: [eventId: number];
}>();

const asAnchorEventListItem = (value: unknown): AnchorEventListItem =>
  value as AnchorEventListItem;

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
  if (!props.activateOnCardClick || props.disabled) {
    return;
  }

  cardPointerId.value = event.pointerId;
  cardPointerStartX.value = event.clientX;
  cardPointerStartY.value = event.clientY;
  hasCardPointerMoved.value = false;
};

const handleCardPointerMove = (event: PointerEvent) => {
  if (event.pointerId !== cardPointerId.value) {
    return;
  }

  const deltaX = event.clientX - cardPointerStartX.value;
  const deltaY = event.clientY - cardPointerStartY.value;
  if (Math.hypot(deltaX, deltaY) >= CARD_CLICK_DRAG_TOLERANCE_PX) {
    hasCardPointerMoved.value = true;
  }
};

const handleCardClick = (event: MouseEvent, item: AnchorEventListItem) => {
  if (!props.activateOnCardClick || props.disabled) {
    return;
  }

  event.stopPropagation();
  if (hasCardPointerMoved.value) {
    resetCardPointerState();
    return;
  }

  resetCardPointerState();
  emit("activate", item.id);
};
</script>

<style lang="scss" scoped>
.anchor-event-radio-card-carousel__card-target {
  display: flex;
  block-size: 100%;
  min-height: 100%;
  inline-size: 100%;
}

.anchor-event-radio-card-carousel :deep(.event-card) {
  block-size: 100%;
  min-height: 100%;
}
</style>
