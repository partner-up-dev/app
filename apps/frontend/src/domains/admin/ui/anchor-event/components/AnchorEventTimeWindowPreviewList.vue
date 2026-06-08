<template>
  <div class="anchor-event-time-window-preview-list">
    <div v-if="recurringRules.length === 0" class="hint">
      {{ t("adminAnchorEvents.emptyRecurringRulesPreview") }}
    </div>
    <div v-else-if="timeWindows.length === 0" class="hint">
      {{ t("adminPR.emptyTimeWindows") }}
    </div>
    <div v-else class="anchor-event-time-window-preview-list__items">
      <ChoiceCard
        v-for="timeWindow in timeWindows"
        :key="timeWindow.key"
        class="anchor-event-time-window-preview-list__item"
      >
        <span>{{ formatWindow(timeWindow.timeWindow) }}</span>
        <small v-if="timeWindow.description">{{ timeWindow.description }}</small>
      </ChoiceCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";
import { formatLocalDateTimeWindowLabel } from "@/shared/datetime/formatLocalDateTime";
import {
  listRecurringAnchorEventTimeWindowPreview,
  type AnchorEventRecurringStartRulePreviewInput,
} from "@/domains/admin/model/anchorEventTimeWindowPreview";

const props = defineProps<{
  durationMinutes: number | null;
  earliestLeadMinutes: number | null;
  recurringRules: AnchorEventRecurringStartRulePreviewInput[];
  now?: Date;
}>();

const { t } = useI18n();

const timeWindows = computed(() =>
  listRecurringAnchorEventTimeWindowPreview({
    durationMinutes: props.durationMinutes,
    earliestLeadMinutes: props.earliestLeadMinutes,
    recurringRules: props.recurringRules,
    now: props.now,
  }),
);

const formatWindow = (windowValue: [string | null, string | null]) =>
  formatLocalDateTimeWindowLabel(windowValue, {}, "?");
</script>

<style lang="scss" scoped>
.anchor-event-time-window-preview-list,
.anchor-event-time-window-preview-list__items {
  display: flex;
  flex-direction: column;
}

.anchor-event-time-window-preview-list,
.anchor-event-time-window-preview-list__items {
  gap: var(--sys-spacing-medium);
}

.hint {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}
</style>
