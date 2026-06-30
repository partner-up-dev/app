import type { OrderingOfferDetail } from "@partner-up-dev/backend";

export const ORDERING_ENTRY_STORAGE_KEY = "partner-up.ordering-entry";

export type OrderingEntryPayload = {
  source: {
    offerId: number;
  };
  offerDetail: OrderingOfferDetail;
  prId?: number;
  bindings: Record<string, unknown>;
  bindingLocks: Record<string, true>;
  placementContext?: OrderingEntryPlacementContext;
};

export type OrderingEntryPlacementContext = {
  placementInstanceId: number;
  matchingContext: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeBindingLocks = (value: unknown): Record<string, true> => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, true] => entry[1] === true),
  );
};

const normalizePlacementContext = (value: unknown): OrderingEntryPlacementContext | undefined => {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.placementInstanceId !== "number" ||
    !Number.isInteger(value.placementInstanceId) ||
    value.placementInstanceId <= 0
  ) {
    return undefined;
  }
  return {
    placementInstanceId: value.placementInstanceId,
    matchingContext: value.matchingContext,
  };
};

export const normalizeOrderingEntryPayload = (value: unknown): OrderingEntryPayload | null => {
  if (!isRecord(value)) return null;
  const source = value.source;
  if (!isRecord(source) || typeof source.offerId !== "number") return null;
  if (!isRecord(value.offerDetail)) return null;
  const placementContext = normalizePlacementContext(value.placementContext);

  return {
    source: {
      offerId: source.offerId,
    },
    offerDetail: value.offerDetail as OrderingOfferDetail,
    prId: typeof value.prId === "number" ? value.prId : undefined,
    bindings: isRecord(value.bindings) ? value.bindings : {},
    bindingLocks: normalizeBindingLocks(value.bindingLocks),
    ...(placementContext ? { placementContext } : {}),
  };
};

export const parseOrderingEntryPayload = (raw: string | null): OrderingEntryPayload | null => {
  if (!raw) return null;
  try {
    return normalizeOrderingEntryPayload(JSON.parse(raw));
  } catch {
    return null;
  }
};
