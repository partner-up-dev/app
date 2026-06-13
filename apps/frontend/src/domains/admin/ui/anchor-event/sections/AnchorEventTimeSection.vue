<template>
  <section
    id="anchor-event-time"
    class="anchor-event-time-section"
    data-testid="admin-anchor-event.section.time"
  >
    <BentoLayout>
      <BentoItem
        :title="t('adminAnchorEvents.timePoolStrategyTitle')"
        span="full"
      >
        <template #actions>
          <Button
            appearance="pill"
            tone="outline"
            size="sm"
            type="button"
            @click="previewOpen = true"
          >
            {{ t("adminAnchorEvents.previewTimeWindowsAction") }}
          </Button>
          <Button
            appearance="pill"
            size="sm"
            type="button"
            :disabled="saveDisabled"
            @click="$emit('save')"
          >
            {{ saveLabel }}
          </Button>
        </template>

        <AnchorEventTimePoolStrategyEditor
          v-model="form"
          :validation-message="timePoolValidationMessage"
        />
      </BentoItem>

      <BentoItem :title="t('adminAnchorEvents.participationDefaultsTitle')">
        <AnchorEventParticipationPolicyEditor
          v-model="form"
          :preview-start-at="previewStartAt"
          :validation-message="policyValidationMessage"
        />
      </BentoItem>

      <PuModal
        :open="previewOpen"
        :title="t('adminAnchorEvents.timeWindowsPreviewTitle')"
        max-width="720px"
        @close="previewOpen = false"
      >
        <AnchorEventTimeWindowPreviewList
          :duration-minutes="normalizedDurationMinutes"
          :earliest-lead-minutes="normalizedEarliestLeadMinutes"
          :recurring-rules="recurringStartRules"
        />

        <div class="modal-actions">
          <Button
            appearance="pill"
            tone="outline"
            size="sm"
            type="button"
            @click="previewOpen = false"
          >
            {{ t("common.close") }}
          </Button>
        </div>
      </PuModal>
    </BentoLayout>
  </section>
</template>

<script setup lang="ts">
import { PuModal } from "@partner-up-dev/design-web";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import Button from "@/shared/ui/actions/Button.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import BentoLayout from "@/domains/admin/ui/layout/BentoLayout.vue";
import AnchorEventParticipationPolicyEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventParticipationPolicyEditor.vue";
import AnchorEventTimePoolStrategyEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventTimePoolStrategyEditor.vue";
import AnchorEventTimeWindowPreviewList from "@/domains/admin/ui/anchor-event/components/AnchorEventTimeWindowPreviewList.vue";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";
import type { AnchorEventRecurringStartRulePreviewInput } from "@/domains/admin/model/anchorEventTimeWindowPreview";

defineProps<{
  saveLabel: string;
  saveDisabled: boolean;
  timePoolValidationMessage: string | null;
  policyValidationMessage: string | null;
  previewStartAt: string | null;
}>();

defineEmits<{
  save: [];
}>();

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();
const previewOpen = ref(false);

const normalizeNullableNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
};

const normalizeLines = (value: string): string[] =>
  value
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const splitRuleDescription = (
  value: string,
): { ruleText: string; description: string | null } => {
  const separatorIndex = value.indexOf("|");
  if (separatorIndex < 0) {
    return {
      ruleText: value.trim(),
      description: null,
    };
  }

  const ruleText = value.slice(0, separatorIndex).trim();
  const description = value.slice(separatorIndex + 1).trim();
  return {
    ruleText,
    description: description || null,
  };
};

const normalizedDurationMinutes = computed(() =>
  normalizeNullableNonNegativeInteger(form.value.durationMinutes),
);

const normalizedEarliestLeadMinutes = computed(() =>
  normalizeNullableNonNegativeInteger(form.value.earliestLeadMinutes),
);

const recurringStartRules = computed<
  AnchorEventRecurringStartRulePreviewInput[]
>(() =>
  normalizeLines(form.value.recurringRulesText)
    .map((line, index) => {
      const { ruleText, description } = splitRuleDescription(line);
      const [weekdaysRaw = "", timeOfDayRaw = ""] = ruleText.split(/\s+/, 2);
      const weekdays = weekdaysRaw
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
      const timeOfDay = timeOfDayRaw.trim();
      if (weekdays.length === 0 || !/^\d{2}:\d{2}$/.test(timeOfDay)) {
        return null;
      }
      return {
        id: `recurring-${index + 1}`,
        kind: "RECURRING" as const,
        weekdays,
        timeOfDay,
        description,
      };
    })
    .filter(
      (value): value is AnchorEventRecurringStartRulePreviewInput =>
        value !== null,
    ),
);
</script>

<style lang="scss" scoped>
.anchor-event-time-section {
  min-width: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--sys-spacing-large);
}
</style>
