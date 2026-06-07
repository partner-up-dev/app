<template>
  <PuInlineNotice
    :tone="props.tone"
    :title="props.title"
    :message="props.message"
    :dismissible="props.dismissible"
    :close-label="resolvedCloseLabel"
    @close="emit('close')"
  >
    <slot />
  </PuInlineNotice>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { PuInlineNotice } from "@partner-up-dev/design-web";

type InlineNoticeTone = "info" | "success" | "warning" | "error";

const props = withDefaults(
  defineProps<{
    tone?: InlineNoticeTone;
    title?: string;
    message?: string;
    dismissible?: boolean;
    closeLabel?: string;
  }>(),
  {
    tone: "info",
    title: undefined,
    message: undefined,
    dismissible: false,
    closeLabel: undefined,
  },
);

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();

const resolvedCloseLabel = computed(() => props.closeLabel ?? t("common.close"));
</script>
