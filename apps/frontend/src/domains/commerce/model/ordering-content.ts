import type { OrderingEntryPayload } from "./ordering-entry-storage";
import type { CreateOrderInput } from "../queries/useCommerce";

export type OrderingContentInput = {
  source: OrderingEntryPayload["source"];
  offerDetail: OrderingEntryPayload["offerDetail"];
  bindings: Record<string, unknown>;
  bindingLocks: OrderingEntryPayload["bindingLocks"];
};

export type OrderingContentOutput = {
  participants: CreateOrderInput["participants"];
  items: CreateOrderInput["items"];
  productTypedExtraProperties: CreateOrderInput["productTypedExtraProperties"];
};

export type OrderingContentPriceExplanation = {
  sourceId: string;
  label: string;
  description: string;
  deltaFen: number | null;
  resultAmountFen?: number | null;
};

export type OrderingContentPriceSummary = {
  currency: "CNY";
  totalFen: number | null;
  range?: {
    minFen: number | null;
    maxFen: number | null;
  } | null;
  explanations: OrderingContentPriceExplanation[];
};

export type OrderingContentSummary = {
  price: OrderingContentPriceSummary | null;
};

export type BoundOrderParticipant = {
  userId: string;
  displayName: string;
  phoneMasked: string | null;
};

export const readBindingValue = (
  bindings: Record<string, unknown>,
  key: string,
): unknown | null => bindings[key] ?? null;

export const isBindingLocked = (
  input: Pick<OrderingContentInput, "bindingLocks">,
  key: string,
): boolean => input.bindingLocks[key] === true;

export const readBoundOrderParticipants = (
  bindings: Record<string, unknown>,
): BoundOrderParticipant[] => {
  const value = readBindingValue(bindings, "orderParticipants");
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return [];
    }
    const record = item as Record<string, unknown>;
    if (typeof record.userId !== "string") return [];
    return [
      {
        userId: record.userId,
        displayName:
          typeof record.displayName === "string" ? record.displayName : "参与者",
        phoneMasked:
          typeof record.phoneMasked === "string" ? record.phoneMasked : null,
      },
    ];
  });
};
