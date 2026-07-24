import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, onScopeDispose, type Ref, watch } from "vue";
import { toCreateOrderRequest } from "@/domains/commerce/adapters/create-order-adapter";
import type { CreateOrderValue } from "@/domains/commerce/model/ordering-content";
import {
  useRideHailingOrderReconciliation,
  useRideHailingProviderObservation,
} from "@/domains/commerce/queries/ride-hailing-reconciliation";
import { client } from "@/lib/rpc";
import { buildApiError, readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";

type CommerceApi = typeof client.api.commerce;
type PlacementApi = typeof client.api.placements;

export type PlacementMatchResponse = InferResponseType<PlacementApi["$post"]>;
export type PlacementInstanceProjection = PlacementMatchResponse["placements"][number];

export type OrderingEntryResponse = InferResponseType<
  PlacementApi[":instanceId"]["ordering-entry"]["$post"]
>;

export type OfferListingInput = Parameters<
  CommerceApi["offers"][":offerId"]["listing"]["$post"]
>[0]["json"];

export type OfferListingResponse = InferResponseType<
  CommerceApi["offers"][":offerId"]["listing"]["$post"]
>;

export type CreateOrderMutationInput = {
  command: CreateOrderValue;
  idempotencyKey: string;
};

export type CommerceOrderDetailResponse = InferResponseType<
  CommerceApi["orders"][":orderId"]["$get"]
>;

export type RideHailingCancellationFeePreviewResponse = InferResponseType<
  CommerceApi["orders"][":orderId"]["cancel-fee-preview"]["$get"]
>;

export type ViewerBillListResponse = InferResponseType<CommerceApi["bills"]["$get"]>;

export type BillDetailResponse = InferResponseType<CommerceApi["bills"][":billId"]["$get"]>;

export type BillLineCheckoutTargetResponse = InferResponseType<
  CommerceApi["bill-lines"][":billLineId"]["$get"]
>;

const ACTIVE_RIDE_HAILING_DETAIL_POLLING_MS = 2_000;
const activeRideHailingDetailPollingPhases = new Set([
  "INITIATING",
  "DISPATCHING",
  "ACCEPTED",
  "ARRIVED_AT_PICKUP",
  "IN_TRIP",
]);

export type CommerceOrderDetailPollAction = "RECONCILE" | "REFRESH_DETAIL" | "STOP";

export const resolveCommerceOrderDetailPollAction = (
  detail:
    | {
        rideHailing?: {
          executionPhase?: string | null;
          provider?: {
            providerOrderId?: string | null;
          } | null;
        } | null;
      }
    | null
    | undefined,
): CommerceOrderDetailPollAction => {
  const rideHailing = detail?.rideHailing ?? null;
  const phase = rideHailing?.executionPhase ?? null;
  if (phase === null || !activeRideHailingDetailPollingPhases.has(phase)) return "STOP";
  return rideHailing?.provider?.providerOrderId ? "RECONCILE" : "REFRESH_DETAIL";
};

export const shouldPollCommerceOrderDetail = (
  detail:
    | {
        rideHailing?: {
          executionPhase?: string | null;
        } | null;
      }
    | null
    | undefined,
): boolean => {
  return resolveCommerceOrderDetailPollAction(detail) !== "STOP";
};

const readJsonOrThrow = async <T>(response: Response, fallback: string): Promise<T> => {
  if (!response.ok) {
    const payload = await readApiErrorPayload(response);
    throw buildApiError(resolveApiErrorMessage(payload, fallback), payload);
  }
  return (await response.json()) as T;
};

export const usePlacementMatch = (
  matchingContext: Ref<unknown | null>,
  type: "BUTTON" = "BUTTON",
) =>
  useQuery<PlacementMatchResponse>({
    queryKey: computed(() => ["placements", "match", type, matchingContext.value]),
    queryFn: async () => {
      if (matchingContext.value === null) {
        throw new Error("Missing placement matching context");
      }

      const response = await client.api.placements.$post(
        {
          query: { type },
          json: { matchingContext: matchingContext.value },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<PlacementMatchResponse>(response, "Failed to load placement");
    },
    enabled: () => matchingContext.value !== null,
  });

export const resolvePlacementBindings = async (input: {
  placementInstanceId: number;
  matchingContext: unknown;
}) => {
  const response = await client.api.placements[":instanceId"].bindings.$post(
    {
      param: { instanceId: String(input.placementInstanceId) },
      json: { matchingContext: input.matchingContext },
    },
    {
      init: {
        credentials: "include",
      },
    },
  );
  return readJsonOrThrow<InferResponseType<PlacementApi[":instanceId"]["bindings"]["$post"]>>(
    response,
    "Failed to resolve placement bindings",
  );
};

export const resolvePlacementOrderingEntry = async (input: {
  placementInstanceId: number;
  matchingContext: unknown;
}) => {
  const response = await client.api.placements[":instanceId"]["ordering-entry"].$post(
    {
      param: { instanceId: String(input.placementInstanceId) },
      json: { matchingContext: input.matchingContext },
    },
    {
      init: {
        credentials: "include",
      },
    },
  );
  return readJsonOrThrow<OrderingEntryResponse>(response, "Failed to resolve ordering entry");
};

export const useOfferListing = (
  input: Ref<{
    offerId: number;
    listingInput: OfferListingInput;
  } | null>,
) =>
  useQuery<OfferListingResponse>({
    queryKey: computed(
      () => ["commerce", "offers", input.value?.offerId, "listing", input.value] as const,
    ),
    queryFn: async () => {
      if (input.value === null) {
        throw new Error("Missing Offer Listing input");
      }

      const response = await client.api.commerce.offers[":offerId"].listing.$post(
        {
          param: { offerId: input.value.offerId },
          json: input.value.listingInput,
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<OfferListingResponse>(response, "Failed to load offer listing");
    },
    enabled: () => input.value !== null,
  });

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOrderMutationInput) => {
      const response = await client.api.commerce.orders.$post(
        {
          header: { "idempotency-key": input.idempotencyKey },
          json: toCreateOrderRequest(input.command),
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<InferResponseType<CommerceApi["orders"]["$post"]>>(
        response,
        "Failed to create order",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["commerce"],
      });
    },
  });
};

export const useCommerceOrderDetail = (orderId: Ref<string | null>) => {
  const query = useQuery<CommerceOrderDetailResponse>({
    queryKey: computed(() => queryKeys.commerce.orderDetail(orderId.value)),
    queryFn: async () => {
      const currentOrderId = orderId.value;
      if (currentOrderId === null) {
        throw new Error("Missing order id");
      }

      const response = await client.api.commerce.orders[":orderId"].$get(
        {
          param: {
            orderId: currentOrderId,
          },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<CommerceOrderDetailResponse>(response, "Failed to load order");
    },
    enabled: () => orderId.value !== null,
  });
  const reconcileRideHailingOrder = useRideHailingOrderReconciliation();
  const providerObservationQuery = useRideHailingProviderObservation(orderId);

  const pollCommerceOrderDetail = async (): Promise<void> => {
    const currentOrderId = orderId.value;
    const action = resolveCommerceOrderDetailPollAction(query.data.value);
    if (currentOrderId === null || action === "STOP") return;

    if (action === "RECONCILE") {
      if (reconcileRideHailingOrder.isPending.value) return;
      try {
        await reconcileRideHailingOrder.mutateAsync({
          orderId: currentOrderId,
        });
      } catch {
        // Polling is best-effort; a later bounded tick may observe recovery.
      }
      return;
    }

    if (query.isFetching.value) return;
    await query.refetch();
  };

  let pollingIntervalId: ReturnType<typeof setInterval> | null = null;
  const stopPolling = () => {
    if (pollingIntervalId === null) return;
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  };

  watch(
    () => orderId.value !== null && shouldPollCommerceOrderDetail(query.data.value),
    (shouldPoll) => {
      stopPolling();
      if (!shouldPoll) return;
      pollingIntervalId = setInterval(() => {
        void pollCommerceOrderDetail();
      }, ACTIVE_RIDE_HAILING_DETAIL_POLLING_MS);
    },
    { immediate: true },
  );

  onScopeDispose(stopPolling);

  return {
    ...query,
    providerObservation: computed(() => providerObservationQuery.data.value ?? null),
  };
};

export const useBillDetail = (billId: Ref<string | null>) =>
  useQuery<BillDetailResponse>({
    queryKey: computed(() => queryKeys.commerce.billDetail(billId.value)),
    queryFn: async () => {
      const currentBillId = billId.value;
      if (currentBillId === null) {
        throw new Error("Missing bill id");
      }

      const response = await client.api.commerce.bills[":billId"].$get(
        {
          param: {
            billId: currentBillId,
          },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<BillDetailResponse>(response, "Failed to load bill");
    },
    enabled: () => billId.value !== null,
    refetchOnMount: "always",
  });

export const useViewerBillList = () =>
  useQuery<ViewerBillListResponse>({
    queryKey: queryKeys.commerce.billList(),
    queryFn: async () => {
      const response = await client.api.commerce.bills.$get(
        {},
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<ViewerBillListResponse>(response, "Failed to load viewer bills");
    },
    refetchOnMount: "always",
  });

export const useBillLineCheckoutTarget = (billLineId: Ref<string | null>) =>
  useQuery<BillLineCheckoutTargetResponse>({
    queryKey: computed(() => queryKeys.commerce.billLineCheckoutTarget(billLineId.value)),
    queryFn: async () => {
      if (billLineId.value === null) {
        throw new Error("Missing bill line id");
      }

      const response = await client.api.commerce["bill-lines"][":billLineId"].$get(
        {
          param: {
            billLineId: billLineId.value,
          },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<BillLineCheckoutTargetResponse>(
        response,
        "Failed to load bill line checkout target",
      );
    },
    enabled: () => billLineId.value !== null,
  });

export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await client.api.commerce.orders[":orderId"].cancel.$post(
        {
          param: {
            orderId,
          },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<
        InferResponseType<CommerceApi["orders"][":orderId"]["cancel"]["$post"]>
      >(response, "Failed to cancel order");
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.commerce.orderDetail(orderId),
      });
      queryClient.invalidateQueries({
        queryKey: ["commerce"],
      });
    },
  });
};

export const useRideHailingCancellationFeePreview = () =>
  useMutation({
    mutationFn: async (orderId: string) => {
      const response = await client.api.commerce.orders[":orderId"]["cancel-fee-preview"].$get(
        {
          param: {
            orderId,
          },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<RideHailingCancellationFeePreviewResponse>(
        response,
        "Failed to query cancellation fee",
      );
    },
  });
