<template>
  <BentoItem
    id="pr-type-config-coordination"
    :title="title"
    span="full"
    data-testid="admin-pr-type-config.slice.coordination"
  >
    <div class="grid-2">
      <JsonField
        :label="meetingPointLabel"
        :value="meetingPointText"
        :error="errors.meetingPoint"
        @update="updateJson('meetingPoint', $event)"
      />
      <JsonField
        :label="locationMeetingPointsLabel"
        :value="locationMeetingPointsText"
        :error="errors.locationMeetingPoints"
        @update="updateJson('locationMeetingPoints', $event)"
      />
    </div>
    <div v-if="existing" class="actions actions--inline slice-actions">
      <PuButton
        :disabled="pending || hasErrors"
        data-testid="admin-pr-type-config.slice.coordination.save"
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
  type AdminPRTypeConfigCoordination,
  type JsonDraftKey,
  parseJsonDraft,
} from "@/domains/admin/model/pr-type-config-editor";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import JsonField from "./PRTypeConfigJsonField.vue";

const props = defineProps<{
  title: string;
  meetingPointLabel: string;
  locationMeetingPointsLabel: string;
  savingLabel: string;
  saveLabel: string;
  coordination: AdminPRTypeConfigCoordination;
  existing: boolean;
  pending: boolean;
  error?: string;
}>();
const emit = defineEmits<{
  "update:coordination": [value: AdminPRTypeConfigCoordination];
  "validation-change": [invalid: boolean];
  save: [];
}>();
const meetingPointText = ref(JSON.stringify(props.coordination.meetingPoint, null, 2));
const locationMeetingPointsText = ref(
  JSON.stringify(props.coordination.locationMeetingPoints, null, 2),
);
const errors = ref<Partial<Record<JsonDraftKey, string>>>({});
const hasErrors = computed(() => Object.keys(errors.value).length > 0);
watch(
  () => props.coordination,
  (value) => {
    meetingPointText.value = JSON.stringify(value.meetingPoint, null, 2);
    locationMeetingPointsText.value = JSON.stringify(value.locationMeetingPoints, null, 2);
  },
  { deep: true },
);
const updateJson = (key: "meetingPoint" | "locationMeetingPoints", value: string) => {
  if (key === "meetingPoint") meetingPointText.value = value;
  else locationMeetingPointsText.value = value;
  const parsed = parseJsonDraft(value);
  if (parsed.error) {
    errors.value[key] = parsed.error;
    emit("validation-change", true);
    return;
  }
  delete errors.value[key];
  emit("validation-change", hasErrors.value);
  emit("update:coordination", { ...props.coordination, [key]: parsed.value });
};
</script>
