<template>
  <Button appearance="pill" tone="outline" size="sm" type="button" @click="context.prepareNewSpu">
    {{ t("adminCommerceProducts.newSpuAction") }}
  </Button>
  <Button
    appearance="pill"
    tone="outline"
    size="sm"
    type="button"
    :disabled="selectedSpuId === null"
    @click="context.prepareNewSku"
  >
    {{ t("adminCommerceProducts.newSkuAction") }}
  </Button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAdminCommerceProductManagementContext } from "@/domains/admin-commerce/ui/product-management/productManagementContext";
import Button from "@/shared/ui/actions/Button.vue";

const { t } = useI18n();
const context = useAdminCommerceProductManagementContext();
const selectedSpuId = computed(() => context.selectedSpuId.value);
</script>
