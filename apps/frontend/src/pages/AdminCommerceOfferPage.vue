<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #actions>
      <PuButton
        shape="pill"
        tone="neutral" variant="outline"
        size="sm"

        @click="prepareNewOffer"
      >
        {{ t("adminCommercePlacementOffer.newOfferAction") }}
      </PuButton>
    </template>

    <template #rail>
      <AdminRailPanel :title="t('adminCommercePlacementOffer.offersTitle')">
        <div v-if="offers.length === 0" class="hint">
          {{ t("adminCommercePlacementOffer.emptyOffers") }}
        </div>
        <div v-else class="offer-rail-list">
          <PuCard
            v-for="offer in offers"
            :key="offer.id"
            :active="selectedOfferId === offer.id && !isCreatingOffer"
            @click="selectOffer(offer.id)"
            selectable
            variant="outline"
            padding="sm"
            gap="xs"
          >
            <span>#{{ offer.id }} · {{ offer.productType }}</span>
            <small>{{ offer.status }}</small>
          </PuCard>
        </div>
      </AdminRailPanel>
    </template>

    <template #main>
      <div class="stack">
        <PuLoadingState
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
            :title="
              isCreatingOffer
                ? t('adminCommercePlacementOffer.createOfferTitle')
                : t('adminCommercePlacementOffer.editOfferTitle')
            "
            :description="t('adminCommercePlacementOffer.offerHint')"
            span="full"
          >
            <div class="form-stack">
              <label class="field">
                <span class="field-label">{{
                  t("adminCommercePlacementOffer.productTypeLabel")
                }}</span>
                <select v-model="offerForm.productType" class="text-input">
                  <option value="RENTAL">RENTAL</option>
                  <option value="RIDE_HAILING">RIDE_HAILING</option>
                </select>
              </label>

              <label class="field">
                <span class="field-label">{{
                  t("adminCommercePlacementOffer.statusLabel")
                }}</span>
                <select v-model="offerForm.status" class="text-input">
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAUSED">PAUSED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>

              <label class="field">
                <span class="field-label">{{
                  t("adminCommercePlacementOffer.spuIdsLabel")
                }}</span>
                <input
                  v-model="offerForm.spuIdsCsv"
                  class="text-input"
                  type="text"
                />
              </label>

              <div class="hint">
                {{ availableSpuHint }}
              </div>

              <label class="field">
                <span class="field-label">{{
                  t("adminCommercePlacementOffer.termsVersionLabel")
                }}</span>
                <input
                  v-model.number="offerForm.termsVersion"
                  class="text-input"
                  type="number"
                />
              </label>

              <label class="field">
                <span class="field-label">{{
                  t("adminCommercePlacementOffer.startsAtLabel")
                }}</span>
                <input
                  v-model="offerForm.startsAt"
                  class="text-input"
                  type="text"
                />
              </label>

              <label class="field">
                <span class="field-label">{{
                  t("adminCommercePlacementOffer.endsAtLabel")
                }}</span>
                <input
                  v-model="offerForm.endsAt"
                  class="text-input"
                  type="text"
                />
              </label>

              <PricingRulesEditor
                v-model="offerForm.pricingRules"
                :title="t('adminCommercePlacementOffer.pricingRulesLabel')"
              />

              <div class="inline-actions">
                <PuButton
                  size="sm"

                  :disabled="isSavingOffer"
                  @click="handleSaveOffer"
                >
                  {{
                    isSavingOffer
                      ? t("adminCommercePlacementOffer.savingAction")
                      : t("adminCommercePlacementOffer.saveOfferAction")
                  }}
                </PuButton>
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
  useAdminCommercePlacementOfferWorkspace,
  useCreateAdminOffer,
  useUpdateAdminOffer,
} from "@/domains/admin-commerce/queries/useAdminCommerce";
import PricingRulesEditor from "@/domains/admin-commerce/ui/pricing-rules/PricingRulesEditor.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import { PuButton, PuCard, PuLoadingState } from "@partner-up-dev/design-web";

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminCommercePlacementOfferWorkspace(isAdmin);
const createOfferMutation = useCreateAdminOffer();
const updateOfferMutation = useUpdateAdminOffer();

const selectedOfferIdRaw = ref("");
const isCreatingOffer = ref(false);
const localErrorMessage = ref<string | null>(null);

const offers = computed(() => workspaceQuery.data.value?.offers ?? []);
const spus = computed(() => workspaceQuery.data.value?.spus ?? []);

const selectedOfferId = computed<number | null>(() => {
  const parsed = Number(selectedOfferIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});

const selectedOffer = computed(
  () =>
    offers.value.find((offer) => offer.id === selectedOfferId.value) ?? null,
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

const isSavingOffer = computed(
  () =>
    createOfferMutation.isPending.value || updateOfferMutation.isPending.value,
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
    null,
);

watch(
  offers,
  (nextOffers) => {
    if (
      !nextOffers.some((offer) => String(offer.id) === selectedOfferIdRaw.value)
    ) {
      selectedOfferIdRaw.value = nextOffers[0] ? String(nextOffers[0].id) : "";
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

const prepareNewOffer = () => {
  isCreatingOffer.value = true;
};

const selectOffer = (offerId: number) => {
  selectedOfferIdRaw.value = String(offerId);
  isCreatingOffer.value = false;
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
    await updateOfferMutation.mutateAsync({
      offerId: selectedOfferId.value,
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
};
</script>

<style lang="scss" scoped>
.stack,
.offer-rail-list,
.form-stack {
  display: flex;
  flex-direction: column;
}

.stack,
.offer-rail-list {
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

.inline-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
