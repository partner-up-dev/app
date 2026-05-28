<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #actions>
      <Button appearance="pill" tone="outline" size="sm" type="button" @click="prepareNewSpu">
        {{ t("adminCommerceProducts.newSpuAction") }}
      </Button>
      <Button
        appearance="pill"
        tone="outline"
        size="sm"
        type="button"
        :disabled="selectedSpuId === null"
        @click="prepareNewSku"
      >
        {{ t("adminCommerceProducts.newSkuAction") }}
      </Button>
    </template>

    <template #rail>
      <AdminRailPanel :title="t('adminCommerceProducts.spusTitle')">
        <div v-if="products.length === 0" class="hint">
          {{ t("adminCommerceProducts.emptyProducts") }}
        </div>
        <div v-else class="selection-list">
          <ChoiceCard
            v-for="product in products"
            :key="product.spu.id"
            :active="selectedSpuId === product.spu.id && !isCreatingSpu"
            @click="selectSpu(product.spu.id)"
          >
            <span>{{ product.spu.name }}</span>
            <small>{{ product.spu.productType }} · {{ product.spu.status }}</small>
          </ChoiceCard>
        </div>
      </AdminRailPanel>

      <AdminRailPanel
        v-if="selectedProduct"
        :title="t('adminCommerceProducts.skusTitle')"
      >
        <div v-if="selectedProduct.skus.length === 0" class="hint">
          {{ t("adminCommerceProducts.emptySkus") }}
        </div>
        <div v-else class="selection-list">
          <ChoiceCard
            v-for="record in selectedProduct.skus"
            :key="record.sku.id"
            :active="selectedSkuId === record.sku.id && !isCreatingSku"
            @click="selectSku(record.sku.id)"
          >
            <span>{{ record.sku.name }}</span>
            <small>#{{ record.sku.sortOrder }} · {{ record.sku.status }}</small>
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
            :title="isCreatingSpu ? t('adminCommerceProducts.createSpuTitle') : t('adminCommerceProducts.editSpuTitle')"
            :description="t('adminCommerceProducts.spuHint')"
            span="full"
          >
            <div class="form-stack">
              <label class="field">
                <span class="field-label">{{ t("adminCommerceProducts.spuNameLabel") }}</span>
                <input v-model="spuForm.name" class="text-input" type="text" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommerceProducts.productTypeLabel") }}</span>
                <select v-model="spuForm.productType" class="text-input">
                  <option value="RENTAL">RENTAL</option>
                  <option value="RIDE_HAILING">RIDE_HAILING</option>
                </select>
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommerceProducts.statusLabel") }}</span>
                <select v-model="spuForm.status" class="text-input">
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommerceProducts.salesPolicyLabel") }}</span>
                <textarea v-model="spuForm.salesPolicyText" class="json-textarea" rows="8"></textarea>
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommerceProducts.servicePolicyLabel") }}</span>
                <textarea v-model="spuForm.servicePolicyText" class="json-textarea" rows="8"></textarea>
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommerceProducts.pricingPolicyLabel") }}</span>
                <textarea v-model="spuForm.pricingRulesText" class="json-textarea" rows="10"></textarea>
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommerceProducts.presentationLabel") }}</span>
                <textarea v-model="spuForm.presentationText" class="json-textarea" rows="12"></textarea>
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommerceProducts.factsLabel") }}</span>
                <textarea v-model="spuForm.factsText" class="json-textarea" rows="8"></textarea>
              </label>

              <div class="inline-actions">
                <Button size="sm" type="button" :disabled="isSavingSpu" @click="handleSaveSpu">
                  {{ isSavingSpu ? t("adminCommerceProducts.savingAction") : t("adminCommerceProducts.saveSpuAction") }}
                </Button>
              </div>
            </div>
          </BentoItem>

          <BentoItem
            :title="isCreatingSku ? t('adminCommerceProducts.createSkuTitle') : t('adminCommerceProducts.editSkuTitle')"
            :description="t('adminCommerceProducts.skuHint')"
            span="full"
          >
            <div v-if="selectedSpuId === null && !isCreatingSku" class="hint">
              {{ t("adminCommerceProducts.selectSpuHint") }}
            </div>
            <div v-else class="form-stack">
              <label class="field">
                <span class="field-label">{{ t("adminCommerceProducts.skuNameLabel") }}</span>
                <input v-model="skuForm.name" class="text-input" type="text" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommerceProducts.statusLabel") }}</span>
                <select v-model="skuForm.status" class="text-input">
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommerceProducts.sortOrderLabel") }}</span>
                <input v-model.number="skuForm.sortOrder" class="text-input" type="number" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommerceProducts.skuFactsLabel") }}</span>
                <textarea v-model="skuForm.factsText" class="json-textarea" rows="8"></textarea>
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommerceProducts.pricingModelLabel") }}</span>
                <textarea v-model="skuForm.pricingModelText" class="json-textarea" rows="8"></textarea>
              </label>

              <div class="inline-actions">
                <Button
                  size="sm"
                  type="button"
                  :disabled="isSavingSku || selectedSpuId === null"
                  @click="handleSaveSku"
                >
                  {{ isSavingSku ? t("adminCommerceProducts.savingAction") : t("adminCommerceProducts.saveSkuAction") }}
                </Button>
              </div>
            </div>
          </BentoItem>

          <BentoItem
            :title="t('adminCommerceProducts.cancellationPolicyTitle')"
            :description="t('adminCommerceProducts.cancellationPolicyHint')"
            span="full"
          >
            <div v-if="selectedSkuId === null" class="hint">
              {{ t("adminCommerceProducts.selectSkuHint") }}
            </div>
            <div v-else class="form-stack">
              <label class="field">
                <span class="field-label">{{ t("adminCommerceProducts.operatorBufferMinutesLabel") }}</span>
                <input
                  v-model.number="policyForm.operatorBufferMinutes"
                  class="text-input"
                  type="number"
                />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminCommerceProducts.cancellationTiersLabel") }}</span>
                <textarea v-model="policyForm.tiersText" class="json-textarea" rows="12"></textarea>
              </label>

              <div class="inline-actions">
                <Button size="sm" type="button" :disabled="isSavingPolicy" @click="handleSavePolicy">
                  {{ isSavingPolicy ? t("adminCommerceProducts.savingAction") : t("adminCommerceProducts.savePolicyAction") }}
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
  type AdminProductSkuInput,
  type AdminProductSpuInput,
  type AdminSkuCancellationPolicyInput,
  useAdminCommerceProductWorkspace,
  useCreateAdminProductSku,
  useCreateAdminProductSpu,
  useSaveAdminSkuCancellationPolicy,
  useUpdateAdminProductSku,
  useUpdateAdminProductSpu,
} from "@/domains/admin-commerce/queries/useAdminCommerce";
import { parseJsonText, prettyJson } from "@/domains/admin-commerce/editor-json";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";

