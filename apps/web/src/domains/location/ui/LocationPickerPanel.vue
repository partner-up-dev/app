<template>
  <LocationPickerBody
    :initial-location="initialLocation"
    :api-key="apiKey"
    :referer="referer"
    @pick="emit('pick', $event)"
    @cancel="emit('cancel')"
  />
</template>

<script setup lang="ts">
import type { PickedLocation } from "@/domains/location/model/location-picker";
import LocationPickerBody from "@/domains/location/ui/LocationPickerBody.vue";

withDefaults(
  defineProps<{
    initialLocation?: PickedLocation | null;
    apiKey?: string;
    referer?: string;
  }>(),
  {
    initialLocation: null,
    apiKey: undefined,
    referer: undefined,
  },
);

const emit = defineEmits<{
  pick: [location: PickedLocation];
  cancel: [];
}>();
</script>
