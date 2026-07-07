<template>
  <TimelinePolicyPicker
    v-model="policyValue"
    :title="t('adminAnchorEvents.participationDefaultsTitle')"
    :description="t('adminAnchorEvents.participationDefaultsDescription')"
    :event-start-at="previewStartAt"
    :validation-message="validationMessage"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import TimelinePolicyPicker from "@/shared/ui/forms/TimelinePolicyPicker.vue";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";

defineProps<{
  previewStartAt: string | null;
  validationMessage: string | null;
}>();

type TimelinePolicyValue = {
  confirmationEnabled: boolean;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
};

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();

const policyValue = computed<TimelinePolicyValue>({
  get: () => ({
    confirmationEnabled: form.value.defaultConfirmationEnabled,
    confirmationStartOffsetMinutes:
      form.value.defaultConfirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: form.value.defaultConfirmationEndOffsetMinutes,
    joinLockOffsetMinutes: form.value.defaultJoinLockOffsetMinutes,
  }),
  set: (value) => {
    form.value = {
      ...form.value,
      defaultConfirmationEnabled: value.confirmationEnabled,
      defaultConfirmationStartOffsetMinutes:
        value.confirmationStartOffsetMinutes,
      defaultConfirmationEndOffsetMinutes: value.confirmationEndOffsetMinutes,
      defaultJoinLockOffsetMinutes: value.joinLockOffsetMinutes,
    };
  },
});
</script>
