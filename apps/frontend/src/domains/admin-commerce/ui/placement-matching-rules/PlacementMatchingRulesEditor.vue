<template>
  <JsonLogicRuleEditor
    v-model="rule"
    :fields="placementMatchingRuleFields"
    :title="t('adminCommercePlacementOffer.matchingRuleLabel')"
    :description="t('adminCommercePlacementOffer.matchingRuleHint')"
    allow-custom-fields
    force-value-input
  />
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { placementMatchingRuleFields } from "@/domains/admin-commerce/model/placement-matching-rules/placementMatchingRuleEditorModel";
import type { JsonLogicRuleDraft } from "@/domains/admin-commerce/model/json-logic/jsonLogicRuleEditorModel";
import JsonLogicRuleEditor from "@/domains/admin-commerce/ui/json-logic/JsonLogicRuleEditor.vue";

const rule = defineModel<JsonLogicRuleDraft>({ required: true });
const { t } = useI18n();
</script>
