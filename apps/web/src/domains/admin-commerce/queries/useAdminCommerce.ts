import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, unref, type MaybeRef } from "vue";
import {
  toOfferCreateBody,
  toOfferUpdateBody,
  toProductSkuCreateBody,
  toProductSkuUpdateBody,
  toProductSpuCreateBody,
  toProductSpuUpdateBody,
  toSkuCancellationPolicyBody,
  type AdminCommerceFulfillmentWorkspaceResponse,
  type AdminCommerceOrderBillWorkspaceResponse,
  type AdminCommercePlacementOfferWorkspaceResponse,
  type AdminCommerceProductWorkspaceResponse,
} from "@/domains/admin-commerce/adapters/adminCommerceRpcAdapter";
import type { OfferValue } from "@/domains/admin-commerce/model/pricing-rules/offerValues";
import type {
  ProductSkuValue,
  ProductSpuValue,
  SkuCancellationPolicyValue,
} from "@/domains/admin-commerce/model/product-management/productValues";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

const readErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  const payload = (await response.json()) as { error?: string; detail?: string };
  return payload.error || payload.detail || fallback;
};

export type AdminPlacementInput = {
  placementType: "BUTTON";
  offerId: number;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  matchingRule: unknown;
  priority: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  creative: {
    ctaLabel: string;
    description?: string | null;
  };
  bindingRules: Array<{
    fieldKey: string;
    contextPath: string;
    lock: true;
  }>;
};

export const useAdminCommerceProductWorkspace = (enabled: MaybeRef<boolean> = true) =>
  useQuery<AdminCommerceProductWorkspaceResponse>({
    queryKey: queryKeys.admin.commerceProductsWorkspace(),
    queryFn: async () => {
      const res = await adminClient.api.admin.commerce.products.workspace.$get();
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取商品工作台失败"));
      }
      return await res.json();
    },
    enabled: computed(() => unref(enabled)),
  });

export const useCreateAdminProductSpu = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProductSpuValue) => {
      const res = await adminClient.api.admin.commerce.products.spus.$post({
        json: toProductSpuCreateBody(input),
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "创建 SPU 失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commerceProductsWorkspace(),
      });
    },
  });
};

export const useUpdateAdminProductSpu = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ spuId, input }: { spuId: number; input: ProductSpuValue }) => {
      const res = await adminClient.api.admin.commerce.products.spus[":spuId"].$patch({
        param: { spuId: spuId.toString() },
        json: toProductSpuUpdateBody(input),
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新 SPU 失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commerceProductsWorkspace(),
      });
    },
  });
};

export const useCreateAdminProductSku = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ spuId, input }: { spuId: number; input: ProductSkuValue }) => {
      const res = await adminClient.api.admin.commerce.products.skus.$post({
        json: toProductSkuCreateBody(spuId, input),
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "创建 SKU 失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commerceProductsWorkspace(),
      });
    },
  });
};

export const useUpdateAdminProductSku = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ skuId, input }: { skuId: number; input: ProductSkuValue }) => {
      const res = await adminClient.api.admin.commerce.products.skus[":skuId"].$patch({
        param: { skuId: skuId.toString() },
        json: toProductSkuUpdateBody(input),
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新 SKU 失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commerceProductsWorkspace(),
      });
    },
  });
};

export const useSaveAdminSkuCancellationPolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ skuId, input }: { skuId: number; input: SkuCancellationPolicyValue }) => {
      const res = await adminClient.api.admin.commerce.products.skus[":skuId"][
        "cancellation-policy"
      ].$post({
        param: { skuId: skuId.toString() },
        json: toSkuCancellationPolicyBody(input),
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "保存取消策略失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commerceProductsWorkspace(),
      });
    },
  });
};

export const useAdminCommercePlacementOfferWorkspace = (enabled: MaybeRef<boolean> = true) =>
  useQuery<AdminCommercePlacementOfferWorkspaceResponse>({
    queryKey: queryKeys.admin.commercePlacementOfferWorkspace(),
    queryFn: async () => {
      const res = await adminClient.api.admin.commerce["placement-offer"].workspace.$get();
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取投放工作台失败"));
      }
      return await res.json();
    },
    enabled: computed(() => unref(enabled)),
  });

export const useCreateAdminOffer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: OfferValue) => {
      const res = await adminClient.api.admin.commerce.offers.$post({
        json: toOfferCreateBody(input),
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "创建 Offer 失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commercePlacementOfferWorkspace(),
      });
    },
  });
};

