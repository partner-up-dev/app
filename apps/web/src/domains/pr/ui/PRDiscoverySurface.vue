<template>
  <section class="pr-discovery-surface" data-testid="prd.surface">
    <div v-if="showToolbar" class="pr-discovery-surface__toolbar" data-testid="prd.view-switch">
      <PuSegmented
        :model-value="viewMode"
        aria-label="选择发现视图"
        full-width
        equal-width
        @update:model-value="handleViewModeChange"
      >
        <PuSegmentedItem
          v-for="option in viewOptions"
          :key="option.value"
          :value="option.value"
          :label="option.label"
          :data-testid="option.testId"
        />
      </PuSegmented>
    </div>

    <PuLoadingState
      v-if="loading"
      title="正在加载发现内容"
      message="请稍候…"
      data-testid="prd.state.loading"
    />
    <PuInlineNotice
      v-else-if="errorMessage"
      tone="error"
      title="发现内容加载失败"
      :message="errorMessage"
      data-testid="prd.state.error"
    >
      <template v-if="$slots['error-actions']" #actions>
        <slot name="error-actions" />
      </template>
    </PuInlineNotice>
    <PuEmptyState
      v-else-if="empty"
      icon="i-mdi-compass-outline"
      title="还没有匹配的搭子"
      description="调整时间、地点或路线后再试试。"
      data-testid="prd.state.empty"
    />
    <div v-else class="pr-discovery-surface__view-region" data-testid="prd.view-region">
      <slot :name="viewMode.toLowerCase()" />
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  PuEmptyState,
  PuInlineNotice,
  PuLoadingState,
  PuSegmented,
  PuSegmentedItem,
} from "@partner-up-dev/design-web";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { isPRDiscoveryViewMode, type PRDiscoveryViewMode } from "@/domains/pr/model/discovery";

withDefaults(
  defineProps<{
    viewMode: PRDiscoveryViewMode;
    loading?: boolean;
    empty?: boolean;
    errorMessage?: string | null;
    showToolbar?: boolean;
  }>(),
  { showToolbar: true },
);

const emit = defineEmits<{
  "update:viewMode": [value: PRDiscoveryViewMode];
}>();
const { t } = useI18n();

const viewOptions = computed<
  ReadonlyArray<{
    value: PRDiscoveryViewMode;
    label: string;
    testId: string;
  }>
>(() => [
  { value: "LIST", label: t("prDiscovery.viewMode.list"), testId: "prd.view.list" },
  { value: "CARD", label: t("prDiscovery.viewMode.card"), testId: "prd.view.card" },
  { value: "FORM", label: t("prDiscovery.viewMode.form"), testId: "prd.view.form" },
]);

const handleViewModeChange = (value: string | number) => {
  if (isPRDiscoveryViewMode(value)) emit("update:viewMode", value);
};
</script>

<style lang="scss" scoped>
.pr-discovery-surface {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.pr-discovery-surface__toolbar {
  max-width: 32rem;
}

.pr-discovery-surface__view-region {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
}
</style>
