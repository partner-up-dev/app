import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, onScopeDispose, type Ref, watch } from "vue";
import { client } from "@/lib/rpc";
import { buildApiError, readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";
import { queryKeys } from "@/shared/api/query-keys";

type CommerceApi = typeof client.api.commerce;
type PlacementApi = typeof client.api.placements;
type PrApi = typeof client.api.pr;

export type PlacementMatchResponse = InferResponseType<PlacementApi["$post"]>;
export type PlacementInstanceProjection = PlacementMatchResponse["placements"][number];

export type OrderingEntryResponse = InferResponseType<
  PlacementApi[":instanceId"]["ordering-entry"]["$post"]
>;

export type PrOfferOrderLookupResponse = InferResponseType<PrApi[":id"]["orders"]["$get"]>;

export type OfferListingInput = Parameters<
  CommerceApi["offers"][":offerId"]["listing"]["$post"]
>[0]["json"];

export type OfferListingResponse = InferResponseType<
  CommerceApi["offers"][":offerId"]["listing"]["$post"]
>;

export type CreateOrderInput = Parameters<CommerceApi["orders"]["$post"]>[0]["json"];

export type CommerceOrderDetailResponse = InferResponseType<
  CommerceApi["orders"][":orderId"]["$get"]
>;

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
  const phase = detail?.rideHailing?.executionPhase ?? null;
  return phase !== null && activeRideHailingDetailPollingPhases.has(phase);
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

export const listPrOrdersForOffer = async (input: {
  prId: number;
  offerId: number;
  statusIn: Array<"INITIATING" | "OPEN">;
}): Promise<PrOfferOrderLookupResponse> => {
  const response = await client.api.pr[":id"].orders.$get(
    {
      param: { id: String(input.prId) },
      query: {
        offerId: String(input.offerId),
        statusIn: input.statusIn,
      },
    },
    { init: { credentials: "include" } },
  );
  return readJsonOrThrow<PrOfferOrderLookupResponse>(response, "Failed to load PR orders");
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
    mutationFn: async (input: CreateOrderInput) => {
      const response = await client.api.commerce.orders.$post(
        { json: input },
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
      if (orderId.value === null) {
        throw new Error("Missing order id");
      }

      const response = await client.api.commerce.orders[":orderId"].$get(
        {
          param: {
            orderId: orderId.value,
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
        void query.refetch();
      }, ACTIVE_RIDE_HAILING_DETAIL_POLLING_MS);
    },
    { immediate: true },
  );

  onScopeDispose(stopPolling);

  return query;
};

export const useBillDetail = (billId: Ref<string | null>) =>
  useQuery<BillDetailResponse>({
    queryKey: computed(() => queryKeys.commerce.billDetail(billId.value)),
    queryFn: async () => {
      if (billId.value === null) {
        throw new Error("Missing bill id");
      }

      const response = await client.api.commerce.bills[":billId"].$get(
        {
          param: {
            billId: billId.value,
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

export const useMockRentalBookingConfirmation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await client.api.commerce.orders[":orderId"][
        "mock-rental-booking-confirmation"
      ].$post(
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
        InferResponseType<
          CommerceApi["orders"][":orderId"]["mock-rental-booking-confirmation"]["$post"]
        >
      >(response, "Failed to confirm rental booking");
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.commerce.orderDetail(orderId),
      });
    },
  });
};
