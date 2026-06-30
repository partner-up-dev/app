import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, onScopeDispose, type Ref, unref, watch } from "vue";
import {
  consumeNextCommerceOrderDetailTrigger,
  createCommerceOrderDetailDebugHeaders,
  createCommerceOrderDetailDebugId,
  describeCommerceOrderDetailDebugError,
  logCommerceOrderDetailDebug,
  markNextCommerceOrderDetailTrigger,
  readCommerceOrderDetailDebugValue,
} from "@/domains/commerce/use-cases/order-detail-debug";
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

const summarizeOrderDetailDebug = (
  detail: CommerceOrderDetailResponse | null | undefined,
): Record<string, unknown> => ({
  dataOrderId: detail?.order.id ?? null,
  dataOrderFamily: detail?.order.family ?? null,
  dataOrderStatus: detail?.order.status ?? null,
  rideProviderOrderId: detail?.rideHailing?.provider.providerOrderId ?? null,
  rideExecutionPhase: detail?.rideHailing?.executionPhase ?? null,
  billId: detail?.bill?.id ?? null,
  billStatus: detail?.bill?.status ?? null,
  billLineCount: detail?.bill?.lines.length ?? 0,
});

const summarizeBillDetailDebug = (
  detail: BillDetailResponse | null | undefined,
): Record<string, unknown> => ({
  responseBillId: detail?.bill.id ?? null,
  responseSourceOrderId: detail?.bill.sourceOrderId ?? null,
  responseBillStatus: detail?.bill.status ?? null,
  responseBillSettlementStatus: detail?.bill.settlementStatus ?? null,
  responseOrderId: detail?.order.id ?? null,
  responseOrderStatus: detail?.order.status ?? null,
  responseLineCount: detail?.lines.length ?? 0,
});

