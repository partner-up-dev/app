<template>
  <PuLoadingState v-if="isLoading" :message="t('common.loading')" />
  <PuInlineNotice tone="error" v-else-if="errorMessage" :message="errorMessage" />
  <slot v-else />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAdminCommerceProductManagementContext } from "@/domains/admin-commerce/ui/product-management/productManagementContext";
import { PuInlineNotice, PuLoadingState } from "@partner-up-dev/design-web";

const { t } = useI18n();
const context = useAdminCommerceProductManagementContext();
const isLoading = computed(() => context.workspaceQuery.isLoading.value);
const errorMessage = computed(() => context.workspaceQuery.error.value?.message ?? null);
</script>
