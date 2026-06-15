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

    <PuFormItem
      :label="t('adminPR.eventStatusLabel')"
      for-id="anchor-event-status"
    >
      <PuSelect
        id="anchor-event-status"
        v-model="statusModel"
        :options="statusOptions"
      />
    </PuFormItem>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";
import {
  PuFormItem,
  PuInput,
  PuSelect,
  PuTextarea,
  type PuSelectOption,
  type PuSelectValue,
} from "@partner-up-dev/design-web";

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();

const statusOptions = computed<PuSelectOption[]>(() => [
  { label: t("adminPR.statusActive"), value: "ACTIVE" },
  { label: t("adminPR.statusPaused"), value: "PAUSED" },
  { label: t("adminPR.statusArchived"), value: "ARCHIVED" },
]);

const isAnchorEventStatus = (
  value: PuSelectValue,
): value is AnchorEventEditorForm["status"] =>
  value === "ACTIVE" || value === "PAUSED" || value === "ARCHIVED";

const statusModel = computed({
  get: () => form.value.status,
  set: (value: PuSelectValue) => {
    if (isAnchorEventStatus(value)) {
      form.value.status = value;
    }
  },
});
</script>

<style lang="scss" scoped>
.anchor-event-details-editor {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}
</style>
