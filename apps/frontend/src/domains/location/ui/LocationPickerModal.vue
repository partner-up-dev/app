<template>
  <Modal
    :open="open"
    :title="title ?? t('locationPicker.title')"
    max-width="760px"
    @close="emit('close')"
  >
    <LocationPickerPanel
      :initial-location="initialLocation"
      :api-key="apiKey"
      :referer="referer"
      @pick="handlePick"
      @cancel="emit('close')"
    />
  </Modal>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Modal from "@/shared/ui/overlay/Modal.vue";
import LocationPickerPanel from "@/domains/location/ui/LocationPickerPanel.vue";
import type { PickedLocation } from "@/domains/location/model/location-picker";

withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    initialLocation?: PickedLocation | null;
    apiKey?: string;
    referer?: string;
  }>(),
  {
    title: undefined,
    initialLocation: null,
    apiKey: undefined,
    referer: undefined,
  },
);

const emit = defineEmits<{
  pick: [location: PickedLocation];
  close: [];
}>();

const { t } = useI18n();

const handlePick = (location: PickedLocation) => {
  emit("pick", location);
};
</script>
