import {
  computed,
  inject,
  provide,
  ref,
  watch,
  type ComputedRef,
  type InjectionKey,
  type MaybeRef,
  type Ref,
} from "vue";
import { useAdminCommerceProductWorkspace } from "@/domains/admin-commerce/queries/useAdminCommerce";
import type {
  ProductRecord,
  ProductType,
  SkuRecord,
} from "@/domains/admin-commerce/model/product-management/shared";

type ProductWorkspaceQuery = ReturnType<typeof useAdminCommerceProductWorkspace>;

export type AdminCommerceProductManagementContext = {
  workspaceQuery: ProductWorkspaceQuery;
  products: ComputedRef<ProductRecord[]>;
  selectedSpuId: ComputedRef<number | null>;
  selectedSkuId: ComputedRef<number | null>;
  selectedProduct: ComputedRef<ProductRecord | null>;
  selectedProductType: ComputedRef<ProductType | null>;
  selectedSkuRecord: ComputedRef<SkuRecord | null>;
  isCreatingSpu: Ref<boolean>;
  isCreatingSku: Ref<boolean>;
  errorMessage: ComputedRef<string | null>;
  selectSpu: (spuId: number) => void;
  selectSku: (skuId: number) => void;
  prepareNewSpu: () => void;
  prepareNewSku: () => void;
  completeSpuCreate: (spuId: number) => void;
  completeSkuCreate: (skuId: number) => void;
  setErrorMessage: (message: string | null) => void;
  clearErrorMessage: () => void;
};

const contextKey: InjectionKey<AdminCommerceProductManagementContext> = Symbol(
  "AdminCommerceProductManagementContext",
);

const parsePositiveId = (value: string): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const provideAdminCommerceProductManagementContext = (
  enabled: MaybeRef<boolean>,
): AdminCommerceProductManagementContext => {
  const workspaceQuery = useAdminCommerceProductWorkspace(enabled);
  const selectedSpuIdRaw = ref("");
  const selectedSkuIdRaw = ref("");
  const isCreatingSpu = ref(false);
  const isCreatingSku = ref(false);
  const localErrorMessage = ref<string | null>(null);

  const products = computed(() => workspaceQuery.data.value?.products ?? []);
  const selectedSpuId = computed<number | null>(() => parsePositiveId(selectedSpuIdRaw.value));
  const selectedSkuId = computed<number | null>(() => parsePositiveId(selectedSkuIdRaw.value));
  const selectedProduct = computed<ProductRecord | null>(
    () => products.value.find((product) => product.spu.id === selectedSpuId.value) ?? null,
  );
  const selectedProductType = computed<ProductType | null>(
    () => selectedProduct.value?.spu.productType ?? null,
  );
  const selectedSkuRecord = computed<SkuRecord | null>(
    () =>
      selectedProduct.value?.skus.find((record) => record.sku.id === selectedSkuId.value) ?? null,
  );
  const errorMessage = computed(() => localErrorMessage.value);

  watch(
    products,
    (nextProducts) => {
      if (nextProducts.length === 0) {
        selectedSpuIdRaw.value = "";
        selectedSkuIdRaw.value = "";
        return;
      }

      if (!nextProducts.some((product) => String(product.spu.id) === selectedSpuIdRaw.value)) {
        selectedSpuIdRaw.value = String(nextProducts[0]!.spu.id);
        isCreatingSpu.value = false;
      }
    },
    { immediate: true },
  );

  watch(
    [selectedProduct, isCreatingSku],
    ([product, creating]) => {
      if (!product) {
        selectedSkuIdRaw.value = "";
        return;
      }

      if (
        !creating &&
        !product.skus.some((record) => String(record.sku.id) === selectedSkuIdRaw.value)
      ) {
        selectedSkuIdRaw.value = product.skus[0] ? String(product.skus[0].sku.id) : "";
      }
    },
    { immediate: true },
  );

  const selectSpu = (spuId: number) => {
    selectedSpuIdRaw.value = String(spuId);
    isCreatingSpu.value = false;
    isCreatingSku.value = false;
  };

  const selectSku = (skuId: number) => {
    selectedSkuIdRaw.value = String(skuId);
    isCreatingSku.value = false;
  };

  const prepareNewSpu = () => {
    isCreatingSpu.value = true;
    isCreatingSku.value = false;
    selectedSkuIdRaw.value = "";
  };

  const prepareNewSku = () => {
    isCreatingSku.value = true;
    selectedSkuIdRaw.value = "";
  };

  const completeSpuCreate = (spuId: number) => {
    selectedSpuIdRaw.value = String(spuId);
    isCreatingSpu.value = false;
  };

  const completeSkuCreate = (skuId: number) => {
    selectedSkuIdRaw.value = String(skuId);
    isCreatingSku.value = false;
  };

  const setErrorMessage = (message: string | null) => {
    localErrorMessage.value = message;
  };

  const clearErrorMessage = () => {
    localErrorMessage.value = null;
  };

  const context: AdminCommerceProductManagementContext = {
    workspaceQuery,
    products,
    selectedSpuId,
    selectedSkuId,
    selectedProduct,
    selectedProductType,
    selectedSkuRecord,
    isCreatingSpu,
    isCreatingSku,
    errorMessage,
    selectSpu,
    selectSku,
    prepareNewSpu,
    prepareNewSku,
    completeSpuCreate,
    completeSkuCreate,
    setErrorMessage,
    clearErrorMessage,
  };

  provide(contextKey, context);
  return context;
};

export const useAdminCommerceProductManagementContext =
  (): AdminCommerceProductManagementContext => {
    const context = inject(contextKey);
    if (!context) {
      throw new Error("AdminCommerceProductManagementContext is not provided");
    }
    return context;
  };
