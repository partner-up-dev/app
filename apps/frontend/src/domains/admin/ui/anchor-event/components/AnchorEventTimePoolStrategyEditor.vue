<template>
  <div class="anchor-event-time-pool-strategy-editor">
    <div class="grid-2">
      <label class="field">
        <span class="field-label">{{ t("adminPR.timePoolDurationLabel") }}</span>
        <input
          v-model.number="form.durationMinutes"
          class="field-input"
          type="number"
          min="1"
        />
      </label>
      <label class="field">
        <span class="field-label">
          {{ t("adminPR.timePoolEarliestLeadLabel") }}
        </span>
        <input
          v-model.number="form.earliestLeadMinutes"
          class="field-input"
          type="number"
          min="0"
        />
      </label>
    </div>

    <label class="field">
      <span class="field-label">
        {{ t("adminAnchorEvents.prTimeWindowEditorDefaultModeTitle") }}
      </span>
      <select
        v-model="form.prTimeWindowEditorDefaultMode"
        class="field-input"
      >
        <option value="NORMAL">
          {{ t("adminAnchorEvents.prTimeWindowEditorDefaultModeNormal") }}
        </option>
        <option value="FUZZY">
          {{ t("adminAnchorEvents.prTimeWindowEditorDefaultModeFuzzy") }}
        </option>
        <option value="ADVANCED">
          {{ t("adminAnchorEvents.prTimeWindowEditorDefaultModeAdvanced") }}
        </option>
      </select>
    </label>
    <p class="hint">
      {{ t("adminAnchorEvents.prTimeWindowEditorDefaultModeHint") }}
    </p>

    <label class="field">
      <span class="field-label">{{ t("adminPR.absoluteRulesLabel") }}</span>
      <textarea v-model="form.absoluteRulesText" class="field-input field-textarea" />
    </label>
    <p class="hint">{{ t("adminPR.absoluteRulesHint") }}</p>

    <label class="field">
      <span class="field-label">{{ t("adminPR.recurringRulesLabel") }}</span>
      <textarea
        v-model="form.recurringRulesText"
        class="field-input field-textarea"
      />
    </label>
    <p class="hint">{{ t("adminPR.recurringRulesHint") }}</p>

    <p v-if="validationMessage" class="error-message">
      {{ validationMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";

defineProps<{
  validationMessage: string | null;
}>();

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();
</script>

<style lang="scss" scoped>
.anchor-event-time-pool-strategy-editor,
.field {
  display: flex;
  flex-direction: column;
}

.anchor-event-time-pool-strategy-editor {
  gap: var(--sys-spacing-small);
}

.grid-2 {
  display: grid;
  gap: var(--sys-spacing-medium);
}

.field {
  gap: var(--sys-spacing-xsmall);
}

.field-label {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
}

.field-input {
  width: 100%;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.field-textarea {
  min-height: 96px;
  resize: vertical;
}

.hint,
.error-message {
  margin: 0;
  @include mx.pu-font(body-medium);
}

.hint {
  color: var(--sys-color-on-surface-variant);
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
