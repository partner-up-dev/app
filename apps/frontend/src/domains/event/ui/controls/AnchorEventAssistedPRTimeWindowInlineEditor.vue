<template>
  <section
    class="time-window-inline-editor"
    data-testid="anchor-event-assisted-pr-time-window-inline-editor"
  >
    <p
      v-if="detailQuery.isLoading.value"
      class="time-window-inline-editor__hint"
    >
      {{ t("common.loading") }}
    </p>
    <p
      v-else-if="detailQuery.isError.value"
      class="time-window-inline-editor__message"
    >
      {{ t("anchorEvent.loadFailed") }}
    </p>

    <PRTimeWindowEditor
      v-else
      :model-value="modelValue"
      :allow-edit-after-ready="allowEditAfterReady"
      :preset-options="presetOptions"
      :duration-minutes="detail?.durationMinutes ?? null"
      :earliest-lead-minutes="detail?.earliestLeadMinutes ?? null"
      :default-mode="detail?.prTimeWindowEditorDefaultMode ?? 'NORMAL'"
      :label="t('anchorEvent.createCard.timeWindowLabel')"
      :date-picker-aria-label="t('anchorEvent.formMode.dateWheelAriaLabel')"
      :time-picker-aria-label="t('anchorEvent.formMode.timeWheelAriaLabel')"
      :empty-label="t('anchorEvent.formMode.timePlaceholder')"
      test-id-prefix="anchor-event-assisted-pr.time-window"
      @update:model-value="emit('update:modelValue', $event)"
      @update:allow-edit-after-ready="
        emit('update:allowEditAfterReady', $event)
      "
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { PRAllowEditAfterReady } from "@partner-up-dev/backend";
import PRTimeWindowEditor from "@/domains/event/ui/controls/PRTimeWindowEditor.vue";
import { useAnchorEventDetail } from "@/domains/event/queries/useAnchorEventDetail";
import {
  hasTimeWindowStarted,
  type TimeWindow,
} from "@/domains/event/model/time-window-view";
import type { PRTimeWindowPresetOption } from "@/domains/event/model/pr-time-window-editor";

const props = defineProps<{
  anchorEventId: number;
  modelValue: TimeWindow | null;
  allowEditAfterReady?: PRAllowEditAfterReady | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: TimeWindow | null];
  "update:allowEditAfterReady": [value: PRAllowEditAfterReady | null];
}>();

const { t } = useI18n();
const eventId = computed<number | null>(() => props.anchorEventId);
const detailQuery = useAnchorEventDetail(eventId);
const detail = computed(() => detailQuery.data.value ?? null);

const presetOptions = computed<PRTimeWindowPresetOption[]>(() =>
  [...(detail.value?.createTimeWindows ?? [])]
    .flatMap((entry) => {
      const [startAt, endAt] = entry.timeWindow;
      if (
        typeof startAt !== "string" ||
        typeof endAt !== "string" ||
        hasTimeWindowStarted(entry.timeWindow)
      ) {
        return [];
      }
      return [
        {
          key: entry.key,
          startAt,
          endAt,
          description: entry.description ?? null,
        },
      ];
    })
    .sort((left, right) =>
      left.startAt.localeCompare(right.startAt),
    ),
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
  @include mx.pu-font(body-small);
}

.time-window-inline-editor__message {
  color: var(--sys-color-error);
}

.time-window-inline-editor__hint {
  color: var(--sys-color-on-surface-variant);
}
</style>
