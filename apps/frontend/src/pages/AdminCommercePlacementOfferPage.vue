<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #actions>
      <Button appearance="pill" tone="outline" size="sm" type="button" @click="prepareNewOffer">
        {{ t("adminCommercePlacementOffer.newOfferAction") }}
      </Button>
      <Button appearance="pill" tone="outline" size="sm" type="button" @click="prepareNewPlacement">
        {{ t("adminCommercePlacementOffer.newPlacementAction") }}
      </Button>
    </template>

    <template #rail>
      <AdminRailPanel :title="t('adminCommercePlacementOffer.offersTitle')">
        <div v-if="offers.length === 0" class="hint">
          {{ t("adminCommercePlacementOffer.emptyOffers") }}
        </div>
        <div v-else class="selection-list">
          <ChoiceCard
            v-for="offer in offers"
            :key="offer.id"
            :active="selectedOfferId === offer.id && !isCreatingOffer"
            @click="selectOffer(offer.id)"
          >
            <span>#{{ offer.id }} · {{ offer.productType }}</span>
            <small>{{ offer.status }}</small>
          </ChoiceCard>
        </div>
      </AdminRailPanel>

      <AdminRailPanel :title="t('adminCommercePlacementOffer.placementsTitle')">
        <div v-if="placements.length === 0" class="hint">
          {{ t("adminCommercePlacementOffer.emptyPlacements") }}
        </div>
        <div v-else class="selection-list">
          <ChoiceCard
            v-for="placement in placements"
            :key="placement.id"
            :active="selectedPlacementId === placement.id && !isCreatingPlacement"
            @click="selectPlacement(placement.id)"
          >
            <span>#{{ placement.id }} · {{ placement.slotKey }}</span>
            <small>{{ placement.status }} · p{{ placement.priority }}</small>
          </ChoiceCard>
        </div>
      </AdminRailPanel>
    </template>

    <template #main>
      <div class="stack">
        <LoadingIndicator
          v-if="workspaceQuery.isLoading.value"
          :message="t('common.loading')"
        />
        <ErrorToast
          v-else-if="workspaceQuery.error.value"
          :message="workspaceQuery.error.value.message"
          persistent
        />
        <template v-else>
          <BentoItem
            :title="isCreatingOffer ? t('adminCommercePlacementOffer.createOfferTitle') : t('adminCommercePlacementOffer.editOfferTitle')"
            :description="t('adminCommercePlacementOffer.offerHint')"
            span="full"
          >
            <div class="form-stack">
              <label class="field">
                <span class="field-label">{{ t("adminCommercePlacementOffer.productTypeLabel") }}</span>
                <select v-model="offerForm.productType" class="text-input">
                  <option value="RENTAL">RENTAL</option>
                  <option value="RIDE_HAILING">RIDE_HAILING</option>
                </select>
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommercePlacementOffer.statusLabel") }}</span>
                <select v-model="offerForm.status" class="text-input">
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAUSED">PAUSED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommercePlacementOffer.spuIdsLabel") }}</span>
                <input v-model="offerForm.spuIdsCsv" class="text-input" type="text" />
              </label>

              <div class="hint">
                {{ availableSpuHint }}
              </div>

              <label class="field">
                <span class="field-label">{{ t("adminCommercePlacementOffer.termsVersionLabel") }}</span>
                <input v-model.number="offerForm.termsVersion" class="text-input" type="number" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommercePlacementOffer.startsAtLabel") }}</span>
                <input v-model="offerForm.startsAt" class="text-input" type="text" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommercePlacementOffer.endsAtLabel") }}</span>
                <input v-model="offerForm.endsAt" class="text-input" type="text" />
              </label>

              <PricingRulesEditor
                v-model="offerForm.pricingRules"
                :title="t('adminCommercePlacementOffer.pricingRulesLabel')"
              />

              <div class="inline-actions">
                <Button size="sm" type="button" :disabled="isSavingOffer" @click="handleSaveOffer">
                  {{ isSavingOffer ? t("adminCommercePlacementOffer.savingAction") : t("adminCommercePlacementOffer.saveOfferAction") }}
                </Button>
              </div>
            </div>
          </BentoItem>

          <BentoItem
            :title="isCreatingPlacement ? t('adminCommercePlacementOffer.createPlacementTitle') : t('adminCommercePlacementOffer.editPlacementTitle')"
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
                <span class="field-label">{{ t("adminCommercePlacementOffer.priorityLabel") }}</span>
                <input v-model.number="placementForm.priority" class="text-input" type="number" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommercePlacementOffer.creativeTitleLabel") }}</span>
                <input v-model="placementForm.creativeTitle" class="text-input" type="text" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommercePlacementOffer.creativeSubtitleLabel") }}</span>
                <input v-model="placementForm.creativeSubtitle" class="text-input" type="text" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommercePlacementOffer.ctaLabel") }}</span>
                <input v-model="placementForm.ctaLabel" class="text-input" type="text" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommercePlacementOffer.targetKindLabel") }}</span>
                <select v-model="placementForm.targetKind" class="text-input">
                  <option value="OFFER">OFFER</option>
                  <option value="ORDER">ORDER</option>
                </select>
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommercePlacementOffer.targetIdLabel") }}</span>
                <input v-model.number="placementForm.targetId" class="text-input" type="number" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommercePlacementOffer.matchingRuleLabel") }}</span>
                <textarea v-model="placementForm.matchingRuleText" class="json-textarea" rows="8"></textarea>
              </label>

              <section class="binding-editor">
                <div class="binding-editor__header">
                  <span class="field-label">{{ t("adminCommercePlacementOffer.bindingRulesLabel") }}</span>
                  <Button
                    appearance="pill"
                    tone="outline"
                    size="sm"
                    type="button"
                    @click="addBindingRule"
                  >
                    {{ t("adminCommercePlacementOffer.addBindingRuleAction") }}
                  </Button>
                </div>

                <div
                  v-for="rule in placementForm.bindingRules"
                  :key="rule.id"
                  class="binding-row"
                >
                  <label class="field">
                    <span class="field-label">{{ t("adminCommercePlacementOffer.bindingFieldLabel") }}</span>
                    <select v-model="rule.fieldKey" class="text-input">
                      <option
                        v-for="option in bindingFieldOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                  </label>

                  <label class="field">
                    <span class="field-label">{{ t("adminCommercePlacementOffer.bindingSourceLabel") }}</span>
                    <select v-model="rule.contextPath" class="text-input">
                      <option
                        v-for="option in contextPathOptionsForField(rule.fieldKey)"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                  </label>

                  <div class="binding-row__lock">
                    <span class="field-label">{{ t("adminCommercePlacementOffer.bindingLockLabel") }}</span>
                    <span class="binding-row__lock-value">true</span>
                  </div>

                  <Button
                    appearance="pill"
                    tone="outline"
                    size="sm"
                    type="button"
                    @click="removeBindingRule(rule.id)"
                  >
                    {{ t("adminCommercePlacementOffer.removeBindingRuleAction") }}
                  </Button>
                </div>
              </section>

              <div class="inline-actions">
                <Button size="sm" type="button" :disabled="isSavingPlacement" @click="handleSavePlacement">
                  {{ isSavingPlacement ? t("adminCommercePlacementOffer.savingAction") : t("adminCommercePlacementOffer.savePlacementAction") }}
                </Button>
              </div>
            </div>
          </BentoItem>

          <ErrorToast
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
  buildPricingRules,
  toPricingRuleDrafts,
  type PricingRuleBuildLabels,
  type PricingRuleDraft,
} from "@/domains/admin-commerce/model/pricing-rules/pricingRuleEditorModel";
import {
  type AdminOfferInput,
  type AdminPlacementInput,
  useAdminCommercePlacementOfferWorkspace,
  useCreateAdminOffer,
  useCreateAdminPlacement,
  useUpdateAdminOffer,
  useUpdateAdminPlacement,
} from "@/domains/admin-commerce/queries/useAdminCommerce";
import { parseJsonText, prettyJson } from "@/domains/admin-commerce/editor-json";
import PricingRulesEditor from "@/domains/admin-commerce/ui/pricing-rules/PricingRulesEditor.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminCommercePlacementOfferWorkspace(isAdmin);
const createOfferMutation = useCreateAdminOffer();
const updateOfferMutation = useUpdateAdminOffer();
const createPlacementMutation = useCreateAdminPlacement();
const updatePlacementMutation = useUpdateAdminPlacement();

