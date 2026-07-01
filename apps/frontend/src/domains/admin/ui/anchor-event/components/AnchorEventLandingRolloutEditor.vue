<template>
  <div class="anchor-event-landing-rollout-editor">
    <p class="hint">{{ t("adminAnchorEvents.landingRolloutDescription") }}</p>

    <div v-if="!hasEditableEvent" class="hint">
      {{ t("adminAnchorEvents.selectEventForLandingConfigHint") }}
    </div>

    <PuLoadingState
      v-else-if="landingConfigQuery.isLoading.value"
      :message="t('common.loading')"
    />

    <p v-else-if="landingConfigQuery.error.value" class="error-message">
      {{ landingConfigQuery.error.value.message }}
    </p>

    <template v-else>
      <div class="grid-3">
        <PuFormItem
          :label="t('adminAnchorEvents.formRatioLabel')"
          for-id="anchor-event-landing-form-ratio"
        >
          <PuNumberInput
            id="anchor-event-landing-form-ratio"
            v-model="form.formRatio"
            :min="0"
          />
        </PuFormItem>

        <PuFormItem
          :label="t('adminAnchorEvents.cardRichRatioLabel')"
          for-id="anchor-event-landing-card-rich-ratio"
        >
          <PuNumberInput
            id="anchor-event-landing-card-rich-ratio"
            v-model="form.cardRichRatio"
            :min="0"
          />
        </PuFormItem>

        <PuFormItem
          :label="t('adminAnchorEvents.listRatioLabel')"
          for-id="anchor-event-landing-list-ratio"
        >
          <PuNumberInput
            id="anchor-event-landing-list-ratio"
            v-model="form.listRatio"
            :min="0"
          />
        </PuFormItem>
      </div>

      <PuFormItem
        :label="t('adminAnchorEvents.assignmentRevisionLabel')"
        for-id="anchor-event-landing-assignment-revision"
      >
        <PuNumberInput
          id="anchor-event-landing-assignment-revision"
          v-model="form.assignmentRevision"
          :min="1"
        />
      </PuFormItem>

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
import {
  PuFormItem,
  PuLoadingState,
  PuNumberInput,
} from "@partner-up-dev/design-web";
import {
  useAdminAnchorEventLandingConfig,
  useReplaceAdminAnchorEventLandingConfig,
} from "@/domains/admin/queries/useAdminAnchorEventLandingConfig";

type LandingConfigForm = {
  formRatio: number | null;
  cardRichRatio: number | null;
  listRatio: number | null;
  assignmentRevision: number | null;
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
.anchor-event-landing-rollout-editor {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.grid-3 {
  display: grid;
  gap: var(--sys-spacing-medium);
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
