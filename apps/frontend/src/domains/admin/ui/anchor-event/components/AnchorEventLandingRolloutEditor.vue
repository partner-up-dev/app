<template>
  <div class="anchor-event-landing-rollout-editor">
    <p class="hint">{{ t("adminAnchorEvents.landingRolloutDescription") }}</p>

    <div v-if="!hasEditableEvent" class="hint">
      {{ t("adminAnchorEvents.selectEventForLandingConfigHint") }}
    </div>

    <LoadingIndicator
      v-else-if="landingConfigQuery.isLoading.value"
      :message="t('common.loading')"
    />

    <p v-else-if="landingConfigQuery.error.value" class="error-message">
      {{ landingConfigQuery.error.value.message }}
    </p>

    <template v-else>
      <div class="grid-3">
        <label class="field">
          <span class="field-label">
            {{ t("adminAnchorEvents.formRatioLabel") }}
          </span>
          <input
            v-model.number="form.formRatio"
            class="field-input"
            type="number"
            min="0"
          />
        </label>
        <label class="field">
          <span class="field-label">
            {{ t("adminAnchorEvents.cardRichRatioLabel") }}
          </span>
          <input
            v-model.number="form.cardRichRatio"
            class="field-input"
            type="number"
            min="0"
          />
        </label>
        <label class="field">
          <span class="field-label">
            {{ t("adminAnchorEvents.listRatioLabel") }}
          </span>
          <input
            v-model.number="form.listRatio"
            class="field-input"
            type="number"
            min="0"
          />
        </label>
      </div>

      <label class="field">
        <span class="field-label">
          {{ t("adminAnchorEvents.assignmentRevisionLabel") }}
        </span>
        <input
          v-model.number="form.assignmentRevision"
          class="field-input"
          type="number"
          min="1"
        />
      </label>

      <p class="hint">{{ t("adminAnchorEvents.landingFallbackHint") }}</p>

      <p v-if="validationMessage" class="error-message">
        {{ validationMessage }}
      </p>

      <p v-if="replaceLandingConfigMutation.error.value" class="error-message">
        {{ replaceLandingConfigMutation.error.value.message }}
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import {
  useAdminAnchorEventLandingConfig,
  useReplaceAdminAnchorEventLandingConfig,
} from "@/domains/admin/queries/useAdminAnchorEventLandingConfig";

type LandingConfigForm = {
  formRatio: number;
  cardRichRatio: number;
  listRatio: number;
  assignmentRevision: number;
};

const props = withDefaults(
  defineProps<{
    eventId: number | null;
    enabled?: boolean;
  }>(),
  {
    enabled: true,
  },
);

const { t } = useI18n();

const form = ref<LandingConfigForm>({
  formRatio: 50,
  cardRichRatio: 50,
  listRatio: 0,
  assignmentRevision: 1,
});

const currentEventId = computed(() => props.eventId);
const hasEditableEvent = computed(
  () => props.eventId !== null && props.enabled,
);
const landingConfigQuery = useAdminAnchorEventLandingConfig(
  currentEventId,
  hasEditableEvent,
);
const replaceLandingConfigMutation = useReplaceAdminAnchorEventLandingConfig();

const normalizeNullableNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
};

const toLandingConfigForm = (
  config: NonNullable<typeof landingConfigQuery.data.value>["config"],
): LandingConfigForm => ({
  formRatio: config.variantRatioOverride?.FORM ?? 50,
  cardRichRatio: config.variantRatioOverride?.CARD_RICH ?? 50,
  listRatio: config.variantRatioOverride?.LIST ?? 0,
  assignmentRevision: config.assignmentRevision,
});

const validationMessage = computed(() => {
  const formRatio = normalizeNullableNonNegativeInteger(form.value.formRatio);
  const cardRichRatio = normalizeNullableNonNegativeInteger(
    form.value.cardRichRatio,
  );
  const listRatio = normalizeNullableNonNegativeInteger(form.value.listRatio);
  const assignmentRevision = normalizeNullableNonNegativeInteger(
    form.value.assignmentRevision,
  );

  if (assignmentRevision === null || assignmentRevision <= 0) {
    return t("adminAnchorEvents.assignmentRevisionValidation");
  }

  if (formRatio === null || cardRichRatio === null || listRatio === null) {
    return t("adminAnchorEvents.landingRatioValidation");
  }

  if (formRatio + cardRichRatio + listRatio !== 100) {
    return t("adminAnchorEvents.landingRatioValidation");
  }

  return null;
});

const canSave = computed(
  () =>
    hasEditableEvent.value &&
    !landingConfigQuery.isLoading.value &&
    !replaceLandingConfigMutation.isPending.value &&
    !validationMessage.value,
);

watch(
  [() => landingConfigQuery.data.value, hasEditableEvent],
  ([landingConfig, editable]) => {
    if (!editable || !landingConfig) {
      form.value = {
        formRatio: 50,
        cardRichRatio: 50,
        listRatio: 0,
        assignmentRevision: 1,
      };
      return;
    }

    form.value = toLandingConfigForm(landingConfig.config);
  },
  { immediate: true },
);

const save = async (): Promise<void> => {
  if (!canSave.value || props.eventId === null) {
    return;
  }

  const formRatio =
    normalizeNullableNonNegativeInteger(form.value.formRatio) ?? 100;
  const cardRichRatio =
    normalizeNullableNonNegativeInteger(form.value.cardRichRatio) ?? 0;
  const listRatio =
    normalizeNullableNonNegativeInteger(form.value.listRatio) ?? 0;
  const assignmentRevision =
    normalizeNullableNonNegativeInteger(form.value.assignmentRevision) ?? 1;

  try {
    await replaceLandingConfigMutation.mutateAsync({
      eventId: props.eventId,
      input: {
        variantRatioOverride: {
          FORM: formRatio,
          CARD_RICH: cardRichRatio,
          LIST: listRatio,
        },
        assignmentRevision,
      },
    });
  } catch {
    // Mutation state is rendered inside this business component.
  }
};

defineExpose({
  save,
  get isSaving() {
    return replaceLandingConfigMutation.isPending.value;
  },
  get canSave() {
    return canSave.value;
  },
});
</script>

<style lang="scss" scoped>
.anchor-event-landing-rollout-editor,
.field {
  display: flex;
  flex-direction: column;
}

.anchor-event-landing-rollout-editor {
  gap: var(--sys-spacing-small);
}

.grid-3 {
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

.hint,
.error-message {
  margin: 0;
  @include mx.pu-font(body);
}

.hint {
  color: var(--sys-color-on-surface-variant);
}

.error-message {
  color: var(--sys-color-error);
}

@media (min-width: 880px) {
  .grid-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