type ProductWorkspace = NonNullable<
  ReturnType<typeof useAdminCommerceProductWorkspace>["data"]["value"]
>;
type ProductRecord = ProductWorkspace["products"][number];
type SkuRecord = ProductRecord["skus"][number];

const emptySpuInput = (): AdminProductSpuInput => ({
  name: "",
  productType: "RENTAL",
  status: "DRAFT",
  salesPolicy: {
    skuSelectionPolicy: { type: "EXACTLY_ONE" },
    quantityPolicy: { type: "FIXED", quantity: 1 },
  },
  servicePolicy: {
    type: "RENTAL",
    bookingLeadTimeMinutes: 1440,
    requiresContactPhone: true,
    requiresRealName: true,
    requiresNationalId: false,
  },
  pricingRules: [],
  presentation: {
    heroImageAssetIds: [],
    detailImageAssetIds: [],
    sellingPoints: [],
    parameterGroups: [],
    noticeBlocks: [],
  },
  facts: {},
});

const emptySkuInput = (): Omit<AdminProductSkuInput, "spuId"> => ({
  name: "",
  status: "DRAFT",
  sortOrder: 0,
  facts: {
    type: "RENTAL",
    zoneCode: "",
    participantCount: 2,
    durationMinutes: 180,
  },
  pricingModel: {
    type: "FIXED_TOTAL",
    amountFen: 0,
  },
  cancellationPolicyRef: null,
});

const emptyPolicyInput = (): AdminSkuCancellationPolicyInput => ({
  operatorBufferMinutes: 30,
  tiers: [
    {
      code: "DEFAULT",
      fromMinutesBeforeStart: null,
      untilMinutesBeforeStart: null,
      refundPercent: 100,
      requiresOperatorHandling: false,
      visibleLabel: "默认全额退款",
    },
  ],
});

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminCommerceProductWorkspace(isAdmin);
const createSpuMutation = useCreateAdminProductSpu();
const updateSpuMutation = useUpdateAdminProductSpu();
const createSkuMutation = useCreateAdminProductSku();
const updateSkuMutation = useUpdateAdminProductSku();
const savePolicyMutation = useSaveAdminSkuCancellationPolicy();

const selectedSpuIdRaw = ref("");
const selectedSkuIdRaw = ref("");
const isCreatingSpu = ref(false);
const isCreatingSku = ref(false);
const localErrorMessage = ref<string | null>(null);

