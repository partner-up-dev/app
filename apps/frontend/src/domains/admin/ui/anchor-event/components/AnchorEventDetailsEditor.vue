<template>
  <div class="anchor-event-details-editor">
    <PuFormItem
      :label="t('adminPR.eventNameLabel')"
      for-id="anchor-event-title"
    >
      <PuInput id="anchor-event-title" v-model="form.title" />
    </PuFormItem>

    <PuFormItem
      :label="t('adminPR.eventTypeLabel')"
      for-id="anchor-event-type"
    >
      <PuInput id="anchor-event-type" v-model="form.type" />
    </PuFormItem>

    <PuFormItem
      :label="t('adminPR.eventDescriptionLabel')"
      for-id="anchor-event-description"
    >
      <PuTextarea id="anchor-event-description" v-model="form.description" />
    </PuFormItem>

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
import { PuFormItem, PuInput, PuTextarea } from "@partner-up-dev/design-web";

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();
</script>

<style lang="scss" scoped>
.anchor-event-details-editor {
  display: flex;
  flex-direction: column;
}

.anchor-event-details-editor {
  gap: var(--sys-spacing-small);
}

.field {
  display: flex;
  flex-direction: column;
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

</style>
