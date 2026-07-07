<template>
  <div v-if="selectedProduct?.skus.length === 0" class="pm-hint">
    {{ t("adminCommerceProducts.emptySkus") }}
  </div>
  <div v-else class="pm-rail-list">
    <PuCard
      v-for="record in selectedProduct?.skus ?? []"
      :key="record.sku.id"
      :active="selectedSkuId === record.sku.id && !isCreatingSku"
      @click="context.selectSku(record.sku.id)"
      selectable
      variant="outline"
      padding="sm"
      gap="xs"
    >
      <span>{{ record.sku.name }}</span>
      <small class="pm-small"
        >#{{ record.sku.sortOrder }} · {{ record.sku.status }}</small
      >
    </PuCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAdminCommerceProductManagementContext } from "@/domains/admin-commerce/ui/product-management/productManagementContext";
import "@/domains/admin-commerce/ui/product-management/product-management.scss";
import { PuCard } from "@partner-up-dev/design-web";

const { t } = useI18n();
const context = useAdminCommerceProductManagementContext();
const selectedProduct = computed(() => context.selectedProduct.value);
const selectedSkuId = computed(() => context.selectedSkuId.value);
const isCreatingSku = computed(() => context.isCreatingSku.value);
</script>
