<template>
  <PageHeader
    :title="title ?? t('prPage.metaFallbackTitle')"
    @back="emit('back')"
  >
    <template #meta>
      <PRStatusBadge :status="status" />
      <time class="created-at">{{ createdAtLabel }}</time>
    </template>
  </PageHeader>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { PRStatus } from "@partner-up-dev/backend";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import PRStatusBadge from "@/domains/pr/ui/primitives/PRStatusBadge.vue";

defineProps<{
  title?: string;
  status: PRStatus;
  createdAtLabel: string;
}>();

const emit = defineEmits<{
  back: [];
}>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.created-at {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}
</style>
