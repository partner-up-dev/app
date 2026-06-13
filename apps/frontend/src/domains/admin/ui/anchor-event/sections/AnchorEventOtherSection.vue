<template>
  <section
    id="anchor-event-other"
    class="anchor-event-other-section"
    data-testid="admin-anchor-event.section.other"
  >
    <BentoLayout>
      <BentoItem :title="t('adminCommon.navAnchorEventOther')" span="full">
        <template #actions>
          <Button
            appearance="pill"
            size="sm"
            type="button"
            :disabled="saveDisabled"
            @click="$emit('save')"
          >
            {{ saveLabel }}
          </Button>
        </template>

        <AnchorEventJoinGateEditor v-model="form" />
      </BentoItem>

      <BentoItem :title="t('adminPR.eventFeedbackQuestionnaireTemplateLabel')">
        <AnchorEventFeedbackQuestionnairePicker
          v-model="form"
          :templates="feedbackQuestionnaireTemplates"
        />
      </BentoItem>

      <BentoItem :title="t('adminAnchorEvents.defaultPrNotesTitle')">
        <PuTextarea
          v-model="form.defaultPrNotes"
          :placeholder="t('adminAnchorEvents.defaultPrNotesPlaceholder')"
        />
      </BentoItem>

      <BentoItem :title="t('adminAnchorEvents.participationFrequencyLimitTitle')">
        <div class="policy-setting">
          <PuInput
            v-model="participationFrequencyLimitText"
            type="number"
            inputmode="numeric"
            :disabled="props.disabled"
            :placeholder="
              t('adminAnchorEvents.participationFrequencyLimitPlaceholder')
            "
            data-testid="admin-anchor-event.participation-frequency-limit"
          />
          <p class="policy-setting__hint">
            {{ t("adminAnchorEvents.participationFrequencyLimitHint") }}
          </p>
        </div>
      </BentoItem>

      <BentoItem :title="t('adminAnchorEvents.prCreationPolicyTitle')">
        <div class="policy-setting">
          <PuToggleSwitch
            v-model="adminOnlyCreation"
            :label="t('adminAnchorEvents.prCreationPolicyAdminOnlyLabel')"
            :disabled="props.disabled"
          />
          <p class="policy-setting__hint">
            {{ t("adminAnchorEvents.prCreationPolicyHint") }}
          </p>
        </div>
      </BentoItem>

      <BentoItem :title="t('adminAnchorEvents.fullPrExpansionPolicyTitle')">
        <div class="policy-setting">
          <PuToggleSwitch
            v-model="fullPrExpansionEnabled"
            :label="t('adminAnchorEvents.fullPrExpansionPolicyEnabledLabel')"
            :disabled="props.disabled"
          />
          <p class="policy-setting__hint">
            {{ t("adminAnchorEvents.fullPrExpansionPolicyHint") }}
          </p>
        </div>
      </BentoItem>

      <BentoItem :title="t('adminAnchorEvents.landingRolloutTitle')">
        <template #actions>
          <Button
            appearance="pill"
            size="sm"
            type="button"
            :disabled="!landingRolloutEditor?.canSave"
            :loading="landingRolloutEditor?.isSaving ?? false"
            @click="saveLandingConfig"
          >
            {{ landingSaveLabel }}
          </Button>
        </template>

        <AnchorEventLandingRolloutEditor
          ref="landingRolloutEditor"
          :event-id="eventId"
          :enabled="hasEditableEvent"
        />
      </BentoItem>
    </BentoLayout>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import Button from "@/shared/ui/actions/Button.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import BentoLayout from "@/domains/admin/ui/layout/BentoLayout.vue";
import AnchorEventFeedbackQuestionnairePicker from "@/domains/admin/ui/anchor-event/components/AnchorEventFeedbackQuestionnairePicker.vue";
import AnchorEventJoinGateEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventJoinGateEditor.vue";
import AnchorEventLandingRolloutEditor from "@/domains/admin/ui/anchor-event/components/AnchorEventLandingRolloutEditor.vue";
import { PuInput, PuTextarea, PuToggleSwitch } from "@partner-up-dev/design-web";
import type {
  AnchorEventEditorForm,
  FeedbackQuestionnaireTemplateOption,
} from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";

type LandingRolloutEditorExposed = {
  save: () => Promise<void>;
  isSaving: boolean;
  canSave: boolean;
};

const props = withDefaults(
  defineProps<{
    eventId: number | null;
    disabled?: boolean;
    saveLabel: string;
    saveDisabled: boolean;
    feedbackQuestionnaireTemplates: FeedbackQuestionnaireTemplateOption[];
  }>(),
  {
    disabled: false,
  },
);

defineEmits<{
  save: [];
}>();

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();
const landingRolloutEditor = ref<LandingRolloutEditorExposed | null>(null);

const hasEditableEvent = computed(
  () => props.eventId !== null && !props.disabled,
);
const adminOnlyCreation = computed({
  get: () => form.value.prCreationPolicy === "ADMIN_ONLY",
  set: (value: boolean) => {
    form.value.prCreationPolicy = value ? "ADMIN_ONLY" : "USER_AND_ADMIN";
  },
});
const fullPrExpansionEnabled = computed({
  get: () => form.value.fullPrExpansionPolicy === "ENABLED",
  set: (value: boolean) => {
    form.value.fullPrExpansionPolicy = value ? "ENABLED" : "DISABLED";
  },
});
const participationFrequencyLimitText = computed({
  get: () =>
    form.value.participationFrequencyLimit?.intervalPrCount.toString() ?? "",
  set: (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      form.value.participationFrequencyLimit = null;
      return;
    }

    const parsed = Number(normalized);
    form.value.participationFrequencyLimit =
      Number.isInteger(parsed) && parsed > 0
        ? { intervalPrCount: parsed }
        : null;
  },
});
const landingSaveLabel = computed(() =>
  landingRolloutEditor.value?.isSaving
    ? t("adminPR.saving")
    : t("adminAnchorEvents.saveLandingConfigAction"),
);

const saveLandingConfig = (): void => {
  void landingRolloutEditor.value?.save();
};
</script>

<style lang="scss" scoped>
.anchor-event-other-section {
  min-width: 0;
}

.policy-setting {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.policy-setting__hint {
  margin: 0;
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}
</style>