const spuForm = ref({
  name: "",
  productType: "RENTAL" as AdminProductSpuInput["productType"],
  status: "DRAFT" as AdminProductSpuInput["status"],
  salesPolicyText: prettyJson(emptySpuInput().salesPolicy),
  servicePolicyText: prettyJson(emptySpuInput().servicePolicy),
  pricingRulesText: prettyJson(emptySpuInput().pricingRules),
  presentationText: prettyJson(emptySpuInput().presentation),
  factsText: prettyJson(emptySpuInput().facts),
});

const skuForm = ref({
  name: "",
  status: "DRAFT" as AdminProductSkuInput["status"],
  sortOrder: 0,
  factsText: prettyJson(emptySkuInput().facts),
  pricingModelText: prettyJson(emptySkuInput().pricingModel),
});

const policyForm = ref({
  operatorBufferMinutes: 30,
  tiersText: prettyJson(emptyPolicyInput().tiers),
});

const products = computed(() => workspaceQuery.data.value?.products ?? []);
const selectedSpuId = computed<number | null>(() => {
  const parsed = Number(selectedSpuIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});
const selectedSkuId = computed<number | null>(() => {
  const parsed = Number(selectedSkuIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});

const selectedProduct = computed<ProductRecord | null>(
  () => products.value.find((product) => product.spu.id === selectedSpuId.value) ?? null,
);

const selectedSkuRecord = computed<SkuRecord | null>(
  () =>
    selectedProduct.value?.skus.find((record) => record.sku.id === selectedSkuId.value) ??
    null,
);

const isSavingSpu = computed(
  () => createSpuMutation.isPending.value || updateSpuMutation.isPending.value,
);
const isSavingSku = computed(
  () => createSkuMutation.isPending.value || updateSkuMutation.isPending.value,
);
const isSavingPolicy = computed(() => savePolicyMutation.isPending.value);

const pageErrorMessage = computed(
  () =>
    localErrorMessage.value ||
    createSpuMutation.error.value?.message ||
    updateSpuMutation.error.value?.message ||
    createSkuMutation.error.value?.message ||
    updateSkuMutation.error.value?.message ||
    savePolicyMutation.error.value?.message ||
    null,
);

watch(
  products,
  (nextProducts) => {
    if (nextProducts.length === 0) {
      selectedSpuIdRaw.value = "";
      selectedSkuIdRaw.value = "";
      return;
    }

    if (!nextProducts.some((product) => String(product.spu.id) === selectedSpuIdRaw.value)) {
      selectedSpuIdRaw.value = String(nextProducts[0]!.spu.id);
      isCreatingSpu.value = false;
    }
  },
  { immediate: true },
);

watch(
  [selectedProduct, isCreatingSpu],
  ([product, creating]) => {
    if (creating || !product) {
      const empty = emptySpuInput();
      spuForm.value = {
        name: empty.name,
        productType: empty.productType,
        status: empty.status,
        salesPolicyText: prettyJson(empty.salesPolicy),
        servicePolicyText: prettyJson(empty.servicePolicy),
        pricingRulesText: prettyJson(empty.pricingRules),
        presentationText: prettyJson(empty.presentation),
        factsText: prettyJson(empty.facts),
      };
      return;
    }

    spuForm.value = {
      name: product.spu.name,
      productType: product.spu.productType,
      status: product.spu.status,
      salesPolicyText: prettyJson(product.spu.salesPolicy),
      servicePolicyText: prettyJson(product.spu.servicePolicy),
      pricingRulesText: prettyJson(product.spu.pricingPolicy.rules),
      presentationText: prettyJson(product.spu.presentation),
      factsText: prettyJson(product.spu.facts),
    };
  },
  { immediate: true },
);

watch(
  [selectedProduct, isCreatingSku],
  ([product, creating]) => {
    if (!product) {
      selectedSkuIdRaw.value = "";
      return;
    }

    if (
      !creating &&
      !product.skus.some((record) => String(record.sku.id) === selectedSkuIdRaw.value)
    ) {
      selectedSkuIdRaw.value = product.skus[0] ? String(product.skus[0].sku.id) : "";
    }
  },
  { immediate: true },
);

watch(
  [selectedSkuRecord, isCreatingSku],
  ([record, creating]) => {
    if (creating || !record) {
      const empty = emptySkuInput();
      skuForm.value = {
        name: empty.name,
        status: empty.status,
        sortOrder: empty.sortOrder,
        factsText: prettyJson(empty.facts),
        pricingModelText: prettyJson(empty.pricingModel),
      };
      const emptyPolicy = emptyPolicyInput();
      policyForm.value = {
        operatorBufferMinutes: emptyPolicy.operatorBufferMinutes,
        tiersText: prettyJson(emptyPolicy.tiers),
      };
      return;
    }

    skuForm.value = {
      name: record.sku.name,
      status: record.sku.status,
      sortOrder: record.sku.sortOrder,
      factsText: prettyJson(record.sku.facts),
      pricingModelText: prettyJson(record.sku.pricingModel),
    };

    policyForm.value = {
      operatorBufferMinutes: record.cancellationPolicy?.operatorBufferMinutes ?? 30,
      tiersText: prettyJson(record.cancellationPolicy?.tiers ?? emptyPolicyInput().tiers),
    };
  },
  { immediate: true },
);

const selectSpu = (spuId: number) => {
  selectedSpuIdRaw.value = String(spuId);
  isCreatingSpu.value = false;
  isCreatingSku.value = false;
};

const selectSku = (skuId: number) => {
  selectedSkuIdRaw.value = String(skuId);
  isCreatingSku.value = false;
};

const prepareNewSpu = () => {
  isCreatingSpu.value = true;
  isCreatingSku.value = false;
  selectedSkuIdRaw.value = "";
};

const prepareNewSku = () => {
  if (selectedSpuId.value === null) {
    localErrorMessage.value = t("adminCommerceProducts.selectSpuHint");
    return;
  }
  isCreatingSku.value = true;
  selectedSkuIdRaw.value = "";
};

const buildSpuInput = (): AdminProductSpuInput => ({
  name: spuForm.value.name.trim(),
  productType: spuForm.value.productType,
  status: spuForm.value.status,
  salesPolicy: parseJsonText(spuForm.value.salesPolicyText, t("adminCommerceProducts.salesPolicyLabel")),
  servicePolicy: parseJsonText(spuForm.value.servicePolicyText, t("adminCommerceProducts.servicePolicyLabel")),
  pricingRules: parseJsonText(spuForm.value.pricingRulesText, t("adminCommerceProducts.pricingPolicyLabel")),
  presentation: parseJsonText(spuForm.value.presentationText, t("adminCommerceProducts.presentationLabel")),
  facts: parseJsonText(spuForm.value.factsText, t("adminCommerceProducts.factsLabel")),
});

const buildSkuInput = (): Omit<AdminProductSkuInput, "spuId"> => ({
  name: skuForm.value.name.trim(),
  status: skuForm.value.status,
  sortOrder: skuForm.value.sortOrder,
  facts: parseJsonText(skuForm.value.factsText, t("adminCommerceProducts.skuFactsLabel")),
  pricingModel: parseJsonText(
    skuForm.value.pricingModelText,
    t("adminCommerceProducts.pricingModelLabel"),
  ),
  cancellationPolicyRef: selectedSkuRecord.value?.sku.cancellationPolicyRef ?? null,
});

const handleSaveSpu = async () => {
  localErrorMessage.value = null;
  try {
    const input = buildSpuInput();
    if (isCreatingSpu.value) {
      const result = await createSpuMutation.mutateAsync(input);
      selectedSpuIdRaw.value = String(result.id);
      isCreatingSpu.value = false;
      return;
    }
    if (selectedSpuId.value === null) {
      throw new Error(t("adminCommerceProducts.selectSpuHint"));
    }
    await updateSpuMutation.mutateAsync({ spuId: selectedSpuId.value, input });
  } catch (error) {
    localErrorMessage.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};

const handleSaveSku = async () => {
  localErrorMessage.value = null;
  try {
    if (selectedSpuId.value === null) {
      throw new Error(t("adminCommerceProducts.selectSpuHint"));
    }
    const input = buildSkuInput();
    if (isCreatingSku.value) {
      const result = await createSkuMutation.mutateAsync({
        spuId: selectedSpuId.value,
        ...input,
      });
      selectedSkuIdRaw.value = String(result.id);
      isCreatingSku.value = false;
      return;
    }
    if (selectedSkuId.value === null) {
      throw new Error(t("adminCommerceProducts.selectSkuHint"));
    }
    await updateSkuMutation.mutateAsync({ skuId: selectedSkuId.value, input });
  } catch (error) {
    localErrorMessage.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};

const handleSavePolicy = async () => {
  localErrorMessage.value = null;
  try {
    if (selectedSkuId.value === null) {
      throw new Error(t("adminCommerceProducts.selectSkuHint"));
    }
    await savePolicyMutation.mutateAsync({
      skuId: selectedSkuId.value,
      input: {
        operatorBufferMinutes: policyForm.value.operatorBufferMinutes,
        tiers: parseJsonText(
          policyForm.value.tiersText,
          t("adminCommerceProducts.cancellationTiersLabel"),
        ),
      },
    });
  } catch (error) {
    localErrorMessage.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};

const clearErrors = () => {
  localErrorMessage.value = null;
  createSpuMutation.reset();
  updateSpuMutation.reset();
  createSkuMutation.reset();
  updateSkuMutation.reset();
  savePolicyMutation.reset();
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
  min-height: 10rem;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.inline-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
