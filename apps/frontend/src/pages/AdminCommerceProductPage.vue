<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #actions>
      <AdminCommerceProductActionsContent />
    </template>

    <template #rail>
      <AdminRailPanel :title="t('adminCommerceProducts.spusTitle')">
        <AdminCommerceProductRailContent />
      </AdminRailPanel>

      <AdminRailPanel
        v-if="hasSelectedProduct"
        :title="t('adminCommerceProducts.skusTitle')"
      >
        <AdminCommerceSkuRailContent />
      </AdminRailPanel>
    </template>

    <template #main>
      <div class="page-stack">
        <AdminCommerceProductWorkspaceGate>
          <BentoItem
            :title="spuEditorTitle"
            :description="t('adminCommerceProducts.spuHint')"
            span="full"
          >
            <AdminCommerceSpuEditorContent />
          </BentoItem>

          <BentoItem
            :title="skuEditorTitle"
            :description="t('adminCommerceProducts.skuHint')"
            span="full"
          >
            <AdminCommerceSkuEditorContent />
          </BentoItem>

          <BentoItem
            :title="t('adminCommerceProducts.cancellationPolicyTitle')"
            :description="t('adminCommerceProducts.cancellationPolicyHint')"
            span="full"
          >
            <AdminCommerceCancellationPolicyEditorContent />
          </BentoItem>

          <AdminCommerceProductErrorContent />
        </AdminCommerceProductWorkspaceGate>
      </div>
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import AdminRailPanel from "@/domains/admin/ui/layout/AdminRailPanel.vue";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import AdminCommerceCancellationPolicyEditorContent from "@/domains/admin-commerce/ui/product-management/sections/AdminCommerceCancellationPolicyEditorContent.vue";
import AdminCommerceProductActionsContent from "@/domains/admin-commerce/ui/product-management/sections/AdminCommerceProductActionsContent.vue";
import AdminCommerceProductErrorContent from "@/domains/admin-commerce/ui/product-management/sections/AdminCommerceProductErrorContent.vue";
import AdminCommerceProductRailContent from "@/domains/admin-commerce/ui/product-management/sections/AdminCommerceProductRailContent.vue";
import AdminCommerceProductWorkspaceGate from "@/domains/admin-commerce/ui/product-management/sections/AdminCommerceProductWorkspaceGate.vue";
import AdminCommerceSkuEditorContent from "@/domains/admin-commerce/ui/product-management/sections/AdminCommerceSkuEditorContent.vue";
import AdminCommerceSkuRailContent from "@/domains/admin-commerce/ui/product-management/sections/AdminCommerceSkuRailContent.vue";
import AdminCommerceSpuEditorContent from "@/domains/admin-commerce/ui/product-management/sections/AdminCommerceSpuEditorContent.vue";
import { provideAdminCommerceProductManagementContext } from "@/domains/admin-commerce/ui/product-management/productManagementContext";

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const productManagementContext =
  provideAdminCommerceProductManagementContext(isAdmin);

const hasSelectedProduct = computed(
  () => productManagementContext.selectedProduct.value !== null,
);
const spuEditorTitle = computed(() =>
  productManagementContext.isCreatingSpu.value
    ? t("adminCommerceProducts.createSpuTitle")
    : t("adminCommerceProducts.editSpuTitle"),
);
const skuEditorTitle = computed(() =>
  productManagementContext.isCreatingSku.value
    ? t("adminCommerceProducts.createSkuTitle")
    : t("adminCommerceProducts.editSkuTitle"),
);
</script>

<style lang="scss" scoped>
.page-stack {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}
</style>
