<template>
  <div class="pm-form-stack">
    <section class="pm-editor-section">
      <h3 class="pm-section-title">{{ t("adminCommerceProducts.basicInfoTitle") }}</h3>
      <div class="pm-grid">
        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.spuNameLabel") }}</span>
          <input v-model="spuForm.name" class="pm-field-input" type="text" />
        </label>

        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.productTypeLabel") }}</span>
          <select v-model="spuForm.productType" class="pm-field-input">
            <option value="RENTAL">RENTAL</option>
            <option value="RIDE_HAILING">RIDE_HAILING</option>
          </select>
        </label>

        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.statusLabel") }}</span>
          <select v-model="spuForm.status" class="pm-field-input">
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>
      </div>
    </section>

    <section class="pm-editor-section">
      <h3 class="pm-section-title">{{ t("adminCommerceProducts.salesPolicyLabel") }}</h3>
      <div class="pm-grid">
        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.quantityPolicyLabel") }}</span>
          <select v-model="spuForm.quantityPolicyType" class="pm-field-input">
            <option value="FIXED">{{ t("adminCommerceProducts.quantityPolicyFixed") }}</option>
            <option value="PER_PARTICIPANT">{{ t("adminCommerceProducts.quantityPolicyPerParticipant") }}</option>
            <option value="USER_SELECTED">{{ t("adminCommerceProducts.quantityPolicyUserSelected") }}</option>
          </select>
        </label>

        <label v-if="spuForm.quantityPolicyType === 'FIXED'" class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.fixedQuantityLabel") }}</span>
          <input v-model.number="spuForm.fixedQuantity" class="pm-field-input" type="number" min="1" />
        </label>

        <template v-if="spuForm.quantityPolicyType === 'USER_SELECTED'">
          <label class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.minQuantityLabel") }}</span>
            <input v-model.number="spuForm.userSelectedMin" class="pm-field-input" type="number" min="0" />
          </label>
          <label class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.maxQuantityLabel") }}</span>
            <input v-model.number="spuForm.userSelectedMax" class="pm-field-input" type="number" min="1" />
          </label>
        </template>
      </div>
    </section>

    <section class="pm-editor-section">
      <h3 class="pm-section-title">{{ t("adminCommerceProducts.servicePolicyLabel") }}</h3>
      <div v-if="spuForm.productType === 'RENTAL'" class="pm-grid">
        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.serviceRentalLeadTimeLabel") }}</span>
          <input
            v-model.number="spuForm.rentalBookingLeadTimeMinutes"
            class="pm-field-input"
            type="number"
            min="0"
          />
        </label>
        <div class="pm-toggle-grid pm-field--full">
          <ToggleSwitch
            v-model="spuForm.rentalRequiresContactPhone"
            :label="t('adminCommerceProducts.requiresContactPhoneLabel')"
          />
          <ToggleSwitch
            v-model="spuForm.rentalRequiresRealName"
            :label="t('adminCommerceProducts.requiresRealNameLabel')"
          />
          <ToggleSwitch
            v-model="spuForm.rentalRequiresNationalId"
            :label="t('adminCommerceProducts.requiresNationalIdLabel')"
          />
        </div>
      </div>
      <p v-else class="pm-hint">{{ t("adminCommerceProducts.rideHailingServicePolicyHint") }}</p>
    </section>

    <section class="pm-editor-section">
      <div class="pm-section-header">
        <h3 class="pm-section-title">{{ t("adminCommerceProducts.pricingPolicyLabel") }}</h3>
        <Button appearance="pill" tone="outline" size="sm" type="button" @click="addSpuPricingRule">
          <template #leading>
            <span class="i-mdi-plus" />
          </template>
          {{ t("adminCommerceProducts.pricingRuleAddAction") }}
        </Button>
      </div>
      <p v-if="spuForm.pricingRules.length === 0" class="pm-hint">
        {{ t("adminCommerceProducts.emptyPricingRules") }}
      </p>
      <article
        v-for="(rule, index) in spuForm.pricingRules"
        :key="rule.draftId"
        class="pm-repeated-item"
      >
        <div class="pm-section-header">
          <strong>{{ t("adminCommerceProducts.pricingRuleTitle", { index: index + 1 }) }}</strong>
          <Button appearance="pill" tone="danger" size="sm" type="button" @click="removeSpuPricingRule(index)">
            <template #leading>
              <span class="i-mdi-delete-outline" />
            </template>
            {{ t("adminCommerceProducts.removeItemAction") }}
          </Button>
        </div>
        <div class="pm-grid">
          <label class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.pricingRuleIdLabel") }}</span>
            <input v-model.number="rule.id" class="pm-field-input" type="number" />
          </label>
          <label class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.pricingRuleLabelLabel") }}</span>
            <input v-model="rule.label" class="pm-field-input" type="text" />
          </label>
          <label class="pm-field pm-field--full">
            <span class="pm-field-label">{{ t("adminCommerceProducts.pricingRuleDescriptionLabel") }}</span>
            <input v-model="rule.description" class="pm-field-input" type="text" />
          </label>
          <label class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.pricingRuleConditionLabel") }}</span>
            <select v-model="rule.conditionMode" class="pm-field-input">
              <option value="ALWAYS">{{ t("adminCommerceProducts.pricingRuleConditionAlways") }}</option>
              <option value="PRESERVE" :disabled="rule.conditionRule === null">
                {{ t("adminCommerceProducts.pricingRuleConditionCustom") }}
              </option>
            </select>
          </label>
          <p v-if="rule.conditionMode === 'PRESERVE'" class="pm-hint pm-field--full">
            {{ t("adminCommerceProducts.pricingRuleCustomConditionHint") }}
          </p>
          <label class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.pricingRuleActionLabel") }}</span>
            <select v-model="rule.actionType" class="pm-field-input">
              <option value="MINUS">{{ t("adminCommerceProducts.pricingRuleActionMinus") }}</option>
              <option value="RATIO">{{ t("adminCommerceProducts.pricingRuleActionRatio") }}</option>
              <option value="RESET">{{ t("adminCommerceProducts.pricingRuleActionReset") }}</option>
            </select>
          </label>
          <label v-if="rule.actionType === 'MINUS'" class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.amountFenLabel") }}</span>
            <input v-model.number="rule.amountFen" class="pm-field-input" type="number" />
          </label>
          <label v-if="rule.actionType === 'RATIO'" class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.ratioBpsLabel") }}</span>
            <input v-model.number="rule.ratioBps" class="pm-field-input" type="number" min="0" />
          </label>
          <template v-if="rule.actionType === 'RESET'">
            <label class="pm-field">
              <span class="pm-field-label">{{ t("adminCommerceProducts.pricingModelTypeLabel") }}</span>
              <select v-model="rule.resetPricingModelMode" class="pm-field-input">
                <option value="FIXED_TOTAL">{{ t("adminCommerceProducts.pricingModelFixed") }}</option>
                <option v-if="rule.resetPricingModel !== null" value="PRESERVE">
                  {{ t("adminCommerceProducts.pricingModelDynamicPreserved") }}
                </option>
              </select>
            </label>
            <label v-if="rule.resetPricingModelMode === 'FIXED_TOTAL'" class="pm-field">
              <span class="pm-field-label">{{ t("adminCommerceProducts.resetAmountFenLabel") }}</span>
              <input v-model.number="rule.resetAmountFen" class="pm-field-input" type="number" min="0" />
            </label>
            <p v-else class="pm-hint pm-field--full">
              {{ t("adminCommerceProducts.dynamicPricingPreservedHint") }}
            </p>
          </template>
          <label class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.targetSkuIdLabel") }}</span>
            <input v-model="rule.targetSkuIdText" class="pm-field-input" type="text" />
          </label>
          <ToggleSwitch
            v-model="rule.continue"
            :label="t('adminCommerceProducts.continueRuleLabel')"
          />
        </div>
      </article>
    </section>

    <section class="pm-editor-section">
      <h3 class="pm-section-title">{{ t("adminCommerceProducts.presentationLabel") }}</h3>
      <StringListEditor
        v-model="spuForm.heroImageAssetIds"
        :title="t('adminCommerceProducts.heroImageAssetsLabel')"
        :add-label="t('adminCommerceProducts.addItemAction')"
        :remove-label="t('adminCommerceProducts.removeItemAction')"
      />
      <StringListEditor
        v-model="spuForm.detailImageAssetIds"
        :title="t('adminCommerceProducts.detailImageAssetsLabel')"
        :add-label="t('adminCommerceProducts.addItemAction')"
        :remove-label="t('adminCommerceProducts.removeItemAction')"
      />
      <StringListEditor
        v-model="spuForm.sellingPoints"
        :title="t('adminCommerceProducts.sellingPointsLabel')"
        :add-label="t('adminCommerceProducts.addItemAction')"
        :remove-label="t('adminCommerceProducts.removeItemAction')"
      />

      <div class="pm-section-header">
        <h4 class="pm-subsection-title">{{ t("adminCommerceProducts.parameterGroupsLabel") }}</h4>
        <Button appearance="pill" tone="outline" size="sm" type="button" @click="addParameterGroup">
          <template #leading>
            <span class="i-mdi-plus" />
          </template>
          {{ t("adminCommerceProducts.addParameterGroupAction") }}
        </Button>
      </div>
      <p v-if="spuForm.parameterGroups.length === 0" class="pm-hint">
        {{ t("adminCommerceProducts.emptyListPlaceholder") }}
      </p>
      <article
        v-for="(group, groupIndex) in spuForm.parameterGroups"
        :key="group.id"
        class="pm-repeated-item"
      >
        <div class="pm-section-header">
          <strong>{{ t("adminCommerceProducts.parameterGroupTitle", { index: groupIndex + 1 }) }}</strong>
          <Button appearance="pill" tone="danger" size="sm" type="button" @click="removeParameterGroup(groupIndex)">
            <template #leading>
              <span class="i-mdi-delete-outline" />
            </template>
            {{ t("adminCommerceProducts.removeItemAction") }}
          </Button>
        </div>
        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.groupTitleLabel") }}</span>
          <input v-model="group.title" class="pm-field-input" type="text" />
        </label>
        <div class="pm-section-header">
          <span class="pm-field-label">{{ t("adminCommerceProducts.parameterItemsLabel") }}</span>
          <Button appearance="pill" tone="outline" size="sm" type="button" @click="addParameterItem(groupIndex)">
            <template #leading>
              <span class="i-mdi-plus" />
            </template>
            {{ t("adminCommerceProducts.addParameterItemAction") }}
          </Button>
        </div>
        <div
          v-for="(item, itemIndex) in group.items"
          :key="item.id"
          class="pm-inline-row"
        >
          <label class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.parameterLabelLabel") }}</span>
            <input v-model="item.label" class="pm-field-input" type="text" />
          </label>
          <label class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.parameterValueLabel") }}</span>
            <input v-model="item.value" class="pm-field-input" type="text" />
          </label>
          <Button appearance="pill" tone="danger" size="sm" type="button" @click="removeParameterItem(groupIndex, itemIndex)">
            <template #leading>
              <span class="i-mdi-close" />
            </template>
            {{ t("adminCommerceProducts.removeItemAction") }}
          </Button>
        </div>
      </article>

      <div class="pm-section-header">
        <h4 class="pm-subsection-title">{{ t("adminCommerceProducts.noticeBlocksLabel") }}</h4>
        <Button appearance="pill" tone="outline" size="sm" type="button" @click="addNoticeBlock">
          <template #leading>
            <span class="i-mdi-plus" />
          </template>
          {{ t("adminCommerceProducts.addNoticeBlockAction") }}
        </Button>
      </div>
      <p v-if="spuForm.noticeBlocks.length === 0" class="pm-hint">
        {{ t("adminCommerceProducts.emptyListPlaceholder") }}
      </p>
      <article
        v-for="(notice, index) in spuForm.noticeBlocks"
        :key="notice.id"
        class="pm-repeated-item"
      >
        <div class="pm-section-header">
          <strong>{{ t("adminCommerceProducts.noticeBlockTitle", { index: index + 1 }) }}</strong>
          <Button appearance="pill" tone="danger" size="sm" type="button" @click="removeNoticeBlock(index)">
            <template #leading>
              <span class="i-mdi-delete-outline" />
            </template>
            {{ t("adminCommerceProducts.removeItemAction") }}
          </Button>
        </div>
        <div class="pm-grid">
          <label class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.noticeTitleLabel") }}</span>
            <input v-model="notice.title" class="pm-field-input" type="text" />
          </label>
          <label class="pm-field pm-field--full">
            <span class="pm-field-label">{{ t("adminCommerceProducts.noticeContentLabel") }}</span>
            <textarea v-model="notice.content" class="pm-field-input pm-field-textarea"></textarea>
          </label>
        </div>
      </article>
    </section>

    <section class="pm-editor-section">
      <div class="pm-section-header">
        <h3 class="pm-section-title">{{ t("adminCommerceProducts.factsLabel") }}</h3>
        <Button appearance="pill" tone="outline" size="sm" type="button" @click="addSpuFact">
          <template #leading>
            <span class="i-mdi-plus" />
          </template>
          {{ t("adminCommerceProducts.addFactAction") }}
        </Button>
      </div>
      <p v-if="spuForm.facts.length === 0" class="pm-hint">
        {{ t("adminCommerceProducts.emptyListPlaceholder") }}
      </p>
      <FactEntryEditor
        v-for="(fact, index) in spuForm.facts"
        :key="fact.id"
        v-model="spuForm.facts[index]"
        :remove-label="t('adminCommerceProducts.removeItemAction')"
        @remove="removeSpuFact(index)"
      />
    </section>

    <div class="pm-inline-actions">
      <Button size="sm" type="button" :disabled="isSavingSpu" @click="handleSaveSpu">
        {{ isSavingSpu ? t("adminCommerceProducts.savingAction") : t("adminCommerceProducts.saveSpuAction") }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  buildSpuInput,
  createFactDraft,
  createNoticeBlockDraft,
  createParameterGroupDraft,
  createParameterItemDraft,
  createPricingRuleDraft,
  emptySpuInput,
  toSpuForm,
  type SpuBuildLabels,
  type SpuEditorForm,
} from "@/domains/admin-commerce/model/product-management/spuEditorModel";
import type { AdminProductSpuInput } from "@/domains/admin-commerce/queries/useAdminCommerce";
import {
  useCreateAdminProductSpu,
  useUpdateAdminProductSpu,
} from "@/domains/admin-commerce/queries/useAdminCommerce";
import { useAdminCommerceProductManagementContext } from "@/domains/admin-commerce/ui/product-management/productManagementContext";
import FactEntryEditor from "@/domains/admin-commerce/ui/product-management/composites/FactEntryEditor.vue";
import StringListEditor from "@/domains/admin-commerce/ui/product-management/composites/StringListEditor.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ToggleSwitch from "@/shared/ui/forms/ToggleSwitch.vue";
import "@/domains/admin-commerce/ui/product-management/product-management.scss";

