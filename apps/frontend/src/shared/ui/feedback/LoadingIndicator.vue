<template>
  <PuLoadingState
    :message="props.message"
    :label="resolvedLabel"
    size="lg"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { PuLoadingState } from "@partner-up-dev/design-web";

const props = defineProps<{
  message?: string;
}>();

const { t } = useI18n();

const resolvedLabel = computed(() => props.message ?? t("common.loading"));
</script>
