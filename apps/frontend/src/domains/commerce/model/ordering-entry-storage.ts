import type { OrderingOfferDetail } from "@partner-up-dev/backend";

export const ORDERING_ENTRY_STORAGE_KEY = "partner-up.ordering-entry";

export type OrderingEntryPayload = {
  source: {
    offerId: number;
  };
  offerDetail: OrderingOfferDetail;
  prId?: number;
  bindings: Record<string, unknown>;
};
