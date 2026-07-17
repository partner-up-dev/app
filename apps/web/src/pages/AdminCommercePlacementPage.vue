<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #actions>
      <PuButton
        shape="pill"
        tone="neutral"
        variant="outline"
        size="sm"
        @click="prepareNewPlacement"
      >
        {{ t("adminCommercePlacementOffer.newPlacementAction") }}
      </PuButton>
    </template>

    <template #rail>
      <AdminRailPanel :title="t('adminCommercePlacementOffer.placementsTitle')">
        <div v-if="placements.length === 0" class="hint">
          {{ t("adminCommercePlacementOffer.emptyPlacements") }}
        </div>
        <div v-else class="placement-rail-list">
          <PuCard
            v-for="placement in placements"
            :key="placement.id"
            :active="selectedPlacementId === placement.id && !isCreatingPlacement"
            @click="selectPlacement(placement.id)"
            selectable
            variant="outline"
            padding="sm"
            gap="xs"
          >
            <span>#{{ placement.id }} · offer #{{ placement.offerId }}</span>
            <small>{{ placement.status }} · p{{ placement.priority }}</small>
          </PuCard>
        </div>
      </AdminRailPanel>
    </template>

    <template #main>
      <div class="stack">
        <PuLoadingState v-if="workspaceQuery.isLoading.value" :message="t('common.loading')" />
        <PuInlineNotice
          tone="error"
          v-else-if="workspaceQuery.error.value"
          :message="workspaceQuery.error.value.message"
        />
        <template v-else>
          <BentoItem
            :title="
              isCreatingPlacement
                ? t('adminCommercePlacementOffer.createPlacementTitle')
                : t('adminCommercePlacementOffer.editPlacementTitle')
            "
            :description="t('adminCommercePlacementOffer.placementHint')"
            span="full"
          >
            <div class="form-stack">
              <label class="field">
                <span class="field-label">{{ t("adminCommercePlacementOffer.statusLabel") }}</span>
                <select v-model="placementForm.status" class="text-input">
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAUSED">PAUSED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>

              <label class="field">
                <span class="field-label">{{
                  t("adminCommercePlacementOffer.priorityLabel")
                }}</span>
                <input v-model.number="placementForm.priority" class="text-input" type="number" />
              </label>

              <label class="field">
                <span class="field-label">{{
                  t("adminCommercePlacementOffer.placementEffectiveFromLabel")
                }}</span>
                <input v-model="placementForm.effectiveFrom" class="text-input" type="text" />
              </label>

              <label class="field">
                <span class="field-label">{{
                  t("adminCommercePlacementOffer.placementEffectiveToLabel")
                }}</span>
                <input v-model="placementForm.effectiveTo" class="text-input" type="text" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommercePlacementOffer.offerIdLabel") }}</span>
                <input
                  :value="placementForm.offerId ?? ''"
                  class="text-input"
                  type="number"
                  @input="handleOfferIdInput"
                />
              </label>

              <div class="hint">
                {{ availableOfferHint }}
              </div>

              <label class="field">
                <span class="field-label">{{ t("adminCommercePlacementOffer.ctaLabel") }}</span>
                <input v-model="placementForm.ctaLabel" class="text-input" type="text" />
              </label>

              <label class="field">
                <span class="field-label">{{
                  t("adminCommercePlacementOffer.creativeDescriptionLabel")
                }}</span>
                <input v-model="placementForm.creativeDescription" class="text-input" type="text" />
              </label>

              <PlacementMatchingRulesEditor v-model="placementForm.matchingRule" />

              <section class="binding-editor">
                <div class="binding-editor__header">
                  <span class="field-label">{{
                    t("adminCommercePlacementOffer.bindingRulesLabel")
                  }}</span>
                  <PuButton
                    shape="pill"
                    tone="neutral"
                    variant="outline"
                    size="sm"
                    @click="addBindingRule"
                  >
                    {{ t("adminCommercePlacementOffer.addBindingRuleAction") }}
                  </PuButton>
                </div>

                <div v-for="rule in placementForm.bindingRules" :key="rule.id" class="binding-row">
                  <label class="field">
                    <span class="field-label">{{
                      t("adminCommercePlacementOffer.bindingFieldLabel")
                    }}</span>
                    <input v-model="rule.fieldKey" class="text-input" type="text" />
                  </label>

                  <label class="field">
                    <span class="field-label">{{
                      t("adminCommercePlacementOffer.bindingSourceLabel")
                    }}</span>
                    <input v-model="rule.contextPath" class="text-input" type="text" />
                  </label>

                  <div class="binding-row__lock">
                    <span class="field-label">{{
                      t("adminCommercePlacementOffer.bindingLockLabel")
                    }}</span>
                    <span class="binding-row__lock-value">true</span>
                  </div>

                  <div class="binding-row__actions">
                    <PuButton
                      shape="pill"
                      tone="neutral"
                      variant="outline"
                      size="sm"
                      @click="removeBindingRule(rule.id)"
                    >
                      {{ t("adminCommercePlacementOffer.removeBindingRuleAction") }}
                    </PuButton>
                  </div>
                </div>
              </section>

              <div class="inline-actions">
                <PuButton size="sm" :disabled="isSavingPlacement" @click="handleSavePlacement">
                  {{
                    isSavingPlacement
                      ? t("adminCommercePlacementOffer.savingAction")
                      : t("adminCommercePlacementOffer.savePlacementAction")
                  }}
                </PuButton>
              </div>
            </div>
          </BentoItem>

          <PuInlineNotice
            tone="error"
            dismissible
            v-if="pageErrorMessage"
            :message="pageErrorMessage"
            @close="clearErrors"
          />
        </template>
      </div>
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import AdminRailPanel from "@/domains/admin/ui/layout/AdminRailPanel.vue";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import {
  buildPlacementMatchingRule,
  createPlacementMatchingRuleDraft,
  toPlacementMatchingRuleDraft,
} from "@/domains/admin-commerce/model/placement-matching-rules/placementMatchingRuleEditorModel";
import type { JsonLogicRuleDraft } from "@/domains/admin-commerce/model/json-logic/jsonLogicRuleEditorModel";
import {
  type AdminPlacementInput,
  useAdminCommercePlacementOfferWorkspace,
  useCreateAdminPlacement,
  useUpdateAdminPlacement,
} from "@/domains/admin-commerce/queries/useAdminCommerce";
import PlacementMatchingRulesEditor from "@/domains/admin-commerce/ui/placement-matching-rules/PlacementMatchingRulesEditor.vue";
import { PuButton, PuCard, PuInlineNotice, PuLoadingState } from "@partner-up-dev/design-web";

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminCommercePlacementOfferWorkspace(isAdmin);
const createPlacementMutation = useCreateAdminPlacement();
const updatePlacementMutation = useUpdateAdminPlacement();

