<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #actions>
      <AdminCommerceProductActionBar />
    </template>

    <template #rail>
      <AdminRailPanel :title="t('adminCommerceProducts.spusTitle')">
        <AdminCommerceProductRailList />
      </AdminRailPanel>

      <AdminRailPanel v-if="hasSelectedProduct" :title="t('adminCommerceProducts.skusTitle')">
        <AdminCommerceSkuRailList />
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
            <AdminCommerceSpuEditor />
          </BentoItem>

          <BentoItem
            :title="skuEditorTitle"
            :description="t('adminCommerceProducts.skuHint')"
            span="full"
          >
            <AdminCommerceSkuEditor />
          </BentoItem>

          <BentoItem
            :title="t('adminCommerceProducts.cancellationPolicyTitle')"
            :description="t('adminCommerceProducts.cancellationPolicyHint')"
            span="full"
          >
            <AdminCommerceCancellationPolicyEditor />
          </BentoItem>

          <PuInlineNotice
            v-if="productErrorMessage"
            tone="error"
            :message="productErrorMessage"
            dismissible
            @close="productManagementContext.clearErrorMessage"
          />
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
import AdminCommerceCancellationPolicyEditor from "@/domains/admin-commerce/ui/product-management/sections/AdminCommerceCancellationPolicyEditor.vue";
import AdminCommerceProductActionBar from "@/domains/admin-commerce/ui/product-management/sections/AdminCommerceProductActionBar.vue";
import AdminCommerceProductRailList from "@/domains/admin-commerce/ui/product-management/sections/AdminCommerceProductRailList.vue";
import AdminCommerceProductWorkspaceGate from "@/domains/admin-commerce/ui/product-management/sections/AdminCommerceProductWorkspaceGate.vue";
import AdminCommerceSkuEditor from "@/domains/admin-commerce/ui/product-management/sections/AdminCommerceSkuEditor.vue";
import AdminCommerceSkuRailList from "@/domains/admin-commerce/ui/product-management/sections/AdminCommerceSkuRailList.vue";
import AdminCommerceSpuEditor from "@/domains/admin-commerce/ui/product-management/sections/AdminCommerceSpuEditor.vue";
import { provideAdminCommerceProductManagementContext } from "@/domains/admin-commerce/ui/product-management/productManagementContext";
import { PuInlineNotice } from "@partner-up-dev/design-web";

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const productManagementContext = provideAdminCommerceProductManagementContext(isAdmin);

const hasSelectedProduct = computed(() => productManagementContext.selectedProduct.value !== null);
const productErrorMessage = computed(() => productManagementContext.errorMessage.value);
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
