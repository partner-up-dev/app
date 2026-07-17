import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, unref, type MaybeRef } from "vue";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

const readErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  const payload = (await response.json()) as { error?: string; detail?: string };
  return payload.error || payload.detail || fallback;
};

type AdminApi = typeof adminClient.api.admin;
type RideHailingApi = AdminApi["ride-hailing"];
type ProviderInstancesApi = RideHailingApi["provider-instances"];
type OrdersApi = RideHailingApi["orders"];

export type AdminRideHailingProviderWorkspaceResponse = InferResponseType<
  ProviderInstancesApi["workspace"]["$get"]
>;
export type AdminRideHailingOrderWorkspaceResponse = InferResponseType<
  OrdersApi["workspace"]["$get"]
>;

export type AdminRideHailingProviderInstanceInput = {
  providerType: "CAOCAO";
  instanceKey: string;
  displayName: string;
  status: "ACTIVE" | "DISABLED";
  config: {
    adapterMode: "CAOCAO_OPEN_API";
    caocaoClientId: string;
    signKey?: string | null;
    endpointBaseUrl: string;
    callbackBaseUrl?: string | null;
    requestTimeoutMs?: number | null;
  };
};

export const useAdminRideHailingProviderWorkspace = (enabled: MaybeRef<boolean> = true) =>
  useQuery<AdminRideHailingProviderWorkspaceResponse>({
    queryKey: queryKeys.admin.rideHailingProviderInstances(),
    queryFn: async () => {
      const res =
        await adminClient.api.admin["ride-hailing"]["provider-instances"].workspace.$get();
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取网约车服务商失败"));
      }
      return await res.json();
    },
    enabled: computed(() => unref(enabled)),
  });

export const useAdminRideHailingOrderWorkspace = (enabled: MaybeRef<boolean> = true) =>
  useQuery<AdminRideHailingOrderWorkspaceResponse>({
    queryKey: queryKeys.admin.rideHailingOrdersWorkspace(),
    queryFn: async () => {
      const res = await adminClient.api.admin["ride-hailing"].orders.workspace.$get();
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取网约车订单工作台失败"));
      }
      return await res.json();
    },
    enabled: computed(() => unref(enabled)),
  });

export const useCreateAdminRideHailingProviderInstance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AdminRideHailingProviderInstanceInput) => {
      const res = await adminClient.api.admin["ride-hailing"]["provider-instances"].$post({
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "创建网约车服务商失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.rideHailingProviderInstances(),
      });
    },
  });
};

export const useCancelAdminRideHailingOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      const res = await adminClient.api.admin["ride-hailing"].orders[":orderId"].cancel.$post({
        param: { orderId },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "取消网约车订单失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.rideHailingOrdersWorkspace(),
      });
    },
  });
};

export const useUpdateAdminRideHailingProviderInstance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      providerInstanceId,
      input,
    }: {
      providerInstanceId: string;
      input: AdminRideHailingProviderInstanceInput;
    }) => {
      const res = await adminClient.api.admin["ride-hailing"]["provider-instances"][
        ":providerInstanceId"
      ].$patch({
        param: { providerInstanceId },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新网约车服务商失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.rideHailingProviderInstances(),
      });
    },
  });
};
