<template>
  <div v-if="selectedSkuId === null" class="pm-hint">
    {{ t("adminCommerceProducts.selectSkuHint") }}
  </div>
  <div v-else class="pm-form-stack">
    <label class="pm-field">
      <span class="pm-field-label">{{
        t("adminCommerceProducts.operatorBufferMinutesLabel")
      }}</span>
      <input
        v-model.number="policyForm.operatorBufferMinutes"
        class="pm-field-input"
        type="number"
        min="0"
      />
    </label>

    <section class="pm-editor-section">
      <div class="pm-section-header">
        <h3 class="pm-section-title">{{ t("adminCommerceProducts.cancellationTiersLabel") }}</h3>
        <PuButton
          shape="pill"
          tone="neutral"
          variant="outline"
          size="sm"
          @click="addCancellationTier"
        >
          <template #leading>
            <span class="i-mdi-plus" />
          </template>
          {{ t("adminCommerceProducts.addCancellationTierAction") }}
        </PuButton>
      </div>
      <article v-for="(tier, index) in policyForm.tiers" :key="tier.id" class="pm-repeated-item">
        <div class="pm-section-header">
          <strong>{{
            t("adminCommerceProducts.cancellationTierTitle", { index: index + 1 })
          }}</strong>
          <PuButton
            shape="pill"
            tone="danger"
            variant="outline"
            size="sm"
            :disabled="policyForm.tiers.length <= 1"
            @click="removeCancellationTier(index)"
          >
            <template #leading>
              <span class="i-mdi-delete-outline" />
            </template>
            {{ t("adminCommerceProducts.removeItemAction") }}
          </PuButton>
        </div>
        <div class="pm-grid">
          <label class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.tierCodeLabel") }}</span>
            <input v-model="tier.code" class="pm-field-input" type="text" />
          </label>
          <label class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.visibleLabelLabel") }}</span>
            <input v-model="tier.visibleLabel" class="pm-field-input" type="text" />
          </label>
          <label class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.tierFromLabel") }}</span>
            <input v-model="tier.fromMinutesBeforeStartText" class="pm-field-input" type="text" />
          </label>
          <label class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.tierUntilLabel") }}</span>
            <input v-model="tier.untilMinutesBeforeStartText" class="pm-field-input" type="text" />
          </label>
          <label class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.refundPercentLabel") }}</span>
            <input
              v-model.number="tier.refundPercent"
              class="pm-field-input"
              type="number"
              min="0"
              max="100"
            />
          </label>
          <PuToggleSwitch
            v-model="tier.requiresOperatorHandling"
            :label="t('adminCommerceProducts.requiresOperatorHandlingLabel')"
          />
        </div>
      </article>
    </section>

    <div class="pm-inline-actions">
      <PuButton size="sm" :disabled="isSavingPolicy" @click="handleSavePolicy">
        {{
          isSavingPolicy
            ? t("adminCommerceProducts.savingAction")
            : t("adminCommerceProducts.savePolicyAction")
        }}
      </PuButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  buildPolicyInput,
  createCancellationTierDraft,
  emptyPolicyInput,
  toPolicyForm,
  type PolicyBuildLabels,
  type PolicyEditorForm,
} from "@/domains/admin-commerce/model/product-management/cancellationPolicyEditorModel";
import { useSaveAdminSkuCancellationPolicy } from "@/domains/admin-commerce/queries/useAdminCommerce";
import { useAdminCommerceProductManagementContext } from "@/domains/admin-commerce/ui/product-management/productManagementContext";
import "@/domains/admin-commerce/ui/product-management/product-management.scss";
import { PuButton, PuToggleSwitch } from "@partner-up-dev/design-web";

const { t } = useI18n();
const context = useAdminCommerceProductManagementContext();
const savePolicyMutation = useSaveAdminSkuCancellationPolicy();

const policyForm = ref<PolicyEditorForm>(toPolicyForm(emptyPolicyInput()));
const selectedSkuId = computed(() => context.selectedSkuId.value);
const selectedSkuRecord = computed(() => context.selectedSkuRecord.value);
const isCreatingSku = computed(() => context.isCreatingSku.value);
const isSavingPolicy = computed(() => savePolicyMutation.isPending.value);

watch(
  [selectedSkuRecord, isCreatingSku],
  ([record, creating]) => {
    if (creating || !record) {
      policyForm.value = toPolicyForm(emptyPolicyInput());
      return;
    }

    policyForm.value = toPolicyForm({
      operatorBufferMinutes: record.cancellationPolicy?.operatorBufferMinutes ?? 30,
      tiers: record.cancellationPolicy?.tiers ?? emptyPolicyInput().tiers,
    });
  },
  { immediate: true },
);

const buildLabels = (): PolicyBuildLabels => ({
  operatorBufferMinutesLabel: t("adminCommerceProducts.operatorBufferMinutesLabel"),
  tierFromLabel: t("adminCommerceProducts.tierFromLabel"),
  tierUntilLabel: t("adminCommerceProducts.tierUntilLabel"),
  refundPercentLabel: t("adminCommerceProducts.refundPercentLabel"),
});

const addCancellationTier = () => {
  policyForm.value.tiers.push(createCancellationTierDraft());
};

const removeCancellationTier = (index: number) => {
  if (policyForm.value.tiers.length <= 1) return;
  policyForm.value.tiers.splice(index, 1);
};

const handleSavePolicy = async () => {
  context.clearErrorMessage();
  savePolicyMutation.reset();
  try {
    if (selectedSkuId.value === null) {
      throw new Error(t("adminCommerceProducts.selectSkuHint"));
    }
    await savePolicyMutation.mutateAsync({
      skuId: selectedSkuId.value,
      input: buildPolicyInput(policyForm.value, buildLabels()),
    });
  } catch (error) {
    context.setErrorMessage(error instanceof Error ? error.message : t("common.operationFailed"));
  }
};
</script>
