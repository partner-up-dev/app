<template>
  <BentoItem
    id="pr-type-config-authoring"
    :title="title"
    span="full"
    data-testid="admin-pr-type-config.slice.authoring"
  >
    <div class="grid-2">
      <label class="field">
        <span class="field-label">{{ typeLabel }}</span>
        <input :value="type" class="field-input" disabled />
      </label>
      <label class="field">
        <span class="field-label">{{ creationPolicyLabel }}</span>
        <select
          :value="authoring.authoringCreationPolicy"
          class="field-input"
          @change="
            update({
              authoringCreationPolicy: ($event.target as HTMLSelectElement)
                .value as AdminPRTypeConfigAuthoring['authoringCreationPolicy'],
            })
          "
        >
          <option value="USER_AND_ADMIN">USER_AND_ADMIN</option>
          <option value="ADMIN_ONLY">ADMIN_ONLY</option>
        </select>
      </label>
      <NumberField
        :label="defaultMinLabel"
        :value="authoring.defaultMinPartners"
        :min="1"
        @update="updateNumber('defaultMinPartners', $event)"
      />
      <NumberField
        :label="defaultMaxLabel"
        :value="authoring.defaultMaxPartners"
        :min="2"
        @update="updateNumber('defaultMaxPartners', $event)"
      />
      <label class="field field--full">
        <span class="field-label">{{ locationPoolLabel }}</span>
        <textarea
          :value="authoring.locationPool.join('\n')"
          class="field-input field-textarea"
          @input="updateLocationPool"
        />
      </label>
      <JsonField
        :label="routePoolLabel"
        :value="jsonDrafts.routePool"
        :error="jsonErrors.routePool"
        @update="updateJson('routePool', $event)"
      />
      <JsonField
        :label="timePoolLabel"
        :value="jsonDrafts.timePoolConfig"
        :error="jsonErrors.timePoolConfig"
        @update="updateJson('timePoolConfig', $event)"
      />
      <label class="field field--full">
        <span class="field-label">{{ notesLabel }}</span>
        <textarea
          :value="authoring.defaultNotes ?? ''"
          class="field-input field-textarea"
          @input="update({ defaultNotes: ($event.target as HTMLTextAreaElement).value || null })"
        />
      </label>
    </div>
    <p v-if="hasNumberErrors" class="error-text">{{ Object.values(numberErrors).join("；") }}</p>
    <div v-if="existing" class="actions actions--inline slice-actions">
      <PuButton
        :disabled="pending || hasJsonErrors || hasNumberErrors"
        data-testid="admin-pr-type-config.slice.authoring.save"
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
  applyJsonDraft,
  createEmptyPRTypeConfigDraft,
  createJsonDrafts,
  type JsonDraftKey,
  type JsonDrafts,
  type JsonErrors,
  normalizeNullableNumber,
} from "@/domains/admin/model/pr-type-config-editor";
import type { AdminPRTypeConfigAuthoring } from "@/domains/admin/queries/useAdminPRTypeConfigs";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import JsonField from "./PRTypeConfigJsonField.vue";
import NumberField from "./PRTypeConfigNumberField.vue";

const props = defineProps<{
  type: string;
  title: string;
  typeLabel: string;
  creationPolicyLabel: string;
  defaultMinLabel: string;
  defaultMaxLabel: string;
  locationPoolLabel: string;
  routePoolLabel: string;
  timePoolLabel: string;
  notesLabel: string;
  savingLabel: string;
  saveLabel: string;
  authoring: AdminPRTypeConfigAuthoring;
  existing: boolean;
  pending: boolean;
  error?: string;
}>();
const emit = defineEmits<{
  "update:authoring": [value: AdminPRTypeConfigAuthoring];
  "validation-change": [invalid: boolean];
  save: [];
}>();

const createDraft = () => ({
  ...createEmptyPRTypeConfigDraft(props.type),
  authoring: props.authoring,
});
const jsonDrafts = ref<JsonDrafts>(createJsonDrafts(createDraft()));
const jsonErrors = ref<JsonErrors>({});
type PartnerBoundKey = "defaultMinPartners" | "defaultMaxPartners";
const invalidNumberInputs = ref<Partial<Record<PartnerBoundKey, string>>>({});
const partnerBounds = ref<Record<PartnerBoundKey, number | null>>({
  defaultMinPartners: props.authoring.defaultMinPartners,
  defaultMaxPartners: props.authoring.defaultMaxPartners,
});
const hasJsonErrors = computed(() => Object.keys(jsonErrors.value).length > 0);
const numberErrors = computed<Record<string, string>>(() => {
  const errors: Record<string, string> = { ...invalidNumberInputs.value };
  const min = partnerBounds.value.defaultMinPartners;
  const max = partnerBounds.value.defaultMaxPartners;
  if (!("defaultMinPartners" in invalidNumberInputs.value) && min !== null && min < 1)
    errors.defaultMinPartners = "最少搭子人数至少为 1";
  if (!("defaultMaxPartners" in invalidNumberInputs.value) && max !== null && max < 2)
    errors.defaultMaxPartners = "最多搭子人数至少为 2";
  if (
    !("defaultMinPartners" in invalidNumberInputs.value) &&
    !("defaultMaxPartners" in invalidNumberInputs.value) &&
    min !== null &&
    max !== null &&
    max < min
  )
    errors.defaultMaxPartners = "最多搭子人数必须大于等于最少搭子人数";
  return errors;
});
const hasNumberErrors = computed(() => Object.keys(numberErrors.value).length > 0);

watch(
  () => props.authoring,
  (value) => {
    jsonDrafts.value.routePool = JSON.stringify(value.routePool, null, 2);
    jsonDrafts.value.timePoolConfig = JSON.stringify(value.timePoolConfig, null, 2);
    partnerBounds.value = {
      defaultMinPartners: value.defaultMinPartners,
      defaultMaxPartners: value.defaultMaxPartners,
    };
  },
  { deep: true },
);
watch(
  [hasJsonErrors, hasNumberErrors],
  ([jsonInvalid, numberInvalid]) => emit("validation-change", jsonInvalid || numberInvalid),
  { immediate: true },
);

const update = (patch: Partial<AdminPRTypeConfigAuthoring>) =>
  emit("update:authoring", { ...props.authoring, ...patch });
const updateNumber = (key: PartnerBoundKey, value: string | number | null) => {
  const normalized = normalizeNullableNumber(value);
  if (normalized === undefined) {
    invalidNumberInputs.value = { ...invalidNumberInputs.value, [key]: "请输入有效整数" };
    return;
  }
  const nextInputErrors = { ...invalidNumberInputs.value };
  delete nextInputErrors[key];
  invalidNumberInputs.value = nextInputErrors;
  partnerBounds.value = { ...partnerBounds.value, [key]: normalized };
  update({ [key]: normalized });
};
const updateLocationPool = (event: Event) => {
  const value = (event.target as HTMLTextAreaElement).value;
  update({
    locationPool: value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
  });
};
const updateJson = (key: JsonDraftKey, text: string) => {
  const next = applyJsonDraft(createDraft(), jsonDrafts.value, jsonErrors.value, key, text);
  emit("update:authoring", next.authoring);
};
</script>
