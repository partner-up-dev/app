import { computed, type Ref } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { buildApiError, readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";

type CommerceApi = typeof client.api.commerce;

export type CommercePlacementResponse = InferResponseType<
  CommerceApi["placements"]["$get"]
>;

export type RentalOrderingResponse = InferResponseType<
  CommerceApi["ordering"]["from-placement"]["$get"]
>;

export type RentalOrderingEvaluationInput = Parameters<
  CommerceApi["ordering"]["rental"]["evaluate"]["$post"]
>[0]["json"];

export type RentalOrderCreateInput = Parameters<
  CommerceApi["orders"]["rental"]["$post"]
>[0]["json"];

export type CommerceOrderDetailResponse = InferResponseType<
  CommerceApi["orders"][":orderId"]["$get"]
>;

const readJsonOrThrow = async <T>(response: Response, fallback: string): Promise<T> => {
  if (!response.ok) {
    const payload = await readApiErrorPayload(response);
    throw buildApiError(resolveApiErrorMessage(payload, fallback), payload);
  }
  return (await response.json()) as T;
};

export const useCommercePlacement = (
  contextId: Ref<number | null>,
  type: "BUTTON" = "BUTTON",
) =>
  useQuery<CommercePlacementResponse>({
    queryKey: computed(() => queryKeys.commerce.placement(contextId.value, type)),
    queryFn: async () => {
      if (contextId.value === null) {
        throw new Error("Missing PR context id");
      }

      const response = await client.api.commerce.placements.$get(
        {
          query: {
            context: "pr",
            contextId: String(contextId.value),
            type,
          },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<CommercePlacementResponse>(
        response,
        "Failed to load placement",
      );
    },
    enabled: () => contextId.value !== null,
  });

export const useRentalOrderingFromPlacement = (
  placementInstanceId: Ref<number | null>,
  contextId: Ref<number | null>,
) =>
  useQuery<RentalOrderingResponse>({
    queryKey: computed(() =>
      queryKeys.commerce.rentalOrderingFromPlacement(
        placementInstanceId.value,
        contextId.value,
      ),
    ),
    queryFn: async () => {
      if (placementInstanceId.value === null || contextId.value === null) {
        throw new Error("Missing ordering entry ids");
      }

      const response = await client.api.commerce.ordering["from-placement"].$get(
        {
          query: {
            placementInstanceId: String(placementInstanceId.value),
            context: "pr",
            contextId: String(contextId.value),
          },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<RentalOrderingResponse>(
        response,
        "Failed to load ordering",
      );
    },
    enabled: () => placementInstanceId.value !== null && contextId.value !== null,
  });

export const useEvaluateRentalOrdering = () =>
  useMutation({
    mutationFn: async (input: RentalOrderingEvaluationInput) => {
      const response = await client.api.commerce.ordering.rental.evaluate.$post(
        { json: input },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<
        InferResponseType<CommerceApi["ordering"]["rental"]["evaluate"]["$post"]>
      >(response, "Failed to evaluate ordering");
    },
  });

export const useCreateRentalOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RentalOrderCreateInput) => {
      const response = await client.api.commerce.orders.rental.$post(
        { json: input },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<
        InferResponseType<CommerceApi["orders"]["rental"]["$post"]>
      >(response, "Failed to create rental order");
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

export const useMockRentalPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await client.api.commerce.orders[":orderId"][
        "mock-payment"
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
          CommerceApi["orders"][":orderId"]["mock-payment"]["$post"]
        >
      >(response, "Failed to simulate payment");
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.commerce.orderDetail(orderId),
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