const { t } = useI18n();
const context = useAdminCommerceProductManagementContext();
const createSpuMutation = useCreateAdminProductSpu();
const updateSpuMutation = useUpdateAdminProductSpu();

const spuForm = ref<SpuEditorForm>(toSpuForm(emptySpuInput()));
const selectedProduct = computed(() => context.selectedProduct.value);
const selectedSpuId = computed(() => context.selectedSpuId.value);
const isCreatingSpu = computed(() => context.isCreatingSpu.value);
const isSavingSpu = computed(
  () => createSpuMutation.isPending.value || updateSpuMutation.isPending.value,
);

const resolveSelectedSpuInput = (
  product: NonNullable<typeof selectedProduct.value>,
): AdminProductSpuInput => ({
  name: product.spu.name,
  productType: product.spu.productType,
  status: product.spu.status,
  salesPolicy: product.spu.salesPolicy,
  servicePolicy: product.spu.servicePolicy,
  pricingRules: product.spu.pricingPolicy.rules,
  presentation: product.spu.presentation,
  facts: product.spu.facts,
});

watch(
  [selectedProduct, isCreatingSpu],
  ([product, creating]) => {
    spuForm.value = toSpuForm(
      creating || !product ? emptySpuInput() : resolveSelectedSpuInput(product),
    );
  },
  { immediate: true },
);

