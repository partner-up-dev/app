<template>
  <article class="pm-repeated-item">
    <div class="pm-grid">
      <label class="pm-field">
        <span class="pm-field-label">{{ t("adminCommerceProducts.factKeyLabel") }}</span>
        <input v-model="fact.key" class="pm-field-input" type="text" />
      </label>

      <label class="pm-field">
        <span class="pm-field-label">{{ t("adminCommerceProducts.factValueTypeLabel") }}</span>
        <select v-model="fact.valueKind" class="pm-field-input">
          <option value="string">{{ t("adminCommerceProducts.factValueString") }}</option>
          <option value="number">{{ t("adminCommerceProducts.factValueNumber") }}</option>
          <option value="boolean">{{ t("adminCommerceProducts.factValueBoolean") }}</option>
          <option value="null">{{ t("adminCommerceProducts.factValueNull") }}</option>
          <option v-if="fact.valueKind === 'preserve'" value="preserve">
            {{ t("adminCommerceProducts.factValuePreserve") }}
          </option>
        </select>
      </label>

      <label
        v-if="fact.valueKind === 'string' || fact.valueKind === 'number'"
        class="pm-field"
      >
        <span class="pm-field-label">{{ t("adminCommerceProducts.factValueLabel") }}</span>
        <input v-model="fact.valueText" class="pm-field-input" type="text" />
      </label>

      <label v-if="fact.valueKind === 'boolean'" class="pm-field">
        <span class="pm-field-label">{{ t("adminCommerceProducts.factValueLabel") }}</span>
        <select v-model="booleanText" class="pm-field-input">
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </label>

      <p v-if="fact.valueKind === 'preserve'" class="pm-hint pm-field--full">
        {{ t("adminCommerceProducts.customValuePreservedHint") }}
      </p>
    </div>

    <div class="pm-inline-actions">
      <Button appearance="pill" tone="danger" size="sm" type="button" @click="emit('remove')">
        <template #leading>
          <span class="i-mdi-delete-outline" />
        </template>
        {{ removeLabel }}
      </Button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { FactEntryDraft } from "@/domains/admin-commerce/model/product-management/spuEditorModel";
import Button from "@/shared/ui/actions/Button.vue";
import "@/domains/admin-commerce/ui/product-management/product-management.scss";

defineProps<{
  removeLabel: string;
}>();

const emit = defineEmits<{
  remove: [];
}>();

const fact = defineModel<FactEntryDraft>({ required: true });
const { t } = useI18n();

const booleanText = computed({
  get: () => (fact.value.booleanValue ? "true" : "false"),
  set: (value: string) => {
    fact.value.booleanValue = value === "true";
  },
});
</script>
