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

      <div class="field">
        <span class="field-label">{{ t("adminPois.galleryHint") }}</span>
        <div class="manual-url-row">
          <ImageUrlInput
            v-model="manualGalleryUrl"
            v-model:uploading="isUploadingGalleryImage"
            input-id="admin-poi-gallery-image-url"
            purpose="poi"
            :placeholder="t('adminPois.manualUrlPlaceholder')"
            :upload-label="t('adminPois.uploadImageAction')"
            :uploading-label="t('adminPois.uploadingImage')"
            :preview-alt="
              t('adminPois.imageAlt', {
                index: selectedPoiGallery.length + 1,
                poiId: selectedPoiId ?? '',
              })
            "
            :disabled="selectedPoiId === null"
            @uploaded="emit('gallery-uploaded', $event)"
          />
          <PuButton
            shape="pill"
            tone="neutral" variant="outline"
            size="sm"

            :disabled="selectedPoiId === null"
            @click="emit('add-manual-url')"
          >
            {{ t("adminPois.addUrlAction") }}
          </PuButton>
        </div>
      </div>

      <p v-if="selectedPoiGallery.length === 0" class="hint">
        {{ t("adminPois.emptyGallery") }}
      </p>
      <div v-else class="gallery-grid">
        <article
          v-for="(imageUrl, index) in selectedPoiGallery"
          :key="`${selectedPoiId ?? 'poi'}-gallery-${index}`"
          class="gallery-item"
        >
          <img
            :src="imageUrl"
            :alt="t('adminPois.imageAlt', { index: index + 1, poiId: selectedPoiId ?? '' })"
            class="gallery-image"
          />
          <p class="gallery-url">{{ imageUrl }}</p>
          <div class="gallery-actions">
            <PuButton
              shape="pill"
              tone="neutral" variant="outline"
              size="sm"

              @click="copyGalleryUrl(imageUrl)"
            >
              {{ t("adminPois.copyUrlAction") }}
            </PuButton>
            <PuButton
              shape="pill"
              tone="danger" variant="outline"
              size="sm"

              @click="emit('remove-gallery-image', index)"
            >
              {{ t("adminPois.removeImageAction") }}
            </PuButton>
          </div>
        </article>
      </div>
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
          <label class="field">
            <span class="field-label">{{ t("adminPois.ruleModeLabel") }}</span>
            <select
              v-model="rule.mode"
              class="field-input"
              @change="emit('mark-dirty')"
            >
              <option value="INCLUDE">{{ t("adminPois.ruleModeInclude") }}</option>
              <option value="EXCLUDE">{{ t("adminPois.ruleModeExclude") }}</option>
            </select>
          </label>

          <label class="field">
            <span class="field-label">{{ t("adminPois.ruleKindLabel") }}</span>
            <select
              v-model="rule.kind"
              class="field-input"
              @change="emit('mark-dirty')"
            >
              <option value="ABSOLUTE">{{ t("adminPois.ruleKindAbsolute") }}</option>
              <option value="RECURRING">{{ t("adminPois.ruleKindRecurring") }}</option>
            </select>
          </label>

          <template v-if="rule.kind === 'ABSOLUTE'">
            <label class="field">
              <span class="field-label">{{ t("adminPois.ruleStartAtLabel") }}</span>
              <input
                v-model="rule.startAtLocal"
                class="field-input"
                type="datetime-local"
                @input="emit('mark-dirty')"
              />
            </label>

            <label class="field">
              <span class="field-label">{{ t("adminPois.ruleEndAtLabel") }}</span>
              <input
                v-model="rule.endAtLocal"
                class="field-input"
                type="datetime-local"
                @input="emit('mark-dirty')"
              />
            </label>
          </template>

          <template v-else>
            <label class="field">
              <span class="field-label">{{ t("adminPois.ruleFrequencyLabel") }}</span>
              <select
                v-model="rule.frequency"
                class="field-input"
                @change="emit('mark-dirty')"
              >
                <option value="DAILY">{{ t("adminPois.frequencyDaily") }}</option>
                <option value="WEEKLY">{{ t("adminPois.frequencyWeekly") }}</option>
                <option value="MONTHLY">{{ t("adminPois.frequencyMonthly") }}</option>
                <option value="YEARLY">{{ t("adminPois.frequencyYearly") }}</option>
              </select>
            </label>

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

        <label class="field">
          <span class="field-label">{{
            t("adminPois.meetingPointImageUrlLabel")
          }}</span>
          <input
            v-model="selectedPoiMeetingPointImageUrl"
            class="field-input"
            :disabled="selectedPoiId === null"
          />
        </label>
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
import ImageUrlInput from "@/shared/upload/ImageUrlInput.vue";
import { PuButton } from "@partner-up-dev/design-web";

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
  "add-manual-url": [];
  "gallery-uploaded": [url: string];
  "remove-gallery-image": [index: number];
  "pick-location": [location: PickedLocation];
  "clear-coordinates": [];
  "add-availability-rule": [];
  "remove-availability-rule": [index: number];
  "mark-dirty": [];
  "save-poi": [];
}>();

const manualGalleryUrl = defineModel<string>("manualGalleryUrl", {
  required: true,
});
const isUploadingGalleryImage = defineModel<boolean>("isUploadingGalleryImage", {
  required: true,
});
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

const copyGalleryUrl = (imageUrl: string): void => {
  void navigator.clipboard?.writeText(imageUrl);
};

const handleLocationPicked = (location: PickedLocation) => {
  emit("pick-location", location);
  isLocationPickerOpen.value = false;
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

.manual-url-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sys-spacing-small);
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

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--sys-spacing-small);
}

.gallery-item {
  display: grid;
  grid-template-columns: 6.5rem minmax(0, 1fr);
  gap: var(--sys-spacing-xsmall);
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface);
}

.gallery-image {
  width: 100%;
  height: 6.5rem;
  object-fit: cover;
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container);
  grid-row: span 2;
}

.gallery-url {
  @include mx.pu-font(support);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-actions {
  display: flex;
  gap: var(--sys-spacing-xsmall);
  flex-wrap: wrap;
}

@media (max-width: 720px) {
  .grid,
  .manual-url-row,
  .coordinate-field__header {
    grid-template-columns: 1fr;
  }

  .coordinate-field__header {
    display: grid;
  }

  .coordinate-field__actions {
    justify-content: flex-start;
  }

  .gallery-grid {
    grid-template-columns: 1fr;
  }
}
</style>
