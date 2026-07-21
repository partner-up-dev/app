import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, type Ref } from "vue";
import { client } from "@/lib/rpc";
import { buildApiError, readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";

type PaymentApi = typeof client.api.payment;

export type PaymentProviderCatalogResponse = InferResponseType<PaymentApi["providers"]["$get"]>;
export type PaymentTxResponse = InferResponseType<PaymentApi[":paymentTxId"]["$get"]>;
export type CreatePaymentChargeResponse = InferResponseType<
  PaymentApi[":paymentProviderInstanceId"]["charge"]["$post"]
>;

const readJsonOrThrow = async <T>(response: Response, fallback: string): Promise<T> => {
  if (!response.ok) {
    const payload = await readApiErrorPayload(response);
    throw buildApiError(resolveApiErrorMessage(payload, fallback), payload);
  }
  return (await response.json()) as T;
};

const fetchPaymentTx = async (paymentTxId: string): Promise<PaymentTxResponse> => {
  const response = await client.api.payment[":paymentTxId"].$get(
    {
      param: {
        paymentTxId,
      },
    },
    {
      init: {
        credentials: "include",
      },
    },
  );
  return readJsonOrThrow<PaymentTxResponse>(response, "Failed to load payment status");
};

export const usePaymentProviders = () =>
  useQuery<PaymentProviderCatalogResponse>({
    queryKey: queryKeys.payment.providers(),
    queryFn: async () => {
      const response = await client.api.payment.providers.$get(
        {},
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<PaymentProviderCatalogResponse>(
        response,
        "Failed to load payment providers",
      );
    },
  });

const paymentTxQueryOptions = (paymentTxId: string) =>
  queryOptions({
    queryKey: queryKeys.payment.tx(paymentTxId),
    queryFn: () => fetchPaymentTx(paymentTxId),
    retry: false,
  });

export const usePaymentTx = (paymentTxId: Ref<string | null>) => {
  const queryClient = useQueryClient();
  const query = useQuery<PaymentTxResponse>({
    queryKey: computed(() => queryKeys.payment.tx(paymentTxId.value)),
    queryFn: async () => {
      if (paymentTxId.value === null) {
        throw new Error("Missing payment tx id");
      }
      return fetchPaymentTx(paymentTxId.value);
    },
    enabled: false,
    retry: false,
  });

  const reconcile = async (requestedPaymentTxId: string): Promise<PaymentTxResponse> =>
    queryClient.fetchQuery(paymentTxQueryOptions(requestedPaymentTxId));

  const seed = (snapshot: PaymentTxResponse): void => {
    queryClient.setQueryData(queryKeys.payment.tx(snapshot.paymentTxId), snapshot);
  };

  return {
    ...query,
    reconcile,
    seed,
  };
};

export const useCreatePaymentCharge = () =>
  useMutation({
    mutationFn: async (input: { paymentProviderInstanceId: string; billLineId: string }) => {
      const response = await client.api.payment[":paymentProviderInstanceId"].charge.$post(
        {
          param: {
            paymentProviderInstanceId: input.paymentProviderInstanceId,
          },
          query: {
            "bill-line": input.billLineId,
          },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<CreatePaymentChargeResponse>(response, "Failed to create payment");
    },
  });
