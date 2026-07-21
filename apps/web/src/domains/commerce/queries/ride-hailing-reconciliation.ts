import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, type Ref } from "vue";
import {
  createCommerceOrderDetailDebugHeaders,
  createCommerceOrderDetailDebugId,
  describeCommerceOrderDetailDebugError,
  logCommerceOrderDetailDebug,
  markNextCommerceOrderDetailTrigger,
} from "@/domains/commerce/use-cases/order-detail-debug";
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
  trigger: "polling-interval";
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
  const pendingRequestIds = new Map<string, string>();

  return useMutation({
    mutationFn: async (input: RideHailingOrderReconciliationInput) => {
      const requestId = createCommerceOrderDetailDebugId("reconcile");
      const startedAtMs = Date.now();
      pendingRequestIds.set(input.orderId, requestId);

      logCommerceOrderDetailDebug("ride-reconcile.mutation.start", {
        requestId,
        orderId: input.orderId,
        trigger: input.trigger,
      });

      try {
        const response = await client.api.commerce.orders[":orderId"]["ride-hailing"].reconcile.$post(
          {
            param: { orderId: input.orderId },
          },
          {
            init: {
              credentials: "include",
              headers: createCommerceOrderDetailDebugHeaders({
                channel: "ride-reconcile",
                source: "useRideHailingOrderReconciliation",
                requestId,
                orderId: input.orderId,
                routeOrderId: input.orderId,
                trigger: input.trigger,
              }),
            },
          },
        );
        const result = await readJsonOrThrow<RideHailingOrderReconciliationResponse>(
          response,
          "Failed to reconcile ride-hailing order",
        );
        logCommerceOrderDetailDebug("ride-reconcile.mutation.success", {
          requestId,
          orderId: input.orderId,
          trigger: input.trigger,
          durationMs: Date.now() - startedAtMs,
          outcome: result.outcome,
          mutated: result.mutated,
          hasProviderObservation: result.providerObservation !== null,
          correctionRequired: result.correctionRequired !== null,
        });
        return result;
      } catch (error) {
        logCommerceOrderDetailDebug("ride-reconcile.mutation.error", {
          requestId,
          orderId: input.orderId,
          trigger: input.trigger,
          durationMs: Date.now() - startedAtMs,
          error: describeCommerceOrderDetailDebugError(error),
        });
        throw error;
      }
    },
    onSuccess: async (result, input) => {
      const requestId = pendingRequestIds.get(input.orderId) ?? null;
      queryClient.setQueryData(
        queryKeys.commerce.rideHailingObservation(input.orderId),
        result.providerObservation,
      );
      markNextCommerceOrderDetailTrigger(input.orderId, "ride-reconcile-success");
      logCommerceOrderDetailDebug("ride-reconcile.detail.invalidate", {
        requestId,
        orderId: input.orderId,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.commerce.orderDetail(input.orderId),
        refetchType: "active",
      });
    },
    onSettled: (_result, _error, input) => {
      pendingRequestIds.delete(input.orderId);
    },
  });
};
