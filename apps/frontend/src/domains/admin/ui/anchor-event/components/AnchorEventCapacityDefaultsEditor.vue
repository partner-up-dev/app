<template>
  <div class="anchor-event-capacity-defaults-editor">
    <PuFormItem
      :label="t('adminPR.eventDefaultMinPartnersLabel')"
      for-id="anchor-event-default-min-partners"
    >
      <PuInput
        id="anchor-event-default-min-partners"
        v-model="defaultMinPartnersText"
        native-type="number"
      />
    </PuFormItem>

    <PuFormItem
      :label="t('adminPR.eventDefaultMaxPartnersLabel')"
      for-id="anchor-event-default-max-partners"
    >
      <PuInput
        id="anchor-event-default-max-partners"
        v-model="defaultMaxPartnersText"
        native-type="number"
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
import { PuFormItem, PuInput } from "@partner-up-dev/design-web";

defineProps<{
  validationMessage: string | null;
}>();

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();

const nullableNumberText = (value: number | null): string =>
  value === null ? "" : String(value);

const parseNullableNumber = (value: string): number | null => {
  if (value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const defaultMinPartnersText = computed({
  get: () => nullableNumberText(form.value.defaultMinPartners),
  set: (value) => {
    form.value.defaultMinPartners = parseNullableNumber(value);
  },
});

const defaultMaxPartnersText = computed({
  get: () => nullableNumberText(form.value.defaultMaxPartners),
  set: (value) => {
    form.value.defaultMaxPartners = parseNullableNumber(value);
  },
});
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
