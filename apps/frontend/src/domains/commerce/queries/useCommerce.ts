import { computed, type Ref } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { buildApiError, readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";

type CommerceApi = typeof client.api.commerce;
type PlacementApi = typeof client.api.placements;

export type PlacementMatchResponse = InferResponseType<PlacementApi["$post"]>;
export type PlacementInstanceProjection =
  PlacementMatchResponse["placements"][number];

export type OrderingEntryResponse = InferResponseType<
  PlacementApi[":instanceId"]["ordering-entry"]["$post"]
>;

export type OrderingEvaluationInput = Parameters<
  CommerceApi["ordering"]["evaluate"]["$post"]
>[0]["json"];

export type CreateOrderInput = Parameters<
  CommerceApi["orders"]["$post"]
>[0]["json"];

export type CommerceOrderDetailResponse = InferResponseType<
  CommerceApi["orders"][":orderId"]["$get"]
>;

export type BillDetailResponse = InferResponseType<
  CommerceApi["bills"][":billId"]["$get"]
>;

export type PaymentCheckoutResponse = InferResponseType<
  CommerceApi["bill-lines"][":billLineId"]["checkout"]["$get"]
>;

export type PaymentTxResponse = InferResponseType<
  CommerceApi["payments"][":paymentTxId"]["$get"]
>;

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
    queryKey: computed(() => [
      "placements",
      "match",
      type,
      matchingContext.value,
    ]),
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
      return readJsonOrThrow<PlacementMatchResponse>(
        response,
        "Failed to load placement",
      );
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
  return readJsonOrThrow<
    InferResponseType<PlacementApi[":instanceId"]["bindings"]["$post"]>
  >(response, "Failed to resolve placement bindings");
};

export const resolvePlacementOrderingEntry = async (input: {
  placementInstanceId: number;
  matchingContext: unknown;
}) => {
  const response = await client.api.placements[":instanceId"][
    "ordering-entry"
  ].$post(
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
  return readJsonOrThrow<OrderingEntryResponse>(
    response,
    "Failed to resolve ordering entry",
  );
};

export const useEvaluateOrdering = () =>
  useMutation({
    mutationFn: async (input: OrderingEvaluationInput) => {
      const response = await client.api.commerce.ordering.evaluate.$post(
        { json: input },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<
        InferResponseType<CommerceApi["ordering"]["evaluate"]["$post"]>
      >(response, "Failed to evaluate ordering");
    },
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

export const useCommerceOrderDetail = (orderId: Ref<string | null>) =>
  useQuery<CommerceOrderDetailResponse>({
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
      return readJsonOrThrow<CommerceOrderDetailResponse>(
        response,
        "Failed to load order",
      );
    },
    enabled: () => orderId.value !== null,
  });

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
      return readJsonOrThrow<BillDetailResponse>(
        response,
        "Failed to load bill",
      );
    },
    enabled: () => billId.value !== null,
    refetchOnMount: "always",
  });

export const usePaymentCheckout = (billLineId: Ref<string | null>) =>
  useQuery<PaymentCheckoutResponse>({
    queryKey: computed(() =>
      queryKeys.commerce.paymentCheckout(billLineId.value),
    ),
    queryFn: async () => {
      if (billLineId.value === null) {
        throw new Error("Missing bill line id");
      }

      const response = await client.api.commerce["bill-lines"][
        ":billLineId"
      ].checkout.$get(
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
      return readJsonOrThrow<PaymentCheckoutResponse>(
        response,
        "Failed to load checkout",
      );
    },
    enabled: () => billLineId.value !== null,
  });

export const useCreateChargeForBillLine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (billLineId: string) => {
      const response = await client.api.commerce["bill-lines"][":billLineId"]
        .charges.$post(
        {
          param: { billLineId },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<
        InferResponseType<
          CommerceApi["bill-lines"][":billLineId"]["charges"]["$post"]
        >
      >(response, "Failed to create charge");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["commerce"],
      });
    },
  });
};

export const useSyncPaymentTx = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentTxId: string) => {
      const response = await client.api.commerce.payments[":paymentTxId"].sync.$post(
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
      return readJsonOrThrow<
        InferResponseType<
          CommerceApi["payments"][":paymentTxId"]["sync"]["$post"]
        >
      >(response, "Failed to sync payment");
    },
    onSuccess: (_, paymentTxId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.commerce.paymentTx(paymentTxId),
      });
      queryClient.invalidateQueries({
        queryKey: ["commerce"],
      });
    },
  });
};

export const useCancelRentalOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await client.api.commerce.orders[":orderId"][
        "cancel-rental"
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
          CommerceApi["orders"][":orderId"]["cancel-rental"]["$post"]
        >
      >(response, "Failed to cancel rental order");
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.commerce.orderDetail(orderId),
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
