<template>
  <BentoLayout>
    <BentoItem
      id="poi-basic"
      :title="t('adminPois.editPoiTitle')"
      span="full"
      data-testid="admin-pois.section.basic"
    >
      <template #actions>
        <PuButton
          shape="pill"
          size="sm"

          :disabled="selectedPoiId === null || isSavingPoi"
          @click="emit('save-poi')"
        >
          {{
            isSavingPoi ? t("adminPois.savingPoi") : t("adminPois.savePoiAction")
          }}
        </PuButton>
      </template>

      <p class="current-poi-meta">
        {{ currentPoiMeta }}
      </p>

      <div class="grid">
        <label class="field field--full">
          <span class="field-label">{{ t("adminPois.fullAddressLabel") }}</span>
          <input
            v-model="selectedPoiFullAddress"
            class="field-input"
            :disabled="selectedPoiId === null"
            :placeholder="t('adminPois.fullAddressPlaceholder')"
          />
        </label>

        <div class="field field--full coordinate-field">
          <div class="coordinate-field__header">
            <span class="field-label">{{ t("adminPois.coordinateLabel") }}</span>
            <div class="coordinate-field__actions">
              <PuButton
                shape="pill"
                tone="neutral" variant="outline"
                size="sm"

                :disabled="selectedPoiId === null"
                data-testid="admin-pois.pick-coordinate"
                @click="isLocationPickerOpen = true"
              >
                <template #leading>
                  <span class="i-mdi-map-marker-radius" />
                </template>
                {{ t("adminPois.pickCoordinateAction") }}
              </PuButton>
              <PuButton
                v-if="selectedPoiHasCoordinate"
                shape="pill"
                tone="danger" variant="outline"
                size="sm"

                :disabled="selectedPoiId === null"
                data-testid="admin-pois.clear-coordinate"
                @click="emit('clear-coordinates')"
              >
                <template #leading>
                  <span class="i-mdi-map-marker-remove" />
                </template>
                {{ t("adminPois.clearCoordinateAction") }}
              </PuButton>
            </div>
          </div>
          <p class="coordinate-field__value">
            {{
              selectedPoiCoordinateText ||
              t("adminPois.coordinateEmpty")
            }}
          </p>
          <p class="hint">{{ t("adminPois.coordinateHint") }}</p>
        </div>
      </div>
    </BentoItem>

    <BentoItem :title="t('adminPois.galleryTitle')" span="full">
      <p class="hint">
        {{ t("adminPois.galleryCount", { count: selectedPoiGallery.length }) }}
      </p>

      <PuFilesUpload
        v-model="galleryUploadValue"
        mode="both"
        layout="panel"
        :accept="IMAGE_UPLOAD_ACCEPT"
        :disabled="selectedPoiId === null"
        :title="t('adminPois.galleryHint')"
        :description="t('adminPois.emptyGallery')"
        :choose-label="t('adminPois.uploadImageAction')"
        :drop-label="t('adminPois.uploadImageAction')"
        :drop-description="t('adminPois.galleryHint')"
        :url-placeholder="t('adminPois.manualUrlPlaceholder')"
        :url-add-label="t('adminPois.addUrlAction')"
        @add="handleGalleryUploadAdd"
        @remove="handleGalleryUploadRemove"
        @reject="handleGalleryUploadReject"
        @update:model-value="handleGalleryUploadUpdate"
      />
      <PuInlineNotice
        v-if="galleryUploadError"
        tone="error"
        :message="galleryUploadError"
      />
    </BentoItem>

    <BentoItem :title="t('adminPois.availabilityAndCapacityTitle')" span="full">
      <div class="grid">
        <label class="field">
          <span class="field-label">{{ t("adminPois.perTimeWindowCapLabel") }}</span>
          <input
            v-model="selectedPoiCapText"
            class="field-input"
            type="number"
            min="1"
            :disabled="selectedPoiId === null"
            :placeholder="t('adminPois.perTimeWindowCapPlaceholder')"
          />
        </label>
      </div>

      <div class="section-header">
        <PuButton
          shape="pill"
          tone="neutral" variant="outline"
          size="sm"

          :disabled="selectedPoiId === null"
          @click="emit('add-availability-rule')"
        >
          {{ t("adminPois.addAvailabilityRuleAction") }}
        </PuButton>
      </div>

      <p v-if="selectedPoiAvailabilityRules.length === 0" class="hint">
        {{ t("adminPois.emptyAvailabilityRules") }}
      </p>

      <article
        v-for="(rule, index) in selectedPoiAvailabilityRules"
        :key="rule.id"
        class="availability-rule"
      >
        <div class="action-row">
          <strong>
            {{ t("adminPois.availabilityRuleTitle", { index: index + 1 }) }}
          </strong>
          <PuButton
            tone="danger" variant="outline"
            size="sm"

            @click="emit('remove-availability-rule', index)"
          >
            {{ t("adminPois.removeRuleAction") }}
          </PuButton>
        </div>

        <div class="grid">
          <PuFormItem
            :label="t('adminPois.ruleModeLabel')"
            :for-id="`admin-pois-rule-${index}-mode`"
          >
            <PuSelect
              :id="`admin-pois-rule-${index}-mode`"
              :model-value="rule.mode"
              :options="ruleModeOptions"
              @update:model-value="updateRuleMode(rule, $event)"
            />
          </PuFormItem>

          <PuFormItem
            :label="t('adminPois.ruleKindLabel')"
            :for-id="`admin-pois-rule-${index}-kind`"
          >
            <PuSelect
              :id="`admin-pois-rule-${index}-kind`"
              :model-value="rule.kind"
              :options="ruleKindOptions"
              @update:model-value="updateRuleKind(rule, $event)"
            />
          </PuFormItem>

          <template v-if="rule.kind === 'ABSOLUTE'">
            <PuFormItem
              :label="t('adminPois.ruleStartAtLabel')"
              :for-id="`admin-pois-rule-${index}-start-at`"
            >
              <PuInput
                :id="`admin-pois-rule-${index}-start-at`"
                v-model="rule.startAtLocal"
                native-type="datetime-local"
                @update:model-value="emit('mark-dirty')"
              />
            </PuFormItem>

            <PuFormItem
              :label="t('adminPois.ruleEndAtLabel')"
              :for-id="`admin-pois-rule-${index}-end-at`"
            >
              <PuInput
                :id="`admin-pois-rule-${index}-end-at`"
                v-model="rule.endAtLocal"
                native-type="datetime-local"
                @update:model-value="emit('mark-dirty')"
              />
            </PuFormItem>
          </template>

          <template v-else>
            <PuFormItem
              :label="t('adminPois.ruleFrequencyLabel')"
              :for-id="`admin-pois-rule-${index}-frequency`"
            >
              <PuSelect
                :id="`admin-pois-rule-${index}-frequency`"
                :model-value="rule.frequency"
                :options="ruleFrequencyOptions"
                @update:model-value="updateRuleFrequency(rule, $event)"
              />
            </PuFormItem>

            <label class="field">
              <span class="field-label">{{ t("adminPois.ruleStartTimeLabel") }}</span>
              <input
                v-model="rule.startTime"
                class="field-input"
                type="time"
                @input="emit('mark-dirty')"
              />
            </label>

            <label class="field">
              <span class="field-label">{{ t("adminPois.ruleEndTimeLabel") }}</span>
              <input
                v-model="rule.endTime"
                class="field-input"
                type="time"
                @input="emit('mark-dirty')"
              />
            </label>

            <label v-if="rule.frequency === 'WEEKLY'" class="field field--full">
              <span class="field-label">{{ t("adminPois.ruleWeekdaysLabel") }}</span>
              <div class="weekday-grid">
                <label
                  v-for="weekday in weekdayOptions"
                  :key="weekday.value"
                  class="checkbox-field"
                >
                  <input
                    v-model="rule.weekdays"
                    type="checkbox"
                    :value="weekday.value"
                    @change="emit('mark-dirty')"
                  />
                  <span>{{ weekday.label }}</span>
                </label>
              </div>
            </label>

            <label
              v-if="rule.frequency === 'MONTHLY' || rule.frequency === 'YEARLY'"
              class="field"
            >
              <span class="field-label">{{ t("adminPois.ruleMonthDaysLabel") }}</span>
              <input
                v-model="rule.monthDaysText"
                class="field-input"
                :placeholder="t('adminPois.ruleNumberListPlaceholder')"
                @input="emit('mark-dirty')"
              />
            </label>

            <label v-if="rule.frequency === 'YEARLY'" class="field">
              <span class="field-label">{{ t("adminPois.ruleMonthsLabel") }}</span>
              <input
                v-model="rule.monthsText"
                class="field-input"
                :placeholder="t('adminPois.ruleNumberListPlaceholder')"
                @input="emit('mark-dirty')"
              />
            </label>
          </template>
        </div>
      </article>
    </BentoItem>

    <BentoItem :title="t('adminPois.meetingPointTitle')" span="full">
      <div class="grid">
        <label class="field field--full">
          <span class="field-label">{{
            t("adminPois.meetingPointDescriptionLabel")
          }}</span>
          <textarea
            v-model="selectedPoiMeetingPointDescription"
            class="field-input field-textarea"
            :disabled="selectedPoiId === null"
          ></textarea>
        </label>

        <PuFormItem
          :label="t('adminPois.meetingPointImageUrlLabel')"
          for-id="admin-pois-meeting-point-image-url"
        >
          <PuFileUpload
            id="admin-pois-meeting-point-image-url"
            v-model="meetingPointImageUploadValue"
            mode="url"
            layout="inline"
            :disabled="selectedPoiId === null"
            :url-placeholder="t('adminPois.manualUrlPlaceholder')"
            :url-add-label="t('adminPois.addUrlAction')"
            @add="handleMeetingPointImageAdd"
            @remove="handleMeetingPointImageRemove"
            @reject="handleMeetingPointImageReject"
            @update:model-value="handleMeetingPointImageUpdate"
          />
          <PuInlineNotice
            v-if="meetingPointImageError"
            tone="error"
            :message="meetingPointImageError"
          />
        </PuFormItem>
      </div>
    </BentoItem>
  </BentoLayout>

  <LocationPickerModal
    :open="isLocationPickerOpen"
    :title="t('adminPois.coordinatePickerTitle')"
    :initial-location="selectedPoiPickerLocation"
    @pick="handleLocationPicked"
    @close="isLocationPickerOpen = false"
  />
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { AdminPoisResponse } from "@/domains/admin/queries/useAdminPoiManagement";
import type { EditableAvailabilityRule } from "@/domains/admin/use-cases/poi/useAdminPoiEditor";
import type { PickedLocation } from "@/domains/location/model/location-picker";
import LocationPickerModal from "@/domains/location/ui/LocationPickerModal.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import BentoLayout from "@/domains/admin/ui/layout/BentoLayout.vue";
import {
  IMAGE_UPLOAD_ACCEPT,
  imageUploadItemFromUrl,
  useGalleryImageUploadField,
} from "@/shared/upload/useDesignWebImageUpload";
import {
  PuButton,
  PuFileUpload,
  PuFilesUpload,
  PuFormItem,
  PuInlineNotice,
  PuInput,
  PuSelect,
  type PuFileUploadItem,
  type PuFileUploadRejection,
  type PuFileUploadValue,
  type PuSelectOption,
  type PuSelectValue,
} from "@partner-up-dev/design-web";

