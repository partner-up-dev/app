<template>
  <BentoItem
    id="pr-type-config-participation"
    :title="title"
    span="full"
    data-testid="admin-pr-type-config.slice.participation"
  >
    <div class="grid-2">
      <label class="field">
        <span class="field-label">{{ confirmationEnabledLabel }}</span>
        <input
          :checked="participation.defaultConfirmationEnabled"
          type="checkbox"
          @change="update({ defaultConfirmationEnabled: ($event.target as HTMLInputElement).checked })"
        />
      </label>
      <label class="field">
        <span class="field-label">{{ expansionPolicyLabel }}</span>
        <select
          :value="participation.fullCapacityExpansionPolicy"
          class="field-input"
          @change="update({ fullCapacityExpansionPolicy: inputValue($event) as AdminPRTypeConfigParticipation['fullCapacityExpansionPolicy'] })"
        >
          <option value="DISABLED">DISABLED</option>
          <option value="ENABLED">ENABLED</option>
        </select>
      </label>
      <NumberField
        :label="startOffsetLabel"
        :value="participation.defaultConfirmationStartOffsetMinutes"
        :min="0"
        @update="updateNumber('defaultConfirmationStartOffsetMinutes', $event)"
      />
      <NumberField
        :label="endOffsetLabel"
        :value="participation.defaultConfirmationEndOffsetMinutes"
        :min="0"
        @update="updateNumber('defaultConfirmationEndOffsetMinutes', $event)"
      />
      <NumberField
        :label="joinLockLabel"
        :value="participation.defaultJoinLockOffsetMinutes"
        :min="0"
        @update="updateNumber('defaultJoinLockOffsetMinutes', $event)"
      />
      <JsonField
        :label="joinGateLabel"
        :value="jsonText"
        :error="jsonError"
        @update="updateJson"
      />
    </div>
    <p v-if="hasNumberErrors" class="error-text">
      {{ Object.values(numberErrors).join("；") }}
    </p>
    <div v-if="existing" class="actions actions--inline slice-actions">
      <PuButton
        :disabled="pending || hasNumberErrors || Boolean(jsonError)"
        data-testid="admin-pr-type-config.slice.participation.save"
        @click="$emit('save')"
      >
        {{ pending ? savingLabel : saveLabel }}
      </PuButton>
      <PuInlineNotice v-if="error" tone="error" :message="error" />
    </div>
  </BentoItem>
</template>

<script setup lang="ts">
import { PuButton, PuInlineNotice } from "@partner-up-dev/design-web";
import { computed, ref, watch } from "vue";
import {
  normalizeRequiredNumber,
  parseJsonDraft,
} from "@/domains/admin/model/pr-type-config-editor";
import type { AdminPRTypeConfigParticipation } from "@/domains/admin/queries/useAdminPRTypeConfigs";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import JsonField from "./PRTypeConfigJsonField.vue";
import NumberField from "./PRTypeConfigNumberField.vue";

const props = defineProps<{
  title: string;
  confirmationEnabledLabel: string;
  expansionPolicyLabel: string;
  startOffsetLabel: string;
  endOffsetLabel: string;
  joinLockLabel: string;
  joinGateLabel: string;
  savingLabel: string;
  saveLabel: string;
  participation: AdminPRTypeConfigParticipation;
  existing: boolean;
  pending: boolean;
  error?: string;
}>();
const emit = defineEmits<{
  "update:participation": [value: AdminPRTypeConfigParticipation];
  "validation-change": [invalid: boolean];
  save: [];
}>();
const jsonText = ref(JSON.stringify(props.participation.joinGateConfig, null, 2));
const jsonError = ref("");
const numberErrors = ref<Record<string, string>>({});
const hasNumberErrors = computed(() => Object.keys(numberErrors.value).length > 0);
watch(
  () => props.participation.joinGateConfig,
  (value) => {
    jsonText.value = JSON.stringify(value, null, 2);
  },
  { deep: true },
);
const inputValue = (event: Event) => (event.target as HTMLInputElement).value;
const update = (patch: Partial<AdminPRTypeConfigParticipation>) =>
  emit("update:participation", { ...props.participation, ...patch });
const updateNumber = (
  key:
    | "defaultConfirmationStartOffsetMinutes"
    | "defaultConfirmationEndOffsetMinutes"
    | "defaultJoinLockOffsetMinutes",
  value: string | number | null,
) => {
  const normalized = normalizeRequiredNumber(value);
  if (normalized === undefined || normalized < 0) {
    numberErrors.value[key] = "请输入有效的非负整数";
    emit("validation-change", true);
    return;
  }
  delete numberErrors.value[key];
  emit("validation-change", hasNumberErrors.value || Boolean(jsonError.value));
  update({ [key]: normalized });
};
const updateJson = (value: string) => {
  jsonText.value = value;
  const parsed = parseJsonDraft<AdminPRTypeConfigParticipation["joinGateConfig"]>(value);
  jsonError.value = parsed.error ?? "";
  emit("validation-change", Boolean(parsed.error) || hasNumberErrors.value);
  if (!parsed.error && parsed.value) update({ joinGateConfig: parsed.value });
};
</script>
