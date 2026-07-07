<template>
  <div class="anchor-event-location-meeting-points-editor">
    <p class="hint">{{ t("adminPR.eventLocationMeetingPointsHint") }}</p>

    <p v-if="locations.length === 0" class="hint">
      {{ t("adminPR.eventLocationMeetingPointsEmpty") }}
    </p>

    <article
      v-for="location in locations"
      :key="location"
      class="location-meeting-point-row"
    >
      <strong class="location-meeting-point-title">{{ location }}</strong>
      <div class="grid-2">
        <label class="field">
          <span class="field-label">
            {{ t("adminPR.eventLocationMeetingPointDescriptionLabel") }}
          </span>
          <textarea
            class="field-input field-textarea"
            :value="getLocationMeetingPointDescription(location)"
            @input="updateLocationMeetingPointDescription(location, $event)"
          />
        </label>

        <label class="field">
          <span class="field-label">
            {{ t("adminPR.eventLocationMeetingPointImageUrlLabel") }}
          </span>
          <input
            class="field-input"
            :value="getLocationMeetingPointImageUrl(location)"
            @input="updateLocationMeetingPointImageUrl(location, $event)"
          />
        </label>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type {
  AnchorEventEditorForm,
  EditableMeetingPointForm,
} from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();

const normalizeLines = (value: string): string[] =>
  value
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const locations = computed(() => normalizeLines(form.value.locationPoolText));

const getLocationMeetingPointDescription = (location: string): string =>
  form.value.locationMeetingPoints[location]?.description ?? "";

const getLocationMeetingPointImageUrl = (location: string): string =>
  form.value.locationMeetingPoints[location]?.imageUrl ?? "";

const readInputEventValue = (event: Event): string => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
  return target?.value ?? "";
};

const updateLocationMeetingPoint = (
  location: string,
  patch: Partial<EditableMeetingPointForm>,
): void => {
  const current = form.value.locationMeetingPoints[location] ?? {
    description: "",
    imageUrl: "",
  };
  const next = {
    ...current,
    ...patch,
  };
  const nextMap = { ...form.value.locationMeetingPoints };
  if (!next.description.trim() && !next.imageUrl.trim()) {
    delete nextMap[location];
  } else {
    nextMap[location] = next;
  }

  form.value = {
    ...form.value,
    locationMeetingPoints: nextMap,
  };
};

const updateLocationMeetingPointDescription = (
  location: string,
  event: Event,
): void => {
  updateLocationMeetingPoint(location, {
    description: readInputEventValue(event),
  });
};

const updateLocationMeetingPointImageUrl = (
  location: string,
  event: Event,
): void => {
  updateLocationMeetingPoint(location, {
    imageUrl: readInputEventValue(event),
  });
};
</script>

<style lang="scss" scoped>
.anchor-event-location-meeting-points-editor,
.location-meeting-point-row,
.field {
  display: flex;
  flex-direction: column;
}

.anchor-event-location-meeting-points-editor,
.location-meeting-point-row {
  gap: var(--sys-spacing-small);
}

.location-meeting-point-row {
  padding-block: var(--sys-spacing-small);
  border-top: 1px solid var(--sys-color-outline-variant);
}

.location-meeting-point-title {
  @include mx.pu-font(control);
}

.grid-2 {
  display: grid;
  gap: var(--sys-spacing-medium);
}

.field {
  gap: var(--sys-spacing-xsmall);
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
  min-height: 96px;
  resize: vertical;
}

.hint {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

@media (min-width: 880px) {
  .grid-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
