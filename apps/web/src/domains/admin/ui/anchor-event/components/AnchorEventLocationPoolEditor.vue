<template>
  <div class="anchor-event-location-pool-editor">
    <label class="field">
      <span class="field-label">{{ t("adminPR.eventLocationPoolLabel") }}</span>
      <textarea
        v-model="form.locationPoolText"
        class="field-input field-textarea"
      />
    </label>

    <p class="hint">{{ t("adminPR.eventPoiHint") }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();
</script>

<style lang="scss" scoped>
.anchor-event-location-pool-editor,
.field {
  display: flex;
  flex-direction: column;
}

.anchor-event-location-pool-editor {
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
  min-height: 112px;
  resize: vertical;
}

.hint {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}
</style>
