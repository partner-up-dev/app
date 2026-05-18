<template>
  <Modal
    :open="open"
    :title="title"
    max-width="760px"
    @close="emit('close')"
  >
    <div class="pr-route-map-modal">
      <RouteMap
        class="pr-route-map-modal__map"
        :route="route"
        :interactive="true"
        :fit-padding="44"
        :max-zoom="15"
        variant="immersive"
        hide-bottom-attribution
      />

      <RoutePointList
        class="pr-route-map-modal__points"
        :route="route"
        show-address
        variant="detail"
      />
    </div>
  </Modal>
</template>

<script setup lang="ts">
import RouteMap from "@/domains/route/ui/RouteMap.vue";
import RoutePointList from "@/domains/route/ui/RoutePointList.vue";
import type { Route } from "@/domains/route/model/route";
import Modal from "@/shared/ui/overlay/Modal.vue";

defineProps<{
  open: boolean;
  title: string;
  route: Route | null;
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<style scoped lang="scss">
.pr-route-map-modal {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.pr-route-map-modal__map {
  width: 100%;
  height: min(56vh, 480px);
  min-height: 320px;
}

.pr-route-map-modal__map :deep(.route-map--immersive),
.pr-route-map-modal__map :deep(.map-shell--immersive) {
  height: 100%;
  min-height: 100%;
}

.pr-route-map-modal__points {
  padding: 0 var(--sys-spacing-xsmall);
}
</style>
