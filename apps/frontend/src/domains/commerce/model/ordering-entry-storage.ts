export const ORDERING_ENTRY_STORAGE_KEY = "partner-up.ordering-entry";

export type OrderingEntryPayload = {
  offerId: number;
  prId?: number;
  bindings: Record<string, unknown>;
};