type PoiRecord = NonNullable<AdminPoisResponse>[number];

const props = defineProps<{
  selectedPoiId: number | null;
  selectedPoi: PoiRecord | null;
  selectedPoiGallery: string[];
  selectedPoiCoordinateText: string;
  selectedPoiHasCoordinate: boolean;
  selectedPoiPickerLocation: PickedLocation | null;
  selectedPoiAvailabilityRules: EditableAvailabilityRule[];
  isSavingPoi: boolean;
  weekdayOptions: readonly {
    readonly value: number;
    readonly label: string;
  }[];
}>();

const emit = defineEmits<{
  "update-gallery": [gallery: string[]];
  "pick-location": [location: PickedLocation];
  "clear-coordinates": [];
  "add-availability-rule": [];
  "remove-availability-rule": [index: number];
  "mark-dirty": [];
  "save-poi": [];
}>();

const selectedPoiCapText = defineModel<string>("selectedPoiCapText", {
  required: true,
});
const selectedPoiFullAddress = defineModel<string>("selectedPoiFullAddress", {
  required: true,
});
const selectedPoiMeetingPointDescription = defineModel<string>(
  "selectedPoiMeetingPointDescription",
  { required: true },
);
const selectedPoiMeetingPointImageUrl = defineModel<string>(
  "selectedPoiMeetingPointImageUrl",
  { required: true },
);

