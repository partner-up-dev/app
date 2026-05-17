<template>
  <div
    class="create-card-shell"
    :class="{ 'create-card-shell--flash': autoExpandHighlightActive }"
  >
    <ExpandableCard
      :title="title ?? t('anchorEvent.createCard.title')"
      :subtitle="
        t('anchorEvent.createCard.subtitle', {
          eventTitle,
        })
      "
      :default-expanded="expandableDefaultExpanded"
      :expanded-reset-key="expandableCardResetKey"
      keep-content-mounted
    >
      <div class="create-card">
        <label v-if="timeWindowOptions.length > 0" class="create-card__field">
          <span class="create-card__label">{{
            t("anchorEvent.card.batchLabel")
          }}</span>
          <select
            :value="selectedTimeWindowKey ?? ''"
            class="create-card__input"
            @change="handleTimeWindowChange"
          >
            <option
              v-for="option in timeWindowOptions"
              :key="option.key"
              :value="option.key"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <AnchorEventInlinePlaceSelector
          v-model="selectedPlaceId"
          :options="placeOptions"
          :label="placeLabel"
          :placeholder="placePlaceholder"
        />

        <p v-if="errorMessage" class="create-card__error">{{ errorMessage }}</p>

        <Button
          type="button"
          appearance="pill"
          size="sm"
          data-testid="anchor-event.create-card.create"
          :disabled="pending"
          @click="emitCreate"
        >
          {{
            pending
              ? t("anchorEvent.createCard.creatingAction")
              : t("anchorEvent.createCard.createAction")
          }}
        </Button>
      </div>
    </ExpandableCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import ExpandableCard from "@/shared/ui/containers/ExpandableCard.vue";
import Button from "@/shared/ui/actions/Button.vue";
import AnchorEventInlinePlaceSelector from "@/domains/event/ui/controls/AnchorEventInlinePlaceSelector.vue";
import {
  findAnchorEventPlaceOption,
  getFirstEnabledPlaceOption,
  toAnchorEventSelectedPlace,
  type AnchorEventPlaceOption,
  type AnchorEventSelectedPlace,
} from "@/domains/event/model/place-options";
import { useExpandableCardAttention } from "./useExpandableCardAttention";

type TimeWindowOption = {
  key: string;
  label: string;
};

const props = withDefaults(
  defineProps<{
    title?: string;
    timeWindowLabel: string;
    eventTitle: string;
    timeWindowOptions?: TimeWindowOption[];
    selectedTimeWindowKey?: string | null;
    placeOptions: readonly AnchorEventPlaceOption[];
    placeLabel?: string;
    placePlaceholder?: string;
    pending?: boolean;
    errorMessage?: string | null;
    defaultExpanded?: boolean;
    autoExpandContextKey?: string | number | null;
  }>(),
  {
    title: undefined,
    timeWindowOptions: () => [],
    selectedTimeWindowKey: null,
    placeLabel: undefined,
    placePlaceholder: undefined,
    pending: false,
    errorMessage: null,
    defaultExpanded: false,
    autoExpandContextKey: null,
  },
);

const emit = defineEmits<{
  create: [place: AnchorEventSelectedPlace | null];
  "update:selectedTimeWindowKey": [value: string | null];
}>();

const { t } = useI18n();
const placeLabel = computed(
  () => props.placeLabel ?? t("anchorEvent.placeSelector.locationLabel"),
);
const placePlaceholder = computed(
  () =>
    props.placePlaceholder ?? t("anchorEvent.placeSelector.locationPlaceholder"),
);

const selectedPlaceId = ref<string | null>(null);
const {
  autoExpandHighlightActive,
  expandableCardResetKey,
  expandableDefaultExpanded,
} = useExpandableCardAttention({
  defaultExpanded: toRef(props, "defaultExpanded"),
  autoExpandContextKey: toRef(props, "autoExpandContextKey"),
});

const selectFirstAvailable = () => {
  selectedPlaceId.value = getFirstEnabledPlaceOption(props.placeOptions)?.id ?? null;
};

watch(
  () => props.placeOptions,
  () => {
    if (
      selectedPlaceId.value !== null &&
      props.placeOptions.some(
        (option) => option.id === selectedPlaceId.value && !option.disabled,
      )
    ) {
      return;
    }
    selectFirstAvailable();
  },
  { immediate: true, deep: true },
);

const handleTimeWindowChange = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) {
    return;
  }

  const normalized = target.value.trim();
  if (normalized.length === 0) {
    emit("update:selectedTimeWindowKey", null);
    return;
  }

  emit("update:selectedTimeWindowKey", normalized);
};

const emitCreate = () => {
  emit(
    "create",
    toAnchorEventSelectedPlace(
      findAnchorEventPlaceOption(props.placeOptions, selectedPlaceId.value),
    ),
  );
};
</script>

<style lang="scss" scoped>
.create-card-shell :deep(.expandable-card) {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.create-card-shell :deep(.expandable-card)::before {
  content: "";
  position: absolute;
  inset: 0;
  background: transparent;
  pointer-events: none;
  z-index: 0;
}

.create-card-shell :deep(.expandable-card__toggle),
.create-card-shell :deep(.expandable-card__content) {
  position: relative;
  z-index: 1;
}

.create-card-shell--flash :deep(.expandable-card)::before {
  animation: create-card-surface-flash 900ms ease-in-out 1;
}

.create-card {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.create-card__field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.create-card__label {
  @include mx.pu-font(label-small);
  color: var(--sys-color-on-surface-variant);
}

.create-card__input {
  width: 100%;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  min-height: var(--sys-size-large);
}

.create-card__hint {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.create-card__error {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-error);
}

@keyframes create-card-surface-flash {
  0% {
    background-color: transparent;
  }

  12% {
    background-color: var(--sys-color-primary-container);
  }

  24% {
    background-color: transparent;
  }

  42% {
    background-color: var(--sys-color-primary-container);
  }

  54%,
  100% {
    background-color: transparent;
  }
}
</style>
