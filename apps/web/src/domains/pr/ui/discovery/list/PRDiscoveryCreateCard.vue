<template>
  <div class="create-card-shell" :class="{ 'create-card-shell--flash': autoExpandHighlightActive }">
    <PuCard
      as="section"
      class="create-card-panel"
      :title="cardTitle"
      :subtitle="t('prDiscovery.createCard.subtitle')"
      :toggle-label="cardTitle"
      :default-expanded="cardDefaultExpanded"
      :expanded-reset-key="cardResetKey"
      collapsible
      keep-content-mounted
      variant="outline"
    >
      <div class="create-card">
        <PRDiscoveryTimeWindowInlineEditor
          :type="type"
          :model-value="timeWindow"
          :allow-edit-after-ready="allowEditAfterReady"
          @update:model-value="emit('update:timeWindow', $event)"
          @update:allow-edit-after-ready="emit('update:allowEditAfterReady', $event)"
        />

        <PRDiscoveryInlinePlaceSelector
          v-model="selectedPlaceId"
          :options="placeOptions"
          :label="placeLabel"
          :placeholder="placePlaceholder"
        />

        <p v-if="errorMessage" class="create-card__error">{{ errorMessage }}</p>

        <PuButton
          shape="pill"
          size="sm"
          data-testid="pr-discovery.create-card.create"
          :disabled="isCreateDisabled"
          @click="emitCreate"
        >
          {{
            pending
              ? t("prDiscovery.createCard.creatingAction")
              : t("prDiscovery.createCard.createAction")
          }}
        </PuButton>
      </div>
    </PuCard>
  </div>
</template>

<script setup lang="ts">
import type { PRAllowEditAfterReady } from "@partner-up-dev/backend/contracts";
import { PuButton, PuCard } from "@partner-up-dev/design-web";
import { computed, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  findPRDiscoveryPlaceOptionById,
  getFirstEnabledPRDiscoveryPlaceOption,
  type PRDiscoveryPlaceOption,
  type PRDiscoveryPlaceSelection,
  toPRDiscoverySelectedPlace,
} from "@/domains/pr/model/pr-discovery-place-options";
import type { TimeWindow } from "@/domains/pr/model/pr-discovery-time-window";
import PRDiscoveryInlinePlaceSelector from "@/domains/pr/ui/discovery/card/PRDiscoveryInlinePlaceSelector.vue";
import PRDiscoveryTimeWindowInlineEditor from "@/domains/pr/ui/discovery/card/PRDiscoveryTimeWindowInlineEditor.vue";
import { usePuCardAttention } from "@/domains/pr/ui/discovery/card/usePuCardAttention";

const props = withDefaults(
  defineProps<{
    title?: string;
    type: string;
    typeTitle: string;
    timeWindow: TimeWindow | null;
    allowEditAfterReady?: PRAllowEditAfterReady | null;
    placeOptions: readonly PRDiscoveryPlaceOption[];
    initialPlaceId?: string | null;
    placeLabel?: string;
    placePlaceholder?: string;
    pending?: boolean;
    disabled?: boolean;
    errorMessage?: string | null;
    defaultExpanded?: boolean;
    autoExpandContextKey?: string | number | null;
  }>(),
  {
    title: undefined,
    allowEditAfterReady: null,
    placeLabel: undefined,
    placePlaceholder: undefined,
    initialPlaceId: null,
    pending: false,
    disabled: false,
    errorMessage: null,
    defaultExpanded: false,
    autoExpandContextKey: null,
  },
);

const emit = defineEmits<{
  create: [place: PRDiscoveryPlaceSelection | null];
  "update:timeWindow": [value: TimeWindow | null];
  "update:allowEditAfterReady": [value: PRAllowEditAfterReady | null];
}>();

const { t } = useI18n();
const cardTitle = computed(() => props.title ?? t("prDiscovery.createCard.title"));
const placeLabel = computed(() => props.placeLabel ?? t("prDiscovery.createCard.placeLabel"));
const placePlaceholder = computed(
  () => props.placePlaceholder ?? t("prDiscovery.createCard.placePlaceholder"),
);

const selectedPlaceId = ref<string | null>(null);
const isCreateDisabled = computed(
  () => props.pending || props.disabled || selectedPlaceId.value === null,
);
const { autoExpandHighlightActive, cardDefaultExpanded, cardResetKey } = usePuCardAttention({
  defaultExpanded: toRef(props, "defaultExpanded"),
  autoExpandContextKey: toRef(props, "autoExpandContextKey"),
});

const selectFirstAvailable = () => {
  const preferred = props.placeOptions.find(
    (option) => option.id === props.initialPlaceId && !option.disabled,
  );
  selectedPlaceId.value =
    preferred?.id ?? getFirstEnabledPRDiscoveryPlaceOption(props.placeOptions)?.id ?? null;
};

watch(
  () => [props.placeOptions, props.initialPlaceId] as const,
  () => {
    if (
      selectedPlaceId.value !== null &&
      props.placeOptions.some((option) => option.id === selectedPlaceId.value && !option.disabled)
    ) {
      return;
    }
    selectFirstAvailable();
  },
  { immediate: true, deep: true },
);

const emitCreate = () => {
  if (isCreateDisabled.value) {
    return;
  }

  emit(
    "create",
    toPRDiscoverySelectedPlace(
      findPRDiscoveryPlaceOptionById(props.placeOptions, selectedPlaceId.value),
    ),
  );
};
</script>

<style lang="scss" scoped>
.create-card-shell :deep(.create-card-panel) {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.create-card-shell :deep(.create-card-panel)::before {
  content: "";
  position: absolute;
  inset: 0;
  background: transparent;
  pointer-events: none;
  z-index: 0;
}

.create-card-shell :deep(.create-card-panel > .pu-card__header),
.create-card-shell :deep(.create-card-panel > .pu-card__body) {
  position: relative;
  z-index: 1;
}

.create-card-shell--flash :deep(.create-card-panel)::before {
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
  @include mx.pu-font(caption);
  color: var(--sys-color-on-surface-variant);
}

.create-card__input {
  width: 100%;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  min-height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
}

.create-card__hint {
  margin: 0;
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}

.create-card__error {
  margin: 0;
  @include mx.pu-font(support);
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
