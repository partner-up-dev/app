<template>
  <PuButton shape="pill" tone="neutral" variant="outline" size="sm" @click="context.prepareNewSpu">
    {{ t("adminCommerceProducts.newSpuAction") }}
  </PuButton>
  <PuButton
    shape="pill"
    tone="neutral"
    variant="outline"
    size="sm"
    :disabled="selectedSpuId === null"
    @click="context.prepareNewSku"
  >
    {{ t("adminCommerceProducts.newSkuAction") }}
  </PuButton>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAdminCommerceProductManagementContext } from "@/domains/admin-commerce/ui/product-management/productManagementContext";
import { PuButton } from "@partner-up-dev/design-web";

const { t } = useI18n();
const context = useAdminCommerceProductManagementContext();
const selectedSpuId = computed(() => context.selectedSpuId.value);
</script>
