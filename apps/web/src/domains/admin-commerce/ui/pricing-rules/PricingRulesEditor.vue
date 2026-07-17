<template>
  <section class="pm-editor-section">
    <div class="pm-section-header">
      <h3 class="pm-section-title">{{ title }}</h3>
      <PuButton shape="pill" tone="neutral" variant="outline" size="sm" @click="addRule">
        <template #leading>
          <span class="i-mdi-plus" />
        </template>
        {{ t("adminCommerceProducts.pricingRuleAddAction") }}
      </PuButton>
    </div>
    <p v-if="rules.length === 0" class="pm-hint">
      {{ t("adminCommerceProducts.emptyPricingRules") }}
    </p>
    <article v-for="(rule, index) in rules" :key="rule.draftId" class="pm-repeated-item">
      <div class="pm-section-header">
        <strong>{{ t("adminCommerceProducts.pricingRuleTitle", { index: index + 1 }) }}</strong>
        <PuButton shape="pill" tone="danger" variant="outline" size="sm" @click="removeRule(index)">
          <template #leading>
            <span class="i-mdi-delete-outline" />
          </template>
          {{ t("adminCommerceProducts.removeItemAction") }}
        </PuButton>
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
          <span class="pm-field-label">{{
            t("adminCommerceProducts.pricingRuleDescriptionLabel")
          }}</span>
          <input v-model="rule.description" class="pm-field-input" type="text" />
        </label>
        <PricingConditionRuleEditor
          v-model="rule.conditionDraft"
          class="pm-field--full"
          :target-level="rule.targetLevel"
        />
        <label class="pm-field">
          <span class="pm-field-label">{{
            t("adminCommerceProducts.pricingRuleActionLabel")
          }}</span>
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
            <span class="pm-field-label">{{
              t("adminCommerceProducts.pricingModelTypeLabel")
            }}</span>
            <select v-model="rule.resetPricingModelMode" class="pm-field-input">
              <option value="FIXED_TOTAL">
                {{ t("adminCommerceProducts.pricingModelFixed") }}
              </option>
              <option v-if="rule.resetPricingModel !== null" value="PRESERVE">
                {{ t("adminCommerceProducts.pricingModelDynamicPreserved") }}
              </option>
            </select>
          </label>
          <label v-if="rule.resetPricingModelMode === 'FIXED_TOTAL'" class="pm-field">
            <span class="pm-field-label">{{ t("adminCommerceProducts.resetAmountFenLabel") }}</span>
            <input
              v-model.number="rule.resetAmountFen"
              class="pm-field-input"
              type="number"
              min="0"
            />
          </label>
          <p v-else class="pm-hint pm-field--full">
            {{ t("adminCommerceProducts.dynamicPricingPreservedHint") }}
          </p>
        </template>
        <label class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.targetLevelLabel") }}</span>
          <select v-model="rule.targetLevel" class="pm-field-input">
            <option value="SKU">{{ t("adminCommerceProducts.targetLevelSku") }}</option>
            <option value="SPU">{{ t("adminCommerceProducts.targetLevelSpu") }}</option>
            <option value="ORDER">{{ t("adminCommerceProducts.targetLevelOrder") }}</option>
          </select>
        </label>
        <label v-if="rule.targetLevel !== 'ORDER'" class="pm-field">
          <span class="pm-field-label">{{ t("adminCommerceProducts.targetIdLabel") }}</span>
          <input v-model="rule.targetIdText" class="pm-field-input" type="text" />
        </label>
        <PuToggleSwitch
          v-model="rule.continue"
          :label="t('adminCommerceProducts.continueRuleLabel')"
        />
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import {
  createPricingRuleDraft,
  type PricingRuleDraft,
} from "@/domains/admin-commerce/model/pricing-rules/pricingRuleEditorModel";
import PricingConditionRuleEditor from "@/domains/admin-commerce/ui/pricing-rules/PricingConditionRuleEditor.vue";
import "@/domains/admin-commerce/ui/product-management/product-management.scss";
import { PuButton, PuToggleSwitch } from "@partner-up-dev/design-web";

defineProps<{
  title: string;
}>();

const rules = defineModel<PricingRuleDraft[]>({ required: true });
const { t } = useI18n();

const addRule = () => {
  rules.value.push(createPricingRuleDraft(rules.value));
};

const removeRule = (index: number) => {
  rules.value.splice(index, 1);
};
</script>
