<template>
  <section class="time-window-inline-editor" data-testid="pr-discovery-time-window-inline-editor">
    <p v-if="detailQuery.isLoading.value" class="time-window-inline-editor__hint">
      {{ t("common.loading") }}
    </p>
    <p v-else-if="detailQuery.isError.value" class="time-window-inline-editor__message">
      {{ t("prDiscovery.loadFailed") }}
    </p>

    <PRDiscoveryTimeWindowEditor
      v-else
      :model-value="modelValue"
      :allow-edit-after-ready="allowEditAfterReady"
      :preset-options="presetOptions"
      :duration-minutes="detail?.durationMinutes ?? null"
      :earliest-lead-minutes="detail?.earliestLeadMinutes ?? null"
      :default-mode="detail?.timeWindowEditorDefaultMode ?? 'NORMAL'"
      label="时间"
      date-picker-aria-label="选择日期"
      time-picker-aria-label="选择时间"
      empty-label="暂无可选时间"
      test-id-prefix="pr-discovery-assisted-pr.time-window"
      @update:model-value="emit('update:modelValue', $event)"
      @update:allow-edit-after-ready="emit('update:allowEditAfterReady', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import type { PRAllowEditAfterReady } from "@partner-up-dev/backend/contracts";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { PRTimeWindowPresetOption } from "@/domains/pr/model/pr-discovery-time-window";
import {
  hasPRDiscoveryTimeWindowStarted,
  type TimeWindow,
} from "@/domains/pr/model/pr-discovery-time-window";
import { usePRAuthoringOptions } from "@/domains/pr/queries/usePRAuthoringOptions";
import PRDiscoveryTimeWindowEditor from "@/domains/pr/ui/discovery/card/PRDiscoveryTimeWindowEditor.vue";

const props = defineProps<{
  type: string;
  modelValue: TimeWindow | null;
  allowEditAfterReady?: PRAllowEditAfterReady | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: TimeWindow | null];
  "update:allowEditAfterReady": [value: PRAllowEditAfterReady | null];
}>();

const { t } = useI18n();
const type = computed<string | null>(() => props.type || null);
const detailQuery = usePRAuthoringOptions(type);
const detail = computed(() => detailQuery.data.value ?? null);

const presetOptions = computed<PRTimeWindowPresetOption[]>(() =>
  [...(detail.value?.startOptions ?? [])]
    .filter((entry) => !hasPRDiscoveryTimeWindowStarted([entry.startAt, entry.endAt]))
    .sort((left, right) => left.startAt.localeCompare(right.startAt)),
);
</script>

<style lang="scss" scoped>
.time-window-inline-editor {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.time-window-inline-editor__message,
.time-window-inline-editor__hint {
  margin: 0;
  @include mx.pu-font(support);
}

.time-window-inline-editor__message {
  color: var(--sys-color-error);
}

.time-window-inline-editor__hint {
  color: var(--sys-color-on-surface-variant);
}
</style>
