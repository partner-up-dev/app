<template>
  <div class="anchor-event-details-editor">
    <label class="field">
      <span class="field-label">{{ t("adminPR.eventNameLabel") }}</span>
      <input v-model="form.title" class="field-input" />
    </label>

    <label class="field">
      <span class="field-label">{{ t("adminPR.eventTypeLabel") }}</span>
      <input v-model="form.type" class="field-input" />
    </label>

    <label class="field">
      <span class="field-label">{{ t("adminPR.eventDescriptionLabel") }}</span>
      <textarea v-model="form.description" class="field-input field-textarea" />
    </label>

    <label class="field">
      <span class="field-label">{{ t("adminPR.eventStatusLabel") }}</span>
      <select v-model="form.status" class="field-input">
        <option value="ACTIVE">{{ t("adminPR.statusActive") }}</option>
        <option value="PAUSED">{{ t("adminPR.statusPaused") }}</option>
        <option value="ARCHIVED">{{ t("adminPR.statusArchived") }}</option>
      </select>
    </label>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();
</script>

<style lang="scss" scoped>
.anchor-event-details-editor,
.field {
  display: flex;
  flex-direction: column;
}

.anchor-event-details-editor {
  gap: var(--sys-spacing-small);
}

.field {
  gap: var(--sys-spacing-xsmall);
}

.field-label {
  @include mx.pu-font(control);
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
</style>
