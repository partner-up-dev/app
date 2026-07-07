<template>
  <div class="anchor-event-capacity-defaults-editor">
    <PuFormItem
      :label="t('adminPR.eventDefaultMinPartnersLabel')"
      for-id="anchor-event-default-min-partners"
    >
      <PuNumberInput
        id="anchor-event-default-min-partners"
        v-model="form.defaultMinPartners"
      />
    </PuFormItem>

    <PuFormItem
      :label="t('adminPR.eventDefaultMaxPartnersLabel')"
      for-id="anchor-event-default-max-partners"
    >
      <PuNumberInput
        id="anchor-event-default-max-partners"
        v-model="form.defaultMaxPartners"
      />
    </PuFormItem>

    <p v-if="validationMessage" class="error-message">
      {{ validationMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";
import { PuFormItem, PuNumberInput } from "@partner-up-dev/design-web";

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
