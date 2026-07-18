<template>
  <PuForm :id="formId" class="status-form" @submit="submitForm">
    <PuCard
      v-for="status in statusOptions"
      :key="status.value"
      class="status-option"
      :active="selectedStatus === status.value"
      :disabled="disabled"
      @click="selectedStatus = status.value"
      selectable
      variant="outline"
      padding="sm"
      gap="xs"
    >
      {{ status.label }}
    </PuCard>
  </PuForm>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PRStatusManual } from "@partner-up-dev/backend/contracts";
import { PuCard, PuForm } from "@partner-up-dev/design-web";

type StatusOption = {
  value: PRStatusManual;
  label: string;
};

const props = withDefaults(
  defineProps<{
    formId?: string;
    initialStatus?: PRStatusManual;
    disabled?: boolean;
  }>(),
  {
    initialStatus: "OPEN",
    disabled: false,
  },
);

const emit = defineEmits<{
  submit: [status: PRStatusManual];
}>();

const { t } = useI18n();
const selectedStatus = ref<PRStatusManual>(props.initialStatus);
const statusOptions: StatusOption[] = [
  { value: "OPEN", label: t("status.open") },
  { value: "READY", label: t("status.ready") },
  { value: "ACTIVE", label: t("status.active") },
  { value: "CLOSED", label: t("status.closed") },
];

watch(
  () => props.initialStatus,
  (nextStatus) => {
    selectedStatus.value = nextStatus;
  },
);

const submitForm = () => {
  if (props.disabled) return;
  emit("submit", selectedStatus.value);
};

defineExpose({
  submitForm,
});
</script>

<style lang="scss" scoped>
.status-form {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  margin-bottom: var(--sys-spacing-medium);
}

.status-option {
  @include mx.pu-font(control);
  justify-content: center;
  min-width: 0;
}
</style>