const { t } = useI18n();
const isLocationPickerOpen = ref(false);
const meetingPointImageError = ref<string | null>(null);

const {
  uploadValue: galleryUploadValue,
  errorMessage: galleryUploadError,
  handleUpdate: handleGalleryUploadUpdate,
  handleAdd: handleGalleryUploadAdd,
  handleRemove: handleGalleryUploadRemove,
  handleReject: handleGalleryUploadReject,
} = useGalleryImageUploadField({
  getUrls: () => props.selectedPoiGallery,
  setUrls: (gallery) => {
    emit("update-gallery", gallery);
  },
  purpose: "poi",
  uploadingMessage: t("adminPois.uploadingImage"),
});

const ruleModeOptions = computed<PuSelectOption[]>(() => [
  { label: t("adminPois.ruleModeInclude"), value: "INCLUDE" },
  { label: t("adminPois.ruleModeExclude"), value: "EXCLUDE" },
]);

const ruleKindOptions = computed<PuSelectOption[]>(() => [
  { label: t("adminPois.ruleKindAbsolute"), value: "ABSOLUTE" },
  { label: t("adminPois.ruleKindRecurring"), value: "RECURRING" },
]);

const ruleFrequencyOptions = computed<PuSelectOption[]>(() => [
  { label: t("adminPois.frequencyDaily"), value: "DAILY" },
  { label: t("adminPois.frequencyWeekly"), value: "WEEKLY" },
  { label: t("adminPois.frequencyMonthly"), value: "MONTHLY" },
  { label: t("adminPois.frequencyYearly"), value: "YEARLY" },
]);

