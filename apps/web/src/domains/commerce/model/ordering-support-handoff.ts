import type { OrderingEntryPayload } from "./ordering-entry-storage";

export const ORDERING_SUPPORT_HANDOFF_STORAGE_KEY = "partner-up.ordering-support-handoff";

export type OrderingSupportSummaryLine = {
  label: string;
  value: string;
};

export type OrderingSupportSummarySection = {
  title: string;
  lines: OrderingSupportSummaryLine[];
};

export type OrderingSupportHandoffPayload = {
  createdAt: string;
  offerId: number;
  prId: number | null;
  productType: OrderingEntryPayload["offerDetail"]["productType"];
  title: string;
  subtitle: string | null;
  priceLabel: string;
  sections: OrderingSupportSummarySection[];
};

const isSummaryLine = (value: unknown): value is OrderingSupportSummaryLine => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.label === "string" && typeof record.value === "string";
};

const isSummarySection = (value: unknown): value is OrderingSupportSummarySection => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.title === "string" &&
    Array.isArray(record.lines) &&
    record.lines.every(isSummaryLine)
  );
};

export const isOrderingSupportHandoffPayload = (
  value: unknown,
): value is OrderingSupportHandoffPayload => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.createdAt === "string" &&
    typeof record.offerId === "number" &&
    (typeof record.prId === "number" || record.prId === null) &&
    typeof record.productType === "string" &&
    typeof record.title === "string" &&
    (typeof record.subtitle === "string" || record.subtitle === null) &&
    typeof record.priceLabel === "string" &&
    Array.isArray(record.sections) &&
    record.sections.every(isSummarySection)
  );
};