const buildLabels = (): SpuBuildLabels => ({
  quantityRangeError: t("adminCommerceProducts.quantityRangeError"),
  fixedQuantityLabel: t("adminCommerceProducts.fixedQuantityLabel"),
  minQuantityLabel: t("adminCommerceProducts.minQuantityLabel"),
  maxQuantityLabel: t("adminCommerceProducts.maxQuantityLabel"),
  serviceRentalLeadTimeLabel: t("adminCommerceProducts.serviceRentalLeadTimeLabel"),
  pricingRuleIdLabel: t("adminCommerceProducts.pricingRuleIdLabel"),
  targetSkuIdLabel: t("adminCommerceProducts.targetSkuIdLabel"),
  amountFenLabel: t("adminCommerceProducts.amountFenLabel"),
  ratioBpsLabel: t("adminCommerceProducts.ratioBpsLabel"),
  resetAmountFenLabel: t("adminCommerceProducts.resetAmountFenLabel"),
  factsLabel: t("adminCommerceProducts.factsLabel"),
  factKeyLabel: t("adminCommerceProducts.factKeyLabel"),
});

const addSpuPricingRule = () => {
  spuForm.value.pricingRules.push(createPricingRuleDraft(spuForm.value.pricingRules));
};

const removeSpuPricingRule = (index: number) => {
  spuForm.value.pricingRules.splice(index, 1);
};

