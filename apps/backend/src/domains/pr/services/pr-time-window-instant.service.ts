import { throwHttpProblem } from "../../../lib/problem-details";
import type {
  NaturalLanguagePartnerRequestFields,
  PartnerRequestFields,
  PRAllowEditAfterReady,
} from "../contracts/partner-request";

const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PRODUCT_TIME_ZONE_OFFSET = "+08:00";

const parseDateOnly = (value: string): { year: number; month: number; day: number } | null => {
  if (!ISO_DATE_ONLY_PATTERN.test(value)) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  return { year, month, day };
};

const addProductLocalDays = (dateKey: string, days: number): string => {
  const parsed = parseDateOnly(dateKey);
  if (!parsed) {
    return throwHttpProblem({
      status: 400,
      detail: "Invalid PR date-only time value",
    });
  }

  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
};

const productLocalBoundaryToInstant = (dateKey: string): string => {
  const date = new Date(`${dateKey}T00:00:00${PRODUCT_TIME_ZONE_OFFSET}`);
  if (Number.isNaN(date.getTime())) {
    return throwHttpProblem({
      status: 400,
      detail: "Invalid PR product-local date boundary",
    });
  }
  return date.toISOString();
};

const canonicalizeInstant = (value: string | null): string | null => {
  if (value === null) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return throwHttpProblem({
      status: 400,
      detail: "Invalid PR instant datetime",
    });
  }

  return date.toISOString();
};

export const canonicalizePRTimeWindow = (
  timeWindow: PartnerRequestFields["time"],
): PartnerRequestFields["time"] => [
  canonicalizeInstant(timeWindow[0]),
  canonicalizeInstant(timeWindow[1]),
];

export const canonicalizePRAllowEditAfterReady = (
  policy: PRAllowEditAfterReady | null | undefined,
): PRAllowEditAfterReady | null => {
  if (!policy) return null;

  return {
    ...policy,
    ...(policy.timeWindow
      ? { timeWindow: canonicalizePRTimeWindow(policy.timeWindow) as [string, string] }
      : {}),
  };
};

export const canonicalizePartnerRequestFieldsTime = (
  fields: PartnerRequestFields,
): PartnerRequestFields => ({
  ...fields,
  time: canonicalizePRTimeWindow(fields.time),
});

export const materializeNaturalLanguageTimeWindow = (
  timeWindow: NaturalLanguagePartnerRequestFields["time"],
): PartnerRequestFields["time"] => {
  const [startRaw, endRaw] = timeWindow;
  const startIsDateOnly = typeof startRaw === "string" && ISO_DATE_ONLY_PATTERN.test(startRaw);
  const endIsDateOnly = typeof endRaw === "string" && ISO_DATE_ONLY_PATTERN.test(endRaw);

  if (!startIsDateOnly && !endIsDateOnly) {
    return [canonicalizeInstant(startRaw), canonicalizeInstant(endRaw)];
  }

  const start = startIsDateOnly
    ? productLocalBoundaryToInstant(startRaw)
    : canonicalizeInstant(startRaw);
  const end =
    endRaw === null && startIsDateOnly
      ? productLocalBoundaryToInstant(addProductLocalDays(startRaw, 1))
      : endIsDateOnly
        ? productLocalBoundaryToInstant(addProductLocalDays(endRaw, 1))
        : canonicalizeInstant(endRaw);

  return [start, end];
};

export const materializeNaturalLanguagePartnerRequestFields = (
  fields: NaturalLanguagePartnerRequestFields,
): PartnerRequestFields => ({
  ...fields,
  time: materializeNaturalLanguageTimeWindow(fields.time),
});
