import { ref } from "vue";
import { useRouter } from "vue-router";
import type { OrderingEntryPayload } from "@/domains/commerce/model/ordering-entry-storage";
import {
  listPrOrdersForOffer,
  type PlacementInstanceProjection,
  resolvePlacementOrderingEntry,
} from "@/domains/commerce/queries/useCommerce";
import { useOrderingHandoffStore } from "@/domains/commerce/use-cases/useOrderingHandoffStore";

export type OpenPlacementOrderingInput = {
  placement: PlacementInstanceProjection;
  matchingContext: unknown;
  prId: number | null;
};

export const usePlacementOrderingEntryFlow = () => {
  const router = useRouter();
  const orderingHandoff = useOrderingHandoffStore();
  const pendingPlacementId = ref<number | null>(null);

  const openPlacementOrdering = async (input: OpenPlacementOrderingInput): Promise<void> => {
    pendingPlacementId.value = input.placement.id;
    try {
      if (input.prId !== null) {
        const orderPayload = await listPrOrdersForOffer({
          prId: input.prId,
          offerId: input.placement.offerId,
          statusIn: ["INITIATING", "OPEN"],
        });
        const existingOrder = orderPayload.orders[0];
        if (existingOrder) {
          await router.push({ path: `/orders/${existingOrder.id}` });
          return;
        }
      }

      const orderingEntry = await resolvePlacementOrderingEntry({
        placementInstanceId: input.placement.id,
        matchingContext: input.matchingContext,
      });
      const orderingEntryPayload: OrderingEntryPayload = {
        ...orderingEntry,
        placementContext: {
          placementInstanceId: input.placement.id,
          matchingContext: input.matchingContext,
        },
      };
      orderingHandoff.setOrderingEntry(orderingEntryPayload);
      await router.push({ path: "/order/new" });
    } finally {
      pendingPlacementId.value = null;
    }
  };

  return {
    pendingPlacementId,
    openPlacementOrdering,
  };
};
