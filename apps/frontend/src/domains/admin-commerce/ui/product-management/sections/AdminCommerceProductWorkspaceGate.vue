<template>
  <LoadingIndicator v-if="isLoading" :message="t('common.loading')" />
  <ErrorToast v-else-if="errorMessage" :message="errorMessage" persistent />
  <slot v-else />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAdminCommerceProductManagementContext } from "@/domains/admin-commerce/ui/product-management/productManagementContext";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";

const { t } = useI18n();
const context = useAdminCommerceProductManagementContext();
const isLoading = computed(() => context.workspaceQuery.isLoading.value);
const errorMessage = computed(() => context.workspaceQuery.error.value?.message ?? null);
</script>
