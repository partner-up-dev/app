import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, unref, type MaybeRef } from "vue";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string; detail?: string };
  return payload.error || payload.detail || fallback;
};

type AdminApi = typeof adminClient.api.admin;
type PaymentApi = AdminApi["payment"];
type ProviderInstancesApi = PaymentApi["provider-instances"];

export type AdminPaymentProviderWorkspaceResponse = InferResponseType<
  ProviderInstancesApi["workspace"]["$get"]
>;

export type AdminPaymentProviderInstanceInput = {
  providerType: "WECHAT_PAY";
  displayName: string;
  status: "ACTIVE" | "DISABLED";
  clientId: string;
  config: {
    adapterMode: "WECHAT_PAY_API_V3";
    appId: string;
    mchId: string;
    chargeMode: "JSAPI" | "H5";
    endpointBaseUrl?: string | null;
    apiV3Key?: string | null;
    merchantCertificate: {
      serialNo: string;
      privateKeyPem?: string | null;
      certificatePem?: string | null;
    };
  };
};

export const useAdminPaymentProviderWorkspace = (
  enabled: MaybeRef<boolean> = true,
) =>
  useQuery<AdminPaymentProviderWorkspaceResponse>({
    queryKey: queryKeys.admin.paymentProviderInstances(),
    queryFn: async () => {
      const res =
        await adminClient.api.admin.payment["provider-instances"].workspace.$get();
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取支付服务商失败"));
      }
      return await res.json();
    },
    enabled: computed(() => unref(enabled)),
  });

export const useCreateAdminPaymentProviderInstance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AdminPaymentProviderInstanceInput) => {
      const res = await adminClient.api.admin.payment["provider-instances"].$post({
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "创建支付服务商失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.paymentProviderInstances(),
      });
    },
  });
};

export const useUpdateAdminPaymentProviderInstance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      providerInstanceId,
      input,
    }: {
      providerInstanceId: string;
      input: AdminPaymentProviderInstanceInput;
    }) => {
      const res =
        await adminClient.api.admin.payment["provider-instances"][
          ":providerInstanceId"
        ].$patch({
          param: { providerInstanceId },
          json: input,
        });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新支付服务商失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.paymentProviderInstances(),
      });
    },
  });
};
