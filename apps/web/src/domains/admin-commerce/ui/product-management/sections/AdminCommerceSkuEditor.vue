<template>
  <div v-if="selectedSpuId === null && !isCreatingSku" class="pm-hint">
    {{ t("adminCommerceProducts.selectSpuHint") }}
  </div>
  <div v-else class="pm-form-stack">
    <section class="pm-editor-section">
      <h3 class="pm-section-title">{{ t("adminCommerceProducts.basicInfoTitle") }}</h3>
      <div class="pm-grid">
        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.skuNameLabel") }}</span>
          <input v-model="skuForm.name" class="pm-field-input" type="text" />
        </label>

        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.statusLabel") }}</span>
          <select v-model="skuForm.status" class="pm-field-input">
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>

        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.sortOrderLabel") }}</span>
          <input v-model.number="skuForm.sortOrder" class="pm-field-input" type="number" />
        </label>
      </div>
    </section>

    <section class="pm-editor-section">
      <h3 class="pm-section-title">{{ t("adminCommerceProducts.skuFactsLabel") }}</h3>
      <div v-if="selectedProductType === 'RENTAL'" class="pm-grid">
        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.zoneCodeLabel") }}</span>
          <input v-model="skuForm.rentalZoneCode" class="pm-field-input" type="text" />
        </label>
        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.participantCountLabel") }}</span>
          <input v-model.number="skuForm.rentalParticipantCount" class="pm-field-input" type="number" min="1" />
        </label>
        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.durationMinutesLabel") }}</span>
          <input v-model.number="skuForm.rentalDurationMinutes" class="pm-field-input" type="number" min="1" />
        </label>
      </div>
      <div v-else class="pm-grid">
        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.rideProviderInstanceIdLabel") }}</span>
          <input v-model="skuForm.rideProviderInstanceId" class="pm-field-input" type="text" />
        </label>
        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.providerVehicleTypeCodeLabel") }}</span>
          <input v-model="skuForm.rideProviderVehicleTypeCode" class="pm-field-input" type="text" />
        </label>
      </div>
    </section>

    <section class="pm-editor-section">
      <h3 class="pm-section-title">{{ t("adminCommerceProducts.pricingModelLabel") }}</h3>
      <div class="pm-grid">
        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.pricingModelTypeLabel") }}</span>
          <select v-model="skuForm.pricingModelType" class="pm-field-input">
            <option value="FIXED_TOTAL">{{ t("adminCommerceProducts.pricingModelFixed") }}</option>
            <option v-if="skuForm.dynamicPricingModel !== null" value="DYNAMIC_QUOTE">
              {{ t("adminCommerceProducts.pricingModelDynamicPreserved") }}
            </option>
          </select>
        </label>
        <label v-if="skuForm.pricingModelType === 'FIXED_TOTAL'" class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.amountFenLabel") }}</span>
          <input v-model.number="skuForm.fixedAmountFen" class="pm-field-input" type="number" min="0" />
        </label>
      </div>
      <p v-if="skuForm.pricingModelType === 'DYNAMIC_QUOTE'" class="pm-hint">
        {{ t("adminCommerceProducts.dynamicPricingPreservedHint") }}
      </p>
    </section>

    <div class="pm-inline-actions">
      <PuButton
        size="sm"

        :disabled="isSavingSku || selectedSpuId === null"
        @click="handleSaveSku"
      >
        {{ isSavingSku ? t("adminCommerceProducts.savingAction") : t("adminCommerceProducts.saveSkuAction") }}
      </PuButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  buildSkuInput,
  emptySkuInput,
  toSkuForm,
  type SkuBuildLabels,
  type SkuEditorForm,
} from "@/domains/admin-commerce/model/product-management/skuEditorModel";
import {
  useCreateAdminProductSku,
  useUpdateAdminProductSku,
} from "@/domains/admin-commerce/queries/useAdminCommerce";
import { useAdminCommerceProductManagementContext } from "@/domains/admin-commerce/ui/product-management/productManagementContext";
import { PuButton } from "@partner-up-dev/design-web";
import "@/domains/admin-commerce/ui/product-management/product-management.scss";

const { t } = useI18n();
const context = useAdminCommerceProductManagementContext();
const createSkuMutation = useCreateAdminProductSku();
const updateSkuMutation = useUpdateAdminProductSku();

const skuForm = ref<SkuEditorForm>(toSkuForm(emptySkuInput()));
const selectedSpuId = computed(() => context.selectedSpuId.value);
const selectedSkuRecord = computed(() => context.selectedSkuRecord.value);
const selectedProductType = computed(() => context.selectedProductType.value);
const isCreatingSku = computed(() => context.isCreatingSku.value);
const isSavingSku = computed(
  () => createSkuMutation.isPending.value || updateSkuMutation.isPending.value,
);

watch(
  [selectedSkuRecord, isCreatingSku],
  ([record, creating]) => {
    if (creating || !record) {
      skuForm.value = toSkuForm(emptySkuInput());
      return;
    }

    skuForm.value = toSkuForm({
      name: record.sku.name,
      status: record.sku.status,
      sortOrder: record.sku.sortOrder,
      presentation: record.sku.presentation,
      facts: record.sku.facts,
      pricingModel: record.sku.pricingModel,
      cancellationPolicyRef: record.sku.cancellationPolicyRef ?? null,
    });
  },
  { immediate: true },
);

const buildLabels = (): SkuBuildLabels => ({
  sortOrderLabel: t("adminCommerceProducts.sortOrderLabel"),
  participantCountLabel: t("adminCommerceProducts.participantCountLabel"),
  durationMinutesLabel: t("adminCommerceProducts.durationMinutesLabel"),
  amountFenLabel: t("adminCommerceProducts.amountFenLabel"),
  dynamicPricingMissingError: t("adminCommerceProducts.dynamicPricingMissingError"),
});

const handleSaveSku = async () => {
  context.clearErrorMessage();
  createSkuMutation.reset();
  updateSkuMutation.reset();
  try {
    if (selectedSpuId.value === null) {
      throw new Error(t("adminCommerceProducts.selectSpuHint"));
    }
    const input = buildSkuInput(
      skuForm.value,
      selectedProductType.value,
      selectedSkuRecord.value?.sku.presentation,
      selectedSkuRecord.value?.sku.cancellationPolicyRef,
      buildLabels(),
    );
    if (isCreatingSku.value) {
      const result = await createSkuMutation.mutateAsync({
        spuId: selectedSpuId.value,
        ...input,
      });
      context.completeSkuCreate(result.id);
      return;
    }
    if (context.selectedSkuId.value === null) {
      throw new Error(t("adminCommerceProducts.selectSkuHint"));
    }
    await updateSkuMutation.mutateAsync({
      skuId: context.selectedSkuId.value,
      input,
    });
  } catch (error) {
    context.setErrorMessage(error instanceof Error ? error.message : t("common.operationFailed"));
  }
};
</script>