const selectedOfferIdRaw = ref("");
const selectedPlacementIdRaw = ref("");
const isCreatingOffer = ref(false);
const isCreatingPlacement = ref(false);
const localErrorMessage = ref<string | null>(null);

const offers = computed(() => workspaceQuery.data.value?.offers ?? []);
const placements = computed(() => workspaceQuery.data.value?.placements ?? []);
const spus = computed(() => workspaceQuery.data.value?.spus ?? []);

const selectedOfferId = computed<number | null>(() => {
  const parsed = Number(selectedOfferIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});
const selectedPlacementId = computed<number | null>(() => {
  const parsed = Number(selectedPlacementIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});

const selectedOffer = computed(
  () => offers.value.find((offer) => offer.id === selectedOfferId.value) ?? null,
);
const selectedPlacement = computed(
  () =>
    placements.value.find((placement) => placement.id === selectedPlacementId.value) ??
    null,
);

const toDateInputValue = (value: string | Date | null | undefined): string => {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : value;
};

type OfferEditorForm = {
  productType: AdminOfferInput["productType"];
  status: AdminOfferInput["status"];
  spuIdsCsv: string;
  termsVersion: number;
  startsAt: string;
  endsAt: string;
  pricingRules: PricingRuleDraft[];
};

type PlacementBindingRuleInput = AdminPlacementInput["bindingRules"][number];
type PlacementBindingFieldKey = PlacementBindingRuleInput["fieldKey"];
type PlacementBindingContextPath = PlacementBindingRuleInput["contextPath"];
type PlacementBindingRuleDraft = PlacementBindingRuleInput & {
  id: string;
};

let bindingRuleIdSequence = 0;

const createBindingRuleDraft = (
  input: PlacementBindingRuleInput,
): PlacementBindingRuleDraft => ({
  ...input,
  id: `binding-${++bindingRuleIdSequence}`,
});

const defaultPlacementBindingRules = (): PlacementBindingRuleDraft[] => [
  createBindingRuleDraft({
    fieldKey: "participantCount",
    contextPath: "activeParticipantCount",
    lock: true,
  }),
  createBindingRuleDraft({
    fieldKey: "serviceStartAt",
    contextPath: "time.startAt",
    lock: true,
  }),
  createBindingRuleDraft({
    fieldKey: "serviceEndAt",
    contextPath: "time.endAt",
    lock: true,
  }),
];

const emptyOfferForm = (): OfferEditorForm => ({
  productType: "RENTAL",
  status: "DRAFT",
  spuIdsCsv: "",
  termsVersion: 1,
  startsAt: "",
  endsAt: "",
  pricingRules: [],
});

const offerForm = ref<OfferEditorForm>(emptyOfferForm());

const placementForm = ref({
  status: "DRAFT" as AdminPlacementInput["status"],
  priority: 0,
  creativeTitle: "",
  creativeSubtitle: "",
  ctaLabel: "",
  targetKind: "OFFER" as "OFFER" | "ORDER",
  targetId: 0,
  matchingRuleText: "{}",
  bindingRules: defaultPlacementBindingRules(),
});

const bindingFieldOptions = computed<
  Array<{ value: PlacementBindingFieldKey; label: string }>
>(() => [
  {
    value: "participantCount",
    label: t("adminCommercePlacementOffer.participantCountBindingLabel"),
  },
  {
    value: "serviceStartAt",
    label: t("adminCommercePlacementOffer.serviceStartAtBindingLabel"),
  },
  {
    value: "serviceEndAt",
    label: t("adminCommercePlacementOffer.serviceEndAtBindingLabel"),
  },
]);

const contextPathOptionsByField = computed<
  Record<
    PlacementBindingFieldKey,
    Array<{ value: PlacementBindingContextPath; label: string }>
  >
>(() => ({
  participantCount: [
    {
      value: "activeParticipantCount",
      label: t("adminCommercePlacementOffer.activeParticipantCountSourceLabel"),
    },
  ],
  serviceStartAt: [
    {
      value: "time.startAt",
      label: t("adminCommercePlacementOffer.timeStartSourceLabel"),
    },
  ],
  serviceEndAt: [
    {
      value: "time.endAt",
      label: t("adminCommercePlacementOffer.timeEndSourceLabel"),
    },
  ],
}));

const contextPathOptionsForField = (fieldKey: PlacementBindingFieldKey) =>
  contextPathOptionsByField.value[fieldKey];

const isSavingOffer = computed(
  () => createOfferMutation.isPending.value || updateOfferMutation.isPending.value,
);
const isSavingPlacement = computed(
  () =>
    createPlacementMutation.isPending.value || updatePlacementMutation.isPending.value,
);

const availableSpuHint = computed(() =>
  spus.value.length === 0
    ? t("adminCommercePlacementOffer.emptySpuHint")
    : spus.value
        .map((spu) => `${spu.id}:${spu.name}(${spu.productType}/${spu.status})`)
        .join("，"),
);

const pageErrorMessage = computed(
  () =>
    localErrorMessage.value ||
    createOfferMutation.error.value?.message ||
    updateOfferMutation.error.value?.message ||
    createPlacementMutation.error.value?.message ||
    updatePlacementMutation.error.value?.message ||
    null,
);

watch(
  offers,
  (nextOffers) => {
    if (!nextOffers.some((offer) => String(offer.id) === selectedOfferIdRaw.value)) {
      selectedOfferIdRaw.value = nextOffers[0] ? String(nextOffers[0].id) : "";
    }
  },
  { immediate: true },
);

watch(
  placements,
  (nextPlacements) => {
    if (
      !nextPlacements.some(
        (placement) => String(placement.id) === selectedPlacementIdRaw.value,
      )
    ) {
      selectedPlacementIdRaw.value = nextPlacements[0]
        ? String(nextPlacements[0].id)
        : "";
    }
  },
  { immediate: true },
);

watch(
  [selectedOffer, isCreatingOffer],
  ([offer, creating]) => {
    if (creating || !offer) {
      offerForm.value = emptyOfferForm();
      return;
    }

    offerForm.value = {
      productType: offer.productType,
      status: offer.status,
      spuIdsCsv: offer.spuIds.join(","),
      termsVersion: offer.termsVersion,
      startsAt: toDateInputValue(offer.startsAt),
      endsAt: toDateInputValue(offer.endsAt),
      pricingRules: toPricingRuleDrafts(offer.pricingPolicy.rules),
    };
  },
  { immediate: true },
);

watch(
  [selectedPlacement, isCreatingPlacement],
  ([placement, creating]) => {
    if (creating || !placement) {
      placementForm.value = {
        status: "DRAFT",
        priority: 0,
        creativeTitle: "",
        creativeSubtitle: "",
        ctaLabel: "",
        targetKind: "OFFER",
        targetId: 0,
        matchingRuleText: "{}",
        bindingRules: defaultPlacementBindingRules(),
      };
      return;
    }

    placementForm.value = {
      status: placement.status,
      priority: placement.priority,
      creativeTitle: placement.creative.title,
      creativeSubtitle: placement.creative.subtitle ?? "",
      ctaLabel: placement.creative.ctaLabel,
      targetKind: placement.target.kind,
      targetId:
        placement.target.kind === "OFFER"
          ? placement.target.offerId
          : placement.target.orderId,
      matchingRuleText: prettyJson(placement.matchingRule),
      bindingRules:
        placement.bindingRules.length > 0
          ? placement.bindingRules.map((rule) => createBindingRuleDraft(rule))
          : defaultPlacementBindingRules(),
    };
  },
  { immediate: true },
);

watch(
  () =>
    placementForm.value.bindingRules.map((rule) => `${rule.id}:${rule.fieldKey}`),
  () => {
    for (const rule of placementForm.value.bindingRules) {
      const allowed = contextPathOptionsForField(rule.fieldKey);
      if (!allowed.some((option) => option.value === rule.contextPath)) {
        rule.contextPath = allowed[0]!.value;
      }
    }
  },
);

const prepareNewOffer = () => {
  isCreatingOffer.value = true;
};

const prepareNewPlacement = () => {
  isCreatingPlacement.value = true;
};

const selectOffer = (offerId: number) => {
  selectedOfferIdRaw.value = String(offerId);
  isCreatingOffer.value = false;
};

const selectPlacement = (placementId: number) => {
  selectedPlacementIdRaw.value = String(placementId);
  isCreatingPlacement.value = false;
};

const addBindingRule = () => {
  placementForm.value.bindingRules.push(
    createBindingRuleDraft({
      fieldKey: "participantCount",
      contextPath: "activeParticipantCount",
      lock: true,
    }),
  );
};

const removeBindingRule = (id: string) => {
  placementForm.value.bindingRules = placementForm.value.bindingRules.filter(
    (rule) => rule.id !== id,
  );
};

const buildPricingRuleLabels = (): PricingRuleBuildLabels => ({
  pricingRuleIdLabel: t("adminCommerceProducts.pricingRuleIdLabel"),
  targetIdLabel: t("adminCommerceProducts.targetIdLabel"),
  amountFenLabel: t("adminCommerceProducts.amountFenLabel"),
  ratioBpsLabel: t("adminCommerceProducts.ratioBpsLabel"),
  resetAmountFenLabel: t("adminCommerceProducts.resetAmountFenLabel"),
});

const buildOfferInput = (): AdminOfferInput => ({
  productType: offerForm.value.productType,
  status: offerForm.value.status,
  spuIds: offerForm.value.spuIdsCsv
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0),
  termsVersion: offerForm.value.termsVersion,
  startsAt: offerForm.value.startsAt.trim() || null,
  endsAt: offerForm.value.endsAt.trim() || null,
  pricingRules: buildPricingRules(
    offerForm.value.pricingRules,
    buildPricingRuleLabels(),
  ),
});

const buildPlacementInput = (): AdminPlacementInput => ({
  slotKey: "PR_UTILITY_ACTIONS_BUTTON",
  placementType: "BUTTON",
  status: placementForm.value.status,
  priority: placementForm.value.priority,
  matchingRule: parseJsonText(
    placementForm.value.matchingRuleText,
    t("adminCommercePlacementOffer.matchingRuleLabel"),
  ),
  creative: {
    title: placementForm.value.creativeTitle.trim(),
    subtitle: placementForm.value.creativeSubtitle.trim() || null,
    ctaLabel: placementForm.value.ctaLabel.trim(),
  },
  target:
    placementForm.value.targetKind === "OFFER"
      ? { kind: "OFFER", offerId: placementForm.value.targetId }
      : { kind: "ORDER", orderId: placementForm.value.targetId },
  bindingRules: placementForm.value.bindingRules.map((rule) => ({
    fieldKey: rule.fieldKey,
    contextPath: rule.contextPath,
    lock: true,
  })),
});

const handleSaveOffer = async () => {
  localErrorMessage.value = null;
  try {
    const input = buildOfferInput();
    if (isCreatingOffer.value) {
      await createOfferMutation.mutateAsync(input);
      isCreatingOffer.value = false;
      return;
    }
    if (selectedOfferId.value === null) {
      throw new Error(t("adminCommercePlacementOffer.emptyOffers"));
    }
    await updateOfferMutation.mutateAsync({ offerId: selectedOfferId.value, input });
  } catch (error) {
    localErrorMessage.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
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
    localErrorMessage.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};

const clearErrors = () => {
  localErrorMessage.value = null;
  createOfferMutation.reset();
  updateOfferMutation.reset();
  createPlacementMutation.reset();
  updatePlacementMutation.reset();
};
</script>

<style lang="scss" scoped>
.stack,
.selection-list,
.form-stack {
  display: flex;
  flex-direction: column;
}

.stack,
.selection-list {
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
  @include mx.pu-font(body-medium);
}

.hint,
small {
  color: var(--sys-color-on-surface-variant);
}

.text-input,
.json-textarea {
  width: 100%;
  min-width: 0;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.json-textarea {
  min-height: 8rem;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.inline-actions {
  display: flex;
  justify-content: flex-end;
}

.binding-editor {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.binding-editor__header,
.binding-row {
  display: flex;
  gap: var(--sys-spacing-small);
}

.binding-editor__header {
  align-items: center;
  justify-content: space-between;
}

.binding-row {
  align-items: end;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
}

.binding-row > .field {
  flex: 1;
}

.binding-row__lock {
  display: flex;
  min-width: 5rem;
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
