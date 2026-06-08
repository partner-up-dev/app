<template>
  <div v-if="selectedProduct?.skus.length === 0" class="pm-hint">
    {{ t("adminCommerceProducts.emptySkus") }}
  </div>
  <div v-else class="pm-rail-list">
    <ChoiceCard
      v-for="record in selectedProduct?.skus ?? []"
      :key="record.sku.id"
      :active="selectedSkuId === record.sku.id && !isCreatingSku"
      @click="context.selectSku(record.sku.id)"
    >
      <span>{{ record.sku.name }}</span>
      <small class="pm-small">#{{ record.sku.sortOrder }} · {{ record.sku.status }}</small>
    </ChoiceCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAdminCommerceProductManagementContext } from "@/domains/admin-commerce/ui/product-management/productManagementContext";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";
import "@/domains/admin-commerce/ui/product-management/product-management.scss";

const { t } = useI18n();
const context = useAdminCommerceProductManagementContext();
const selectedProduct = computed(() => context.selectedProduct.value);
const selectedSkuId = computed(() => context.selectedSkuId.value);
const isCreatingSku = computed(() => context.isCreatingSku.value);
</script>
