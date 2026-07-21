import { ref } from "vue";
import { useRouter } from "vue-router";
import type { OrderingEntryPayload } from "@/domains/commerce/model/ordering-entry-storage";
import {
  type PlacementInstanceProjection,
  resolvePlacementOrderingEntry,
} from "@/domains/commerce/queries/useCommerce";
import { useOrderingHandoffStore } from "@/domains/commerce/use-cases/useOrderingHandoffStore";

export type OpenPlacementOrderingInput = {
  placement: PlacementInstanceProjection;
  matchingContext: unknown;
};

export type PlacementAdmissionOutcome =
  | "EXISTING_ORDER"
  | "CREATOR_ELIGIBLE"
  | "NON_CREATOR"
  | "INACTIVE";

export const usePlacementOrderingEntryFlow = () => {
  const router = useRouter();
  const orderingHandoff = useOrderingHandoffStore();
  const pendingPlacementId = ref<number | null>(null);
  const admissionOutcome = ref<PlacementAdmissionOutcome | null>(null);
  const requestGeneration = ref(0);

  const resetAdmissionOutcome = (): void => {
    requestGeneration.value += 1;
    pendingPlacementId.value = null;
    admissionOutcome.value = null;
  };

  const openPlacementOrdering = async (
    input: OpenPlacementOrderingInput,
  ): Promise<PlacementAdmissionOutcome | null> => {
    const generation = requestGeneration.value + 1;
    requestGeneration.value = generation;
    pendingPlacementId.value = input.placement.id;
    admissionOutcome.value = null;
    try {
      const admission = await resolvePlacementOrderingEntry({
        placementInstanceId: input.placement.id,
        matchingContext: input.matchingContext,
      });
      if (generation !== requestGeneration.value) {
        return null;
      }
      admissionOutcome.value = admission.outcome;

      if (admission.outcome === "EXISTING_ORDER") {
        await router.push({ path: `/orders/${admission.orderId}` });
        return admission.outcome;
      }
      if (admission.outcome !== "CREATOR_ELIGIBLE") {
        return admission.outcome;
      }

      const orderingEntryPayload: OrderingEntryPayload = {
        ...admission.orderingEntry,
        placementContext: {
          placementInstanceId: input.placement.id,
          matchingContext: input.matchingContext,
        },
      };
      orderingHandoff.setOrderingEntry(orderingEntryPayload);
      await router.push({ path: "/order/new" });
      return admission.outcome;
    } catch (error) {
      if (generation !== requestGeneration.value) {
        return null;
      }
      throw error;
    } finally {
      if (generation === requestGeneration.value) {
        pendingPlacementId.value = null;
      }
    }
  };

  return {
    admissionOutcome,
    pendingPlacementId,
    resetAdmissionOutcome,
    openPlacementOrdering,
  };
};