type BillDetailDebugOptions = {
  source?: string;
  orderId?: Ref<string | null> | string | null;
  routeOrderId?: Ref<string | null> | string | null;
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
  let lastRequestedOrderId: string | null = null;
  let pollingTickCount = 0;

  const query = useQuery<CommerceOrderDetailResponse>({
    queryKey: computed(() => queryKeys.commerce.orderDetail(orderId.value)),
    queryFn: async () => {
      const currentOrderId = orderId.value;
      if (currentOrderId === null) {
        throw new Error("Missing order id");
      }

      const requestId = createCommerceOrderDetailDebugId("detail");
      const trigger =
        consumeNextCommerceOrderDetailTrigger(currentOrderId) ??
        (lastRequestedOrderId === null
          ? "initial-order-load"
          : lastRequestedOrderId === currentOrderId
            ? "query-refetch"
            : "order-id-change");
      const startedAtMs = Date.now();

      logCommerceOrderDetailDebug("detail.query.start", {
        requestId,
        trigger,
        routeOrderId: currentOrderId,
      });
      lastRequestedOrderId = currentOrderId;

      try {
        const response = await client.api.commerce.orders[":orderId"].$get(
          {
            param: {
              orderId: currentOrderId,
            },
          },
          {
            init: {
              credentials: "include",
              headers: createCommerceOrderDetailDebugHeaders({
                channel: "detail",
                source: "useCommerceOrderDetail",
                requestId,
                orderId: currentOrderId,
                routeOrderId: currentOrderId,
                trigger,
              }),
            },
          },
        );
        const detail = await readJsonOrThrow<CommerceOrderDetailResponse>(
          response,
          "Failed to load order",
        );
        logCommerceOrderDetailDebug("detail.query.success", {
          requestId,
          trigger,
          routeOrderId: currentOrderId,
          durationMs: Date.now() - startedAtMs,
          ...summarizeOrderDetailDebug(detail),
        });
        return detail;
      } catch (error) {
        logCommerceOrderDetailDebug("detail.query.error", {
          requestId,
          trigger,
          routeOrderId: currentOrderId,
          durationMs: Date.now() - startedAtMs,
          error: describeCommerceOrderDetailDebugError(error),
        });
        throw error;
      }
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
      logCommerceOrderDetailDebug("detail.poll.evaluate", {
        routeOrderId: orderId.value,
        shouldPoll,
        ...summarizeOrderDetailDebug(query.data.value),
      });
      stopPolling();
      if (!shouldPoll) return;
      pollingIntervalId = setInterval(() => {
        pollingTickCount += 1;
        markNextCommerceOrderDetailTrigger(orderId.value, "polling-interval");
        logCommerceOrderDetailDebug("detail.poll.tick", {
          routeOrderId: orderId.value,
          pollingTickCount,
          ...summarizeOrderDetailDebug(query.data.value),
        });
        void query.refetch();
      }, ACTIVE_RIDE_HAILING_DETAIL_POLLING_MS);
    },
    { immediate: true },
  );

  watch(
    () => ({
      routeOrderId: orderId.value,
      status: query.status.value,
      fetchStatus: query.fetchStatus.value,
      isPending: query.isPending.value,
      isFetching: query.isFetching.value,
      isRefetching: query.isRefetching.value,
      error: query.error.value ? describeCommerceOrderDetailDebugError(query.error.value) : null,
      ...summarizeOrderDetailDebug(query.data.value),
    }),
    (snapshot) => {
      logCommerceOrderDetailDebug("detail.query.state", snapshot);
    },
    { immediate: true },
  );

  onScopeDispose(stopPolling);

  return query;
};

export const useBillDetail = (billId: Ref<string | null>, debug?: BillDetailDebugOptions) => {
  let lastRequestedBillId: string | null = null;

  const query = useQuery<BillDetailResponse>({
    queryKey: computed(() => queryKeys.commerce.billDetail(billId.value)),
    queryFn: async () => {
      const currentBillId = billId.value;
      if (currentBillId === null) {
        throw new Error("Missing bill id");
      }

      const requestId = createCommerceOrderDetailDebugId("bill");
      const trigger =
        lastRequestedBillId === null
          ? "initial-bill-load"
          : lastRequestedBillId === currentBillId
            ? "bill-refetch"
            : "bill-id-change";
      const startedAtMs = Date.now();
      const debugOrderId = readCommerceOrderDetailDebugValue(debug?.orderId);
      const debugRouteOrderId = readCommerceOrderDetailDebugValue(debug?.routeOrderId);

      logCommerceOrderDetailDebug("bill.query.start", {
        requestId,
        trigger,
        billId: currentBillId,
        orderId: debugOrderId,
        routeOrderId: debugRouteOrderId,
        source: debug?.source ?? "useBillDetail",
      });
      lastRequestedBillId = currentBillId;

      try {
        const response = await client.api.commerce.bills[":billId"].$get(
          {
            param: {
              billId: currentBillId,
            },
          },
          {
            init: {
              credentials: "include",
              headers: createCommerceOrderDetailDebugHeaders({
                channel: "bill",
                source: debug?.source ?? "useBillDetail",
                requestId,
                orderId: debugOrderId,
                routeOrderId: debugRouteOrderId,
                billId: currentBillId,
                trigger,
              }),
            },
          },
        );
        const detail = await readJsonOrThrow<BillDetailResponse>(response, "Failed to load bill");
        logCommerceOrderDetailDebug("bill.query.success", {
          requestId,
          trigger,
          billId: currentBillId,
          orderId: debugOrderId,
          routeOrderId: debugRouteOrderId,
          durationMs: Date.now() - startedAtMs,
          ...summarizeBillDetailDebug(detail),
        });
        return detail;
      } catch (error) {
        logCommerceOrderDetailDebug("bill.query.error", {
          requestId,
          trigger,
          billId: currentBillId,
          orderId: debugOrderId,
          routeOrderId: debugRouteOrderId,
          durationMs: Date.now() - startedAtMs,
          error: describeCommerceOrderDetailDebugError(error),
        });
        throw error;
      }
    },
    enabled: () => billId.value !== null,
    refetchOnMount: "always",
  });

  watch(
    () => ({
      billId: billId.value,
      orderId: readCommerceOrderDetailDebugValue(debug?.orderId),
      routeOrderId: readCommerceOrderDetailDebugValue(debug?.routeOrderId),
      source: debug?.source ?? "useBillDetail",
      status: query.status.value,
      fetchStatus: query.fetchStatus.value,
      isPending: query.isPending.value,
      isFetching: query.isFetching.value,
      isRefetching: query.isRefetching.value,
      error: query.error.value ? describeCommerceOrderDetailDebugError(query.error.value) : null,
      ...summarizeBillDetailDebug(query.data.value),
    }),
    (snapshot) => {
      logCommerceOrderDetailDebug("bill.query.state", snapshot);
    },
    { immediate: true },
  );

  return query;
};

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
  const pendingCancelRequestIds = new Map<string, string>();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const requestId = createCommerceOrderDetailDebugId("cancel");
      pendingCancelRequestIds.set(orderId, requestId);
      const startedAtMs = Date.now();

      logCommerceOrderDetailDebug("cancel.mutation.start", {
        requestId,
        orderId,
      });

      try {
        const response = await client.api.commerce.orders[":orderId"].cancel.$post(
          {
            param: {
              orderId,
            },
          },
          {
            init: {
              credentials: "include",
              headers: createCommerceOrderDetailDebugHeaders({
                channel: "cancel",
                source: "useCancelOrder",
                requestId,
                orderId,
                routeOrderId: orderId,
                trigger: "mutation",
              }),
            },
          },
        );
        const result = await readJsonOrThrow<
          InferResponseType<CommerceApi["orders"][":orderId"]["cancel"]["$post"]>
        >(response, "Failed to cancel order");
        logCommerceOrderDetailDebug("cancel.mutation.success", {
          requestId,
          orderId,
          durationMs: Date.now() - startedAtMs,
          resultStatus: "status" in result ? result.status : null,
          effectKind: "effectKind" in result ? result.effectKind : null,
          effectAmountFen: "effectAmountFen" in result ? result.effectAmountFen : null,
        });
        return result;
      } catch (error) {
        logCommerceOrderDetailDebug("cancel.mutation.error", {
          requestId,
          orderId,
          durationMs: Date.now() - startedAtMs,
          error: describeCommerceOrderDetailDebugError(error),
        });
        throw error;
      }
    },
    onSuccess: (_, orderId) => {
      const requestId = pendingCancelRequestIds.get(orderId) ?? null;
      markNextCommerceOrderDetailTrigger(orderId, "cancel-mutation-success");
      logCommerceOrderDetailDebug("cancel.query.invalidate", {
        requestId,
        orderId,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.commerce.orderDetail(orderId),
      });
      queryClient.invalidateQueries({
        queryKey: ["commerce"],
      });
    },
    onSettled: (_, __, orderId) => {
      pendingCancelRequestIds.delete(orderId);
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
