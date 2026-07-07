<template>
  <section class="pr-place-mode-field">
    <div class="pr-place-mode-field__mode">
      <span class="pr-place-mode-field__label">{{ label }}</span>
      <PuSegmented
        :model-value="placeMode"
        :aria-label="ariaLabel"
        :data-testid="`${testIdPrefix}.mode`"
        full-width
        equal-width
        @update:model-value="handlePlaceModeChange"
      >
        <PuSegmentedItem
          v-for="option in placeModeOptions"
          :key="String(option.value)"
          :value="option.value"
          :label="option.label"
          :disabled="option.disabled"
          :data-testid="option.testId"
        >
          <template v-if="option.icon" #leading>
            <span :class="option.icon" aria-hidden="true" />
          </template>
        </PuSegmentedItem>
      </PuSegmented>
    </div>

    <label v-if="placeMode === 'location'" class="pr-place-mode-field__field">
      <span>{{ locationLabel }}</span>
      <input
        :value="locationInput"
        type="text"
        :list="locationOptionsListId"
        :data-testid="`${testIdPrefix}.location`"
        :placeholder="locationPlaceholder"
        @input="handleLocationInput"
      />
      <span v-if="locationError" class="pr-place-mode-field__error">
        {{ locationError }}
      </span>
    </label>

    <div v-else class="pr-place-mode-field__route">
      <RouteEditor
        :model-value="routeDraft"
        :variant="routeVariant"
        @update:model-value="handleRouteChange"
      />
      <span v-if="routeError" class="pr-place-mode-field__error">
        {{ routeError }}
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { PRRoute } from "@partner-up-dev/backend";
import {
  PuSegmented,
  PuSegmentedItem,
  type PuSegmentedValue,
} from "@partner-up-dev/design-web";
import type { Route } from "@/domains/route/model/route";
import RouteEditor from "@/domains/route/ui/RouteEditor.vue";
import {
  clonePRRoute,
  createEmptyPRRouteDraft,
  fromPRRoute,
  resolvePRPlaceMode,
  toPRRoute,
  type PRPlaceMode,
} from "@/domains/pr/model/pr-route";

export type PRPlaceModeFieldValue = {
  location: string | null;
  route: PRRoute | null;
};
type SegmentedOption = {
  value: PuSegmentedValue;
  label: string;
  icon?: string;
  testId?: string;
  disabled?: boolean;
};

const props = withDefaults(
  defineProps<{
    modelValue: PRPlaceModeFieldValue;
    label: string;
    locationLabel: string;
    locationPlaceholder: string;
    ariaLabel?: string;
    locationOptionsListId?: string;
    locationError?: string;
    routeError?: string;
    routeVariant?: "inline" | "immersive";
    testIdPrefix?: string;
  }>(),
  {
    ariaLabel: undefined,
    locationOptionsListId: undefined,
    locationError: undefined,
    routeError: undefined,
    routeVariant: "inline",
    testIdPrefix: "pr-place-mode",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: PRPlaceModeFieldValue];
}>();

const { t } = useI18n();

const placeMode = computed<PRPlaceMode>(() =>
  resolvePRPlaceMode(props.modelValue),
);

const placeModeOptions = computed<SegmentedOption[]>(() => [
  {
    value: "location",
    label: t("partnerRequestForm.placeModeLocation"),
    icon: "i-mdi-map-marker",
    testId: `${props.testIdPrefix}.mode.location`,
  },
  {
    value: "route",
    label: t("partnerRequestForm.placeModeRoute"),
    icon: "i-mdi-routes",
    testId: `${props.testIdPrefix}.mode.route`,
  },
]);

const locationInput = computed(() => props.modelValue.location ?? "");
const routeDraft = computed<Route | null>(() => fromPRRoute(props.modelValue.route));

const emitValue = (value: PRPlaceModeFieldValue) => {
  emit("update:modelValue", value);
};

const handlePlaceModeChange = (value: PuSegmentedValue) => {
  if (value !== "location" && value !== "route") {
    return;
  }

  if (value === "location") {
    emitValue({
      location: props.modelValue.location,
      route: null,
    });
    return;
  }

  emitValue({
    location: null,
    route: clonePRRoute(props.modelValue.route) ?? createEmptyPRRouteDraft(),
  });
};

const handleLocationInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  const normalized = value.trim();
  emitValue({
    location: normalized.length > 0 ? value : null,
    route: null,
  });
};

const handleRouteChange = (route: Route) => {
  emitValue({
    location: null,
    route: toPRRoute(route) ?? createEmptyPRRouteDraft(),
  });
};
</script>

<style scoped lang="scss">
.pr-place-mode-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.pr-place-mode-field__mode,
.pr-place-mode-field__field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.pr-place-mode-field__label,
.pr-place-mode-field__field span {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.pr-place-mode-field__field input {
  @include mx.pu-font(body);
  width: 100%;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-small);
  color: var(--sys-color-on-surface);
  background: var(--sys-color-surface-container);

  &::placeholder {
    color: var(--sys-color-on-surface-variant);
    opacity: 0.6;
  }

  &:focus {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: -1px;
  }
}

.pr-place-mode-field__route {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.pr-place-mode-field__error {
  @include mx.pu-font(control);
  color: var(--sys-color-error);
}
</style>
