<template>
  <form class="pr-post-ready-editor" data-testid="pr-editor.form" @submit.prevent="submitForm">
    <EmptyState
      v-if="!hasEditableFields"
      icon="i-mdi-lock-outline"
      title="当前没有可编辑内容"
      description="这个 PR 在当前状态下没有开放可调整的字段。"
    />

    <template v-else>
      <DateTimeRangePicker
        v-if="canEditTime"
        v-model="timeModel"
        label="时间"
        :hint="timeHint"
      />

      <PRPlaceModeField
        v-if="canEditPlace"
        v-model="placeValue"
        label="地点"
        aria-label="编辑 PR 地点"
        location-label="地点"
        location-placeholder="填写地点"
        test-id-prefix="pr-editor.place"
      />
    </template>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { PartnerRequestFormInput } from "@/lib/validation";
import DateTimeRangePicker from "@/domains/pr/ui/forms/DateTimeRangePicker.vue";
import PRPlaceModeField, {
  type PRPlaceModeFieldValue,
} from "@/domains/pr/ui/forms/PRPlaceModeField.vue";
import type { PRDetailView, PRFormFields } from "@/domains/pr/model/types";
import { clonePRFields } from "@/domains/pr/model/form";
import EmptyState from "@/shared/ui/feedback/EmptyState.vue";
import { formatLocalDateTimeWindowLabel } from "@/shared/datetime/formatLocalDateTime";

const props = defineProps<{
  initialFields: PRFormFields;
  editCapability: PRDetailView["editCapability"];
}>();

const emit = defineEmits<{
  submit: [payload: PartnerRequestFormInput];
}>();

const fields = ref<PRFormFields>(clonePRFields(props.initialFields));

watch(
  () => props.initialFields,
  (nextFields) => {
    fields.value = clonePRFields(nextFields);
  },
  { deep: true },
);

const editableFields = computed(() => props.editCapability.editableFields);
const canEditTime = computed(() => editableFields.value.includes("time"));
const canEditPlace = computed(
  () =>
    editableFields.value.includes("location") ||
    editableFields.value.includes("route"),
);
const hasEditableFields = computed(
  () => canEditTime.value || canEditPlace.value,
);

const timeModel = computed({
  get: () => fields.value.time,
  set: (value: PRFormFields["time"]) => {
    fields.value = { ...fields.value, time: value };
  },
});

const placeValue = computed<PRPlaceModeFieldValue>({
  get: () => ({
    location: fields.value.location ?? null,
    route: fields.value.route ?? null,
  }),
  set: (value) => {
    fields.value = {
      ...fields.value,
      location: value.location,
      route: value.route,
    };
  },
});

const timeHint = computed(() => {
  const range = props.editCapability.constraints.timeWindow;
  if (!range) return "修改后会通知当前成员。";
  return `可调整范围：${formatLocalDateTimeWindowLabel(range)}`;
});

const canSubmit = computed(() => hasEditableFields.value);

const submitForm = () => {
  if (!canSubmit.value) return;
  emit("submit", {
    fields: clonePRFields(fields.value),
  });
};

defineExpose({
  submitForm,
  canSubmit,
});
</script>

<style scoped lang="scss">
.pr-post-ready-editor {
  display: grid;
  gap: var(--sys-spacing-medium);
}
</style>
