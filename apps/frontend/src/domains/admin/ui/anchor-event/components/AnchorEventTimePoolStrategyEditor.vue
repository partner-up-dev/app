<template>
  <div class="anchor-event-time-pool-strategy-editor">
    <div class="grid-2">
      <PuFormItem
        :label="t('adminPR.timePoolDurationLabel')"
        for-id="anchor-event-time-pool-duration"
      >
        <PuNumberInput
          id="anchor-event-time-pool-duration"
          v-model="form.durationMinutes"
          :min="1"
        />
      </PuFormItem>

      <PuFormItem
        :label="t('adminPR.timePoolEarliestLeadLabel')"
        for-id="anchor-event-time-pool-earliest-lead"
      >
        <PuNumberInput
          id="anchor-event-time-pool-earliest-lead"
          v-model="form.earliestLeadMinutes"
          :min="0"
        />
      </PuFormItem>
    </div>

    <PuFormItem
      :label="t('adminAnchorEvents.prTimeWindowEditorDefaultModeTitle')"
      :hint="t('adminAnchorEvents.prTimeWindowEditorDefaultModeHint')"
      for-id="anchor-event-pr-time-window-default-mode"
    >
      <PuSelect
        id="anchor-event-pr-time-window-default-mode"
        v-model="prTimeWindowEditorDefaultMode"
        :options="prTimeWindowEditorDefaultModeOptions"
      />
    </PuFormItem>

    <PuFormItem
      :label="t('adminPR.absoluteRulesLabel')"
      :hint="t('adminPR.absoluteRulesHint')"
      for-id="anchor-event-absolute-rules"
    >
      <PuTextarea
        id="anchor-event-absolute-rules"
        v-model="form.absoluteRulesText"
        rows="4"
      />
    </PuFormItem>

    <PuFormItem
      :label="t('adminPR.recurringRulesLabel')"
      :hint="t('adminPR.recurringRulesHint')"
      for-id="anchor-event-recurring-rules"
    >
      <PuTextarea
        id="anchor-event-recurring-rules"
        v-model="form.recurringRulesText"
        rows="4"
      />
    </PuFormItem>

    <p v-if="validationMessage" class="error-message">
      {{ validationMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";
import {
  PuFormItem,
  PuNumberInput,
  PuSelect,
  PuTextarea,
  type PuSelectOption,
  type PuSelectValue,
} from "@partner-up-dev/design-web";

defineProps<{
  validationMessage: string | null;
}>();

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();

const prTimeWindowEditorDefaultModeOptions = computed<PuSelectOption[]>(() => [
  {
    label: t("adminAnchorEvents.prTimeWindowEditorDefaultModeNormal"),
    value: "NORMAL",
  },
  {
    label: t("adminAnchorEvents.prTimeWindowEditorDefaultModeFuzzy"),
    value: "FUZZY",
  },
  {
    label: t("adminAnchorEvents.prTimeWindowEditorDefaultModeAdvanced"),
    value: "ADVANCED",
  },
]);

const isPrTimeWindowEditorDefaultMode = (
  value: PuSelectValue,
): value is AnchorEventEditorForm["prTimeWindowEditorDefaultMode"] =>
  value === "NORMAL" || value === "FUZZY" || value === "ADVANCED";

const prTimeWindowEditorDefaultMode = computed({
  get: () => form.value.prTimeWindowEditorDefaultMode,
  set: (value: PuSelectValue) => {
    if (isPrTimeWindowEditorDefaultMode(value)) {
      form.value.prTimeWindowEditorDefaultMode = value;
    }
  },
});
</script>

<style lang="scss" scoped>
.anchor-event-time-pool-strategy-editor {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.grid-2 {
  display: grid;
  gap: var(--sys-spacing-medium);
}

.error-message {
  margin: 0;
  @include mx.pu-font(body);
}

.error-message {
  color: var(--sys-color-error);
}

@media (min-width: 880px) {
  .grid-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
