<template>
  <section class="location-picker-panel">
    <div v-if="pickerUrl" class="location-picker-panel__map">
      <iframe
        class="location-picker-panel__iframe"
        :src="pickerUrl"
        :title="t('locationPicker.iframeTitle')"
        data-testid="location-picker.iframe"
      ></iframe>
    </div>

    <div v-else class="location-picker-panel__unavailable" role="status">
      <span class="i-mdi-map-marker-alert" aria-hidden="true"></span>
      <p>{{ t("locationPicker.keyMissing") }}</p>
    </div>

    <div class="location-picker-panel__editor">
      <label class="location-picker-panel__field">
        <span>{{ t("locationPicker.nameLabel") }}</span>
        <TextInput
          :model-value="draftLocation?.name ?? ''"
          :placeholder="t('locationPicker.namePlaceholder')"
          :disabled="draftLocation === null"
          data-testid="location-picker.name"
          @update:model-value="updateDraftName"
        />
      </label>

      <label class="location-picker-panel__field">
        <span>{{ t("locationPicker.addressLabel") }}</span>
        <TextInput
          :model-value="draftLocation?.address ?? ''"
          :placeholder="t('locationPicker.addressPlaceholder')"
          :disabled="draftLocation === null"
          data-testid="location-picker.address"
          @update:model-value="updateDraftAddress"
        />
      </label>

      <div class="location-picker-panel__coordinate">
        <span>{{ t("locationPicker.coordinateLabel") }}</span>
        <strong>{{ coordinateText }}</strong>
      </div>
    </div>

    <footer class="location-picker-panel__actions">
      <Button
        type="button"
        tone="outline"
        size="sm"
        data-testid="location-picker.cancel"
        @click="emit('cancel')"
      >
        {{ t("common.cancel") }}
      </Button>
      <Button
        type="button"
        size="sm"
        :disabled="draftLocation === null"
        data-testid="location-picker.confirm"
        @click="confirmPick"
      >
        {{ t("common.confirm") }}
      </Button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Button from "@/shared/ui/actions/Button.vue";
import TextInput from "@/shared/ui/forms/TextInput.vue";
import type { RouteCoordinate } from "@/domains/route/model/route";
import {
  buildTencentLocationPickerUrl,
  clonePickedLocation,
  mapTencentLocationPickerPayload,
  type PickedLocation,
} from "@/domains/location/model/location-picker";

const props = withDefaults(
  defineProps<{
    initialLocation?: PickedLocation | null;
    apiKey?: string;
    referer?: string;
  }>(),
  {
    initialLocation: null,
    apiKey: undefined,
    referer: undefined,
  },
);

const emit = defineEmits<{
  pick: [location: PickedLocation];
  cancel: [];
}>();

const { t } = useI18n();

const draftLocation = ref<PickedLocation | null>(
  clonePickedLocation(props.initialLocation),
);

const normalizedApiKey = computed(() => {
  const explicit = props.apiKey?.trim() ?? "";
  if (explicit.length > 0) {
    return explicit;
  }
  return import.meta.env.VITE_TENCENT_LBS_JS_KEY?.trim() ?? "";
});

const normalizedReferer = computed(() => {
  const explicit = props.referer?.trim() ?? "";
  if (explicit.length > 0) {
    return explicit;
  }
  return import.meta.env.VITE_TENCENT_LBS_REFERER?.trim() || "partner-up";
});

const initialCoordinate = computed<RouteCoordinate | null>(
  () => props.initialLocation?.gcj02 ?? null,
);

const pickerUrl = computed(() => {
  if (normalizedApiKey.value.length === 0) {
    return null;
  }

  return buildTencentLocationPickerUrl({
    key: normalizedApiKey.value,
    referer: normalizedReferer.value,
    initialCoordinate: initialCoordinate.value,
  });
});

const coordinateText = computed(() => {
  if (!draftLocation.value) {
    return t("locationPicker.coordinateEmpty");
  }
  const [lat, lng] = draftLocation.value.gcj02;
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
});

watch(
  () => props.initialLocation,
  (location) => {
    draftLocation.value = clonePickedLocation(location);
  },
);

const updateDraftName = (value: string) => {
  if (!draftLocation.value) {
    return;
  }
  draftLocation.value = {
    ...draftLocation.value,
    name: value,
  };
};

const updateDraftAddress = (value: string) => {
  if (!draftLocation.value) {
    return;
  }
  const normalized = value.trim();
  draftLocation.value = {
    ...draftLocation.value,
    address: normalized.length > 0 ? value : null,
  };
};

const handlePickerMessage = (event: MessageEvent<unknown>) => {
  const location = mapTencentLocationPickerPayload(event.data);
  if (!location) {
    return;
  }

  draftLocation.value = location;
};

const confirmPick = () => {
  const location = clonePickedLocation(draftLocation.value);
  if (!location) {
    return;
  }

  emit("pick", location);
};

onMounted(() => {
  window.addEventListener("message", handlePickerMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handlePickerMessage);
});
</script>

<style scoped lang="scss">
.location-picker-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.location-picker-panel__map,
.location-picker-panel__unavailable {
  min-height: 360px;
  overflow: hidden;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
}

.location-picker-panel__iframe {
  display: block;
  width: 100%;
  height: 360px;
  border: 0;
}

.location-picker-panel__unavailable {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-medium);
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}

.location-picker-panel__unavailable span {
  @include mx.pu-icon(large);
}

.location-picker-panel__unavailable p {
  @include mx.pu-font(body-medium);
  margin: 0;
}

.location-picker-panel__editor {
  display: grid;
  gap: var(--sys-spacing-small);
}

.location-picker-panel__field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: calc(var(--sys-spacing-xsmall) / 2);
}

.location-picker-panel__field span,
.location-picker-panel__coordinate span {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
}

.location-picker-panel__coordinate {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  min-width: 0;
  padding: var(--sys-spacing-small) 0;
}

.location-picker-panel__coordinate strong {
  @include mx.pu-font(body-medium);
  min-width: 0;
  color: var(--sys-color-on-surface);
  text-align: right;
  overflow-wrap: anywhere;
}

.location-picker-panel__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sys-spacing-small);
}
</style>
