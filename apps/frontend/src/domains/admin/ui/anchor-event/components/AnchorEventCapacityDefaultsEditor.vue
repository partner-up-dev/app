<template>
  <div class="anchor-event-capacity-defaults-editor">
    <label class="field">
      <span class="field-label">
        {{ t("adminPR.eventDefaultMinPartnersLabel") }}
      </span>
      <input
        v-model.number="form.defaultMinPartners"
        class="field-input"
        type="number"
        min="1"
      />
    </label>

    <label class="field">
      <span class="field-label">
        {{ t("adminPR.eventDefaultMaxPartnersLabel") }}
      </span>
      <input
        v-model.number="form.defaultMaxPartners"
        class="field-input"
        type="number"
        min="2"
      />
    </label>

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
.anchor-event-capacity-defaults-editor {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

.error-message {
  grid-column: 1 / -1;
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-error);
}

@media (max-width: 720px) {
  .anchor-event-capacity-defaults-editor {
    grid-template-columns: 1fr;
  }
}
</style>
