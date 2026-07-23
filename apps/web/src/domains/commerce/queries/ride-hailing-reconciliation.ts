import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, type Ref } from "vue";
import { client } from "@/lib/rpc";
import { buildApiError, readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";

type CommerceApi = typeof client.api.commerce;

export type RideHailingOrderReconciliationResponse = InferResponseType<
  CommerceApi["orders"][":orderId"]["ride-hailing"]["reconcile"]["$post"]
>;

export type RideHailingProviderObservation = NonNullable<
  RideHailingOrderReconciliationResponse["providerObservation"]
>;

export type RideHailingOrderReconciliationInput = {
  orderId: string;
};

const readJsonOrThrow = async <T>(response: Response, fallback: string): Promise<T> => {
  if (!response.ok) {
    const payload = await readApiErrorPayload(response);
    throw buildApiError(resolveApiErrorMessage(payload, fallback), payload);
  }
  return (await response.json()) as T;
};

/**
 * The browser never reads provider data directly. This disabled query is a
 * command-owned transient projection: reconcile writes it, while the durable
 * Order Detail query remains the execution snapshot authority.
 */
export const useRideHailingProviderObservation = (orderId: Ref<string | null>) =>
  useQuery<RideHailingProviderObservation | null>({
    queryKey: computed(() => queryKeys.commerce.rideHailingObservation(orderId.value)),
    queryFn: async () => null,
    enabled: false,
    staleTime: Infinity,
  });

export const useRideHailingOrderReconciliation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RideHailingOrderReconciliationInput) => {
      const response = await client.api.commerce.orders[":orderId"]["ride-hailing"].reconcile.$post(
        {
          param: { orderId: input.orderId },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<RideHailingOrderReconciliationResponse>(
        response,
        "Failed to reconcile ride-hailing order",
      );
    },
    onSuccess: async (result, input) => {
      queryClient.setQueryData(
        queryKeys.commerce.rideHailingObservation(input.orderId),
        result.providerObservation,
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.commerce.orderDetail(input.orderId),
        refetchType: "active",
      });
    },
  });
};
