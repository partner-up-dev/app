<template>
  <PRPreviewCardFrame
    mode="button"
    :title="title"
    status="OPEN"
    :time-label="timeLabel"
    :place-label="displayLocationName"
    :place-icon="placeIcon"
    :preference-tags="preferenceTags"
    :partner-count-label="partnerCountLabel"
    :cover-image="coverImage"
    :disabled="disabled || pending"
    @activate="emit('open-detail')"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import PRPreviewCardFrame from "@/domains/pr/ui/primitives/PRPreviewCardFrame.vue";

const props = withDefaults(
  defineProps<{
    title: string;
    timeLabel: string;
    displayLocationName: string;
    placeIcon?: string;
    preferenceTags?: readonly string[];
    maxPartners: number | null;
    coverImage?: string | null;
    pending?: boolean;
    disabled?: boolean;
  }>(),
  {
    placeIcon: "📍",
    preferenceTags: () => [],
    coverImage: null,
    pending: false,
    disabled: false,
  },
);

const emit = defineEmits<{
  "open-detail": [];
}>();

const partnerCountLabel = computed(() =>
  props.maxPartners === null ? null : String(props.maxPartners),
);
</script>
