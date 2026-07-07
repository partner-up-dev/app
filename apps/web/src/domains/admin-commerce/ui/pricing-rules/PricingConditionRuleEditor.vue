<template>
  <JsonLogicRuleEditor
    v-model="rule"
    :fields="fields"
    :title="t('adminCommerceProducts.pricingRuleConditionLabel')"
    :description="t('adminCommerceProducts.pricingRuleConditionHint')"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  getPricingConditionRuleFields,
  type PricingRuleTargetLevel,
} from "@/domains/admin-commerce/model/pricing-rules/pricingRuleEditorModel";
import type { JsonLogicRuleDraft } from "@/domains/admin-commerce/model/json-logic/jsonLogicRuleEditorModel";
import JsonLogicRuleEditor from "@/domains/admin-commerce/ui/json-logic/JsonLogicRuleEditor.vue";

const props = defineProps<{
  targetLevel: PricingRuleTargetLevel;
}>();

const rule = defineModel<JsonLogicRuleDraft>({ required: true });
const { t } = useI18n();

const fields = computed(() => getPricingConditionRuleFields(props.targetLevel));
</script>
