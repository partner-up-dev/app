<template>
  <div class="pm-list-editor">
    <div class="pm-section-header">
      <h4 class="pm-subsection-title">{{ title }}</h4>
      <PuButton shape="pill" tone="neutral" variant="outline" size="sm" @click="handleAdd">
        <template #leading>
          <span class="i-mdi-plus" />
        </template>
        {{ addLabel }}
      </PuButton>
    </div>
    <p v-if="items.length === 0" class="pm-hint">
      {{ t("adminCommerceProducts.emptyListPlaceholder") }}
    </p>
    <div v-for="(item, index) in items" :key="item.id" class="pm-inline-row">
      <input v-model="item.value" class="pm-field-input" type="text" />
      <PuButton shape="pill" tone="danger" variant="outline" size="sm" @click="handleRemove(index)">
        <template #leading>
          <span class="i-mdi-close" />
        </template>
        {{ removeLabel }}
      </PuButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { createDraftId } from "@/domains/admin-commerce/model/product-management/shared";
import type { EditableStringItem } from "@/domains/admin-commerce/model/product-management/spuEditorModel";
import { PuButton } from "@partner-up-dev/design-web";
import "@/domains/admin-commerce/ui/product-management/product-management.scss";

defineProps<{
  title: string;
  addLabel: string;
  removeLabel: string;
}>();

const items = defineModel<EditableStringItem[]>({ required: true });
const { t } = useI18n();

const handleAdd = () => {
  items.value.push({ id: createDraftId("string-item"), value: "" });
};

const handleRemove = (index: number) => {
  items.value.splice(index, 1);
};
</script>
