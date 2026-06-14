<template>
  <PuPageHeader
    :title="title ?? t('prPage.metaFallbackTitle')"
    show-back
    :back-label="t('common.backToHome')"
    @back="emit('back')"
  >
    <template #meta>
      <div class="pr-hero-header__meta">
        <PuTag
          :text="statusTagText"
          :tone="statusTagTone"
          variant="soft"
          shape="pill"
          size="md"
        />
        <time class="created-at">{{ createdAtLabel }}</time>
      </div>
    </template>
  </PuPageHeader>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { PRStatus } from "@partner-up-dev/backend";
import { PuPageHeader, PuTag } from "@partner-up-dev/design-web";
import {
  resolvePRStatusTagText,
  resolvePRStatusTagTone,
} from "@/domains/pr/model/pr-status-tag";

const props = defineProps<{
  title?: string;
  status: PRStatus;
  createdAtLabel: string;
}>();

const emit = defineEmits<{
  back: [];
}>();

const { t } = useI18n();
const statusTagText = computed(() => resolvePRStatusTagText(props.status, t));
const statusTagTone = computed(() => resolvePRStatusTagTone(props.status));
</script>

<style lang="scss" scoped>
.pr-hero-header__meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  width: 100%;
  min-width: 0;
}

.created-at {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}
</style>