const selectedPlacementIdRaw = ref("");
const isCreatingPlacement = ref(false);
const localErrorMessage = ref<string | null>(null);

const offers = computed(() => workspaceQuery.data.value?.offers ?? []);
const placements = computed(() => workspaceQuery.data.value?.placements ?? []);

const selectedPlacementId = computed<number | null>(() => {
  const parsed = Number(selectedPlacementIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});

const selectedPlacement = computed(
  () => placements.value.find((placement) => placement.id === selectedPlacementId.value) ?? null,
);

const toDateInputValue = (value: string | Date | null | undefined): string => {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : value;
};

type PlacementBindingRuleInput = AdminPlacementInput["bindingRules"][number];
type PlacementBindingRuleDraft = PlacementBindingRuleInput & {
  id: string;
};

type PlacementEditorForm = {
  status: AdminPlacementInput["status"];
  priority: number;
  effectiveFrom: string;
  effectiveTo: string;
  offerId: number | null;
  ctaLabel: string;
  creativeDescription: string;
  matchingRule: JsonLogicRuleDraft;
  bindingRules: PlacementBindingRuleDraft[];
};

let bindingRuleIdSequence = 0;

const createBindingRuleDraft = (input: PlacementBindingRuleInput): PlacementBindingRuleDraft => ({
  ...input,
  id: `binding-${++bindingRuleIdSequence}`,
});

const emptyPlacementForm = (): PlacementEditorForm => ({
  status: "DRAFT",
  priority: 0,
  effectiveFrom: "",
  effectiveTo: "",
  offerId: null,
  ctaLabel: "",
  creativeDescription: "",
  matchingRule: createPlacementMatchingRuleDraft(),
  bindingRules: [],
});

const placementForm = ref<PlacementEditorForm>(emptyPlacementForm());

const isSavingPlacement = computed(
  () => createPlacementMutation.isPending.value || updatePlacementMutation.isPending.value,
);

const availableOfferHint = computed(() =>
  offers.value.length === 0
    ? t("adminCommercePlacementOffer.emptyOfferHint")
    : offers.value.map((offer) => `${offer.id}:${offer.productType}/${offer.status}`).join("，"),
);

const pageErrorMessage = computed(
  () =>
    localErrorMessage.value ||
    createPlacementMutation.error.value?.message ||
    updatePlacementMutation.error.value?.message ||
    null,
);

watch(
  placements,
  (nextPlacements) => {
    if (
      !nextPlacements.some((placement) => String(placement.id) === selectedPlacementIdRaw.value)
    ) {
      selectedPlacementIdRaw.value = nextPlacements[0] ? String(nextPlacements[0].id) : "";
    }
  },
  { immediate: true },
);

watch(
  [selectedPlacement, isCreatingPlacement],
  ([placement, creating]) => {
    if (creating || !placement) {
      placementForm.value = emptyPlacementForm();
      return;
    }

    placementForm.value = {
      status: placement.status,
      priority: placement.priority,
      effectiveFrom: toDateInputValue(placement.effectiveFrom),
      effectiveTo: toDateInputValue(placement.effectiveTo),
      offerId: placement.offerId,
      ctaLabel: placement.creative.ctaLabel,
      creativeDescription: placement.creative.description ?? "",
      matchingRule: toPlacementMatchingRuleDraft(placement.matchingRule),
      bindingRules: placement.bindingRules.map((rule) => createBindingRuleDraft(rule)),
    };
  },
  { immediate: true },
);

const prepareNewPlacement = () => {
  isCreatingPlacement.value = true;
};

const selectPlacement = (placementId: number) => {
  selectedPlacementIdRaw.value = String(placementId);
  isCreatingPlacement.value = false;
};

const addBindingRule = () => {
  placementForm.value.bindingRules.push(
    createBindingRuleDraft({
      fieldKey: "",
      contextPath: "",
      lock: true,
    }),
  );
};

const removeBindingRule = (id: string) => {
  placementForm.value.bindingRules = placementForm.value.bindingRules.filter(
    (rule) => rule.id !== id,
  );
};

const handleOfferIdInput = (event: Event) => {
  if (!(event.target instanceof HTMLInputElement)) return;
  const rawValue = event.target.value.trim();
  if (!rawValue) {
    placementForm.value.offerId = null;
    return;
  }

  const parsed = Number(rawValue);
  placementForm.value.offerId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const buildPlacementInput = (): AdminPlacementInput => {
  if (placementForm.value.offerId === null) {
    throw new Error(t("adminCommercePlacementOffer.offerIdRequiredMessage"));
  }

  return {
    placementType: "BUTTON",
    offerId: placementForm.value.offerId,
    status: placementForm.value.status,
    priority: placementForm.value.priority,
    effectiveFrom: placementForm.value.effectiveFrom.trim() || null,
    effectiveTo: placementForm.value.effectiveTo.trim() || null,
    matchingRule: buildPlacementMatchingRule(placementForm.value.matchingRule),
    creative: {
      ctaLabel: placementForm.value.ctaLabel.trim(),
      description: placementForm.value.creativeDescription.trim() || null,
    },
    bindingRules: placementForm.value.bindingRules.map((rule) => ({
      fieldKey: rule.fieldKey.trim(),
      contextPath: rule.contextPath.trim(),
      lock: true,
    })),
  };
};

const handleSavePlacement = async () => {
  localErrorMessage.value = null;
  try {
    const input = buildPlacementInput();
    if (isCreatingPlacement.value) {
      await createPlacementMutation.mutateAsync(input);
      isCreatingPlacement.value = false;
      return;
    }
    if (selectedPlacementId.value === null) {
      throw new Error(t("adminCommercePlacementOffer.emptyPlacements"));
    }
    await updatePlacementMutation.mutateAsync({
      placementId: selectedPlacementId.value,
      input,
    });
  } catch (error) {
    localErrorMessage.value = error instanceof Error ? error.message : t("common.operationFailed");
  }
};

const clearErrors = () => {
  localErrorMessage.value = null;
  createPlacementMutation.reset();
  updatePlacementMutation.reset();
};
</script>

<style lang="scss" scoped>
.stack,
.placement-rail-list,
.form-stack {
  display: flex;
  flex-direction: column;
}

.stack,
.placement-rail-list {
  gap: var(--sys-spacing-medium);
}

.form-stack {
  gap: var(--sys-spacing-large);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.field-label,
.hint,
small {
  @include mx.pu-font(body);
}

.hint,
small {
  color: var(--sys-color-on-surface-variant);
}

.text-input {
  width: 100%;
  min-width: 0;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.inline-actions,
.binding-row__actions {
  display: flex;
  justify-content: flex-end;
}

.binding-editor {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.binding-editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.binding-row {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
}

.binding-row__lock {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.binding-row__lock-value {
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  color: var(--sys-color-on-surface-variant);
}
</style>
