<template>
  <div v-if="products.length === 0" class="pm-hint">
    {{ t("adminCommerceProducts.emptyProducts") }}
  </div>
  <div v-else class="pm-rail-list">
    <PuCard
      v-for="product in products"
      :key="product.spu.id"
      :active="selectedSpuId === product.spu.id && !isCreatingSpu"
      @click="context.selectSpu(product.spu.id)"
      selectable
      variant="outline"
      padding="sm"
      gap="xs"
    >
      <span>{{ product.spu.name }}</span>
      <small class="pm-small"
        >{{ product.spu.productType }} · {{ product.spu.status }}</small
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
const products = computed(() => context.products.value);
const selectedSpuId = computed(() => context.selectedSpuId.value);
const isCreatingSpu = computed(() => context.isCreatingSpu.value);
</script>