const addParameterGroup = () => {
  spuForm.value.parameterGroups.push(createParameterGroupDraft());
};

const removeParameterGroup = (index: number) => {
  spuForm.value.parameterGroups.splice(index, 1);
};

const addParameterItem = (groupIndex: number) => {
  spuForm.value.parameterGroups[groupIndex]?.items.push(createParameterItemDraft());
};

const removeParameterItem = (groupIndex: number, itemIndex: number) => {
  spuForm.value.parameterGroups[groupIndex]?.items.splice(itemIndex, 1);
};

const addNoticeBlock = () => {
  spuForm.value.noticeBlocks.push(createNoticeBlockDraft());
};

const removeNoticeBlock = (index: number) => {
  spuForm.value.noticeBlocks.splice(index, 1);
};

const addSpuFact = () => {
  spuForm.value.facts.push(createFactDraft());
};

const removeSpuFact = (index: number) => {
  spuForm.value.facts.splice(index, 1);
};

const handleSaveSpu = async () => {
  context.clearErrorMessage();
  createSpuMutation.reset();
  updateSpuMutation.reset();
  try {
    const input = buildSpuInput(spuForm.value, buildLabels());
    if (isCreatingSpu.value) {
      const result = await createSpuMutation.mutateAsync(input);
      context.completeSpuCreate(result.id);
      return;
    }
    if (selectedSpuId.value === null) {
      throw new Error(t("adminCommerceProducts.selectSpuHint"));
    }
    await updateSpuMutation.mutateAsync({ spuId: selectedSpuId.value, input });
  } catch (error) {
    context.setErrorMessage(
      error instanceof Error ? error.message : t("common.operationFailed"),
    );
  }
};
</script>