export const useUpdateAdminOffer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ offerId, input }: { offerId: number; input: OfferValue }) => {
      const res = await adminClient.api.admin.commerce.offers[":offerId"].$patch({
        param: { offerId: offerId.toString() },
        json: toOfferUpdateBody(input),
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新 Offer 失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commercePlacementOfferWorkspace(),
      });
    },
  });
};

export const useCreateAdminPlacement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AdminPlacementInput) => {
      const res = await adminClient.api.admin.commerce.placements.$post({
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "创建 Placement 失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commercePlacementOfferWorkspace(),
      });
    },
  });
};

export const useUpdateAdminPlacement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      placementId,
      input,
    }: {
      placementId: number;
      input: AdminPlacementInput;
    }) => {
      const res = await adminClient.api.admin.commerce.placements[":placementId"].$patch({
        param: { placementId: placementId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新 Placement 失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commercePlacementOfferWorkspace(),
      });
    },
  });
};

export const useAdminCommerceOrderBillWorkspace = (enabled: MaybeRef<boolean> = true) =>
  useQuery<AdminCommerceOrderBillWorkspaceResponse>({
    queryKey: queryKeys.admin.commerceOrderBillWorkspace(),
    queryFn: async () => {
      const res = await adminClient.api.admin.commerce["orders-bills"].workspace.$get();
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取订单账单工作台失败"));
      }
      return await res.json();
    },
    enabled: computed(() => unref(enabled)),
  });

export const useAdminCommerceFulfillmentWorkspace = (enabled: MaybeRef<boolean> = true) =>
  useQuery<AdminCommerceFulfillmentWorkspaceResponse>({
    queryKey: queryKeys.admin.commerceFulfillmentWorkspace(),
    queryFn: async () => {
      const res = await adminClient.api.admin.commerce.fulfillments.workspace.$get();
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取履约工作台失败"));
      }
      return await res.json();
    },
    enabled: computed(() => unref(enabled)),
  });

export const useConfirmRentalFulfillmentBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fulfillmentId,
      bookingNote,
    }: {
      fulfillmentId: string;
      bookingNote: string | null;
    }) => {
      const res = await adminClient.api.admin.commerce.fulfillments.rental[":fulfillmentId"][
        "confirm-booking"
      ].$post({
        param: { fulfillmentId },
        json: { bookingNote },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "确认预订失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commerceFulfillmentWorkspace(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commerceOrderBillWorkspace(),
      });
    },
  });
};

export const useRejectRentalFulfillmentBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fulfillmentId,
      bookingNote,
    }: {
      fulfillmentId: string;
      bookingNote: string | null;
    }) => {
      const res = await adminClient.api.admin.commerce.fulfillments.rental[":fulfillmentId"][
        "reject-booking"
      ].$post({
        param: { fulfillmentId },
        json: { bookingNote },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "拒绝预订失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commerceFulfillmentWorkspace(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commerceOrderBillWorkspace(),
      });
    },
  });
};

export const useApproveRentalFulfillmentCancellation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fulfillmentId,
      reason,
    }: {
      fulfillmentId: string;
      reason: string | null;
    }) => {
      const res = await adminClient.api.admin.commerce.fulfillments.rental[":fulfillmentId"][
        "approve-cancellation"
      ].$post({
        param: { fulfillmentId },
        json: { reason },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "确认取消失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commerceFulfillmentWorkspace(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commerceOrderBillWorkspace(),
      });
    },
  });
};

export const useDenyRentalFulfillmentCancellation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fulfillmentId,
      reason,
    }: {
      fulfillmentId: string;
      reason: string | null;
    }) => {
      const res = await adminClient.api.admin.commerce.fulfillments.rental[":fulfillmentId"][
        "deny-cancellation"
      ].$post({
        param: { fulfillmentId },
        json: { reason },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "拒绝取消失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commerceFulfillmentWorkspace(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commerceOrderBillWorkspace(),
      });
    },
  });
};

export const useRecordRentalFulfillmentEntryGuidance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fulfillmentId,
      input,
    }: {
      fulfillmentId: string;
      input: {
        entryByPhone: string | null;
        entryByRealName: string | null;
        note: string | null;
      };
    }) => {
      const res = await adminClient.api.admin.commerce.fulfillments.rental[":fulfillmentId"][
        "entry-guidance"
      ].$post({
        param: { fulfillmentId },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "保存入场指引失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.commerceFulfillmentWorkspace(),
      });
    },
  });
};