const isRuleMode = (
  value: PuSelectValue,
): value is EditableAvailabilityRule["mode"] =>
  value === "INCLUDE" || value === "EXCLUDE";

const isRuleKind = (
  value: PuSelectValue,
): value is EditableAvailabilityRule["kind"] =>
  value === "ABSOLUTE" || value === "RECURRING";

const isRuleFrequency = (
  value: PuSelectValue,
): value is EditableAvailabilityRule["frequency"] =>
  value === "DAILY" ||
  value === "WEEKLY" ||
  value === "MONTHLY" ||
  value === "YEARLY";

const updateRuleMode = (
  rule: EditableAvailabilityRule,
  value: PuSelectValue,
): void => {
  if (!isRuleMode(value)) return;
  rule.mode = value;
  emit("mark-dirty");
};

const updateRuleKind = (
  rule: EditableAvailabilityRule,
  value: PuSelectValue,
): void => {
  if (!isRuleKind(value)) return;
  rule.kind = value;
  emit("mark-dirty");
};

const updateRuleFrequency = (
  rule: EditableAvailabilityRule,
  value: PuSelectValue,
): void => {
  if (!isRuleFrequency(value)) return;
  rule.frequency = value;
  emit("mark-dirty");
};

const meetingPointImageUploadValue = computed<PuFileUploadValue>({
  get: () => {
    const imageUrl = selectedPoiMeetingPointImageUrl.value.trim();
    return imageUrl ? imageUploadItemFromUrl(imageUrl) : null;
  },
  set: (value) => {
    selectedPoiMeetingPointImageUrl.value =
      value?.source === "url" && value.url ? value.url : "";
  },
});

const statusLabel = (status: PoiRecord["status"]): string => {
  switch (status) {
    case "PENDING":
      return t("adminPois.statusPending");
    case "PUBLISHED":
      return t("adminPois.statusPublished");
    case "REJECTED":
      return t("adminPois.statusRejected");
  }
};

const currentPoiMeta = computed(() => {
  if (!props.selectedPoi) return t("adminPois.currentPoiFallback");

  return t("adminPois.currentPoiMeta", {
    id: props.selectedPoi.id,
    name: props.selectedPoi.name,
    status: statusLabel(props.selectedPoi.status),
  });
});

const handleLocationPicked = (location: PickedLocation) => {
  emit("pick-location", location);
  isLocationPickerOpen.value = false;
};

const handleMeetingPointImageUpdate = (
  value: PuFileUploadValue,
): void => {
  meetingPointImageUploadValue.value = value;
  meetingPointImageError.value = null;
};

const handleMeetingPointImageAdd = (item: PuFileUploadItem): void => {
  if (item.source === "url" && item.url) {
    selectedPoiMeetingPointImageUrl.value = item.url;
    meetingPointImageError.value = null;
  }
};

const handleMeetingPointImageRemove = (): void => {
  selectedPoiMeetingPointImageUrl.value = "";
  meetingPointImageError.value = null;
};

const handleMeetingPointImageReject = (
  rejections: PuFileUploadRejection[],
): void => {
  meetingPointImageError.value = rejections[0]?.message ?? null;
};
</script>

<style lang="scss" scoped>
.hint {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.current-poi-meta {
  @include mx.pu-font(body);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.section-header,
.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.field--full {
  grid-column: 1 / -1;
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

.field-textarea {
  min-height: 5rem;
  resize: vertical;
}

.availability-rule {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-small);
}

.weekday-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(5.5rem, 1fr));
  gap: var(--sys-spacing-xsmall);
}

.checkbox-field {
  @include mx.pu-font(support);
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
  min-height: 2.25rem;
  padding: 0 var(--sys-spacing-xsmall);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container);
}

.coordinate-field {
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
}

.coordinate-field__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.coordinate-field__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--sys-spacing-xsmall);
}

.coordinate-field__value {
  @include mx.pu-font(body);
  margin: var(--sys-spacing-xsmall) 0 0;
  color: var(--sys-color-on-surface);
  overflow-wrap: anywhere;
}

@media (max-width: 720px) {
  .grid,
  .coordinate-field__header {
    grid-template-columns: 1fr;
  }

  .coordinate-field__header {
    display: grid;
  }

  .coordinate-field__actions {
    justify-content: flex-start;
  }

}
</style>
