<template>
  <ErrorToast
    v-if="errorMessage"
    :message="errorMessage"
    @close="context.clearErrorMessage"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useAdminCommerceProductManagementContext } from "@/domains/admin-commerce/ui/product-management/productManagementContext";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";

const context = useAdminCommerceProductManagementContext();
const errorMessage = computed(() => context.errorMessage.value);
</script>
