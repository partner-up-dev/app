import { throwHttpProblem } from "../../../lib/problem-details";
import type { AnchorEventId } from "../../../entities/anchor-event";
import type { PRRoute } from "../../../entities/partner-request";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import {
  getProductLocalDateKey,
  getProductLocalDateKeyForTimeWindowStart,
  readVisiblePartnerRequestsByType,
  resolvePRPlaceDisplayName,
} from "../../pr/services";

const ISO_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SEARCH_VISIBLE_WEEK_COUNT = 4;
const DAYS_PER_WEEK = 7;

const anchorEventRepo = new AnchorEventRepository();
const partnerRepo = new PartnerRepository();

export type PRSearchResponse = {
  criteria: {
    eventId: number;
    dates: string[];
  };
  results: Array<{
    pr: {
      id: number;
      canonicalPath: string;
      title: string | null;
      location: string | null;
      route: PRRoute | null;
      placeDisplayName: string | null;
      preferences: string[];
      notes: string | null;
      time: [string | null, string | null];
      status: "OPEN" | "READY";
      minPartners: number | null;
      maxPartners: number | null;
      partnerCount: number;
      createdAt: string;
    };
    anchor: {
      eventId: number;
      timeWindow: [string | null, string | null];
    };
  }>;
};

const formatIsoDateKeyFromUtc = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseIsoDateKey = (value: string): Date | null => {
  if (!ISO_DATE_KEY_PATTERN.test(value)) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
};

const addDaysToIsoDateKey = (value: string, days: number): string | null => {
  const baseDate = parseIsoDateKey(value);
  if (!baseDate) {
    return null;
  }

  baseDate.setUTCDate(baseDate.getUTCDate() + days);
  return formatIsoDateKeyFromUtc(baseDate);
};

const getWeekStartIsoDateKey = (value: string): string | null => {
  const baseDate = parseIsoDateKey(value);
  if (!baseDate) {
    return null;
  }

  const weekdayOffset = (baseDate.getUTCDay() + 6) % 7;
  baseDate.setUTCDate(baseDate.getUTCDate() - weekdayOffset);
  return formatIsoDateKeyFromUtc(baseDate);
};

const normalizeSearchDates = (dates: string[]): string[] =>
  Array.from(
    new Set(
      dates
        .map((value) => value.trim())
        .filter((value) => ISO_DATE_KEY_PATTERN.test(value)),
    ),
  ).sort((left, right) => left.localeCompare(right));

const resolveAllowedSearchDateSet = (): Set<string> => {
  const todayDateKey = getProductLocalDateKey(new Date());
  if (!todayDateKey) {
    return throwHttpProblem({ status: 500, detail: "Unable to resolve current product-local date" });
  }

  const calendarWindowStartDateKey = getWeekStartIsoDateKey(todayDateKey);
  if (!calendarWindowStartDateKey) {
    return throwHttpProblem({ status: 500, detail: "Unable to resolve search calendar window start" });
  }

  const allowed = new Set<string>();
  for (
    let offset = 0;
    offset < SEARCH_VISIBLE_WEEK_COUNT * DAYS_PER_WEEK;
    offset += 1
  ) {
    const dateKey = addDaysToIsoDateKey(calendarWindowStartDateKey, offset);
    if (dateKey && dateKey >= todayDateKey) {
      allowed.add(dateKey);
    }
  }
  return allowed;
};

const resolveSortTimestamp = (value: string | null): number => {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  if (ISO_DATE_KEY_PATTERN.test(value)) {
    const parsed = parseIsoDateKey(value);
    return parsed ? parsed.getTime() : Number.POSITIVE_INFINITY;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? Number.POSITIVE_INFINITY
    : parsed.getTime();
};

export async function searchPRs(input: {
  eventId: AnchorEventId;
  dates: string[];
}): Promise<PRSearchResponse> {
  const normalizedDates = normalizeSearchDates(input.dates);
  if (normalizedDates.length === 0) {
    return throwHttpProblem({ status: 400, detail: "At least one valid search date is required" });
  }

  const allowedDates = resolveAllowedSearchDateSet();
  if (!normalizedDates.every((date) => allowedDates.has(date))) {
    return throwHttpProblem({ status: 400, detail: "Search dates must fall within the current 4-week calendar window" });
  }

  const event = await anchorEventRepo.findById(input.eventId);
  if (!event || event.status !== "ACTIVE") {
    return throwHttpProblem({ status: 404, detail: "Active anchor event not found" });
  }

  const records = await readVisiblePartnerRequestsByType(event.type, {
    consistency: "strong",
  });
  const partnerCounts = await partnerRepo.countActiveByPrIds(
    records.map((record) => record.id),
  );
  const requestedDateSet = new Set(normalizedDates);

  const results = records
    .flatMap((record) => {
      if (record.status !== "OPEN" && record.status !== "READY") {
        return [];
      }

      const startDateKey = getProductLocalDateKeyForTimeWindowStart(
        record.time,
      );
      if (!startDateKey || !requestedDateSet.has(startDateKey)) {
        return [];
      }

      return [
        {
          sortKey: {
            prStart: resolveSortTimestamp(record.time[0]),
            createdAt: record.createdAt.getTime(),
            prId: record.id,
          },
          payload: {
            pr: {
              id: record.id,
              canonicalPath: `/pr/${record.id}`,
              title: record.title,
              location: record.location,
              route: record.route,
              placeDisplayName: resolvePRPlaceDisplayName(record),
              preferences: Array.isArray(record.preferences)
                ? record.preferences
                : [],
              notes: record.notes,
              time: record.time,
              status: record.status,
              minPartners: record.minPartners,
              maxPartners: record.maxPartners,
              partnerCount: partnerCounts.get(record.id) ?? 0,
              createdAt: record.createdAt.toISOString(),
            },
            anchor: {
              eventId: input.eventId,
              timeWindow: record.time,
            },
          },
        },
      ];
    })
    .sort((left, right) => {
      if (left.sortKey.prStart !== right.sortKey.prStart) {
        return left.sortKey.prStart - right.sortKey.prStart;
      }
      if (left.sortKey.createdAt !== right.sortKey.createdAt) {
        return right.sortKey.createdAt - left.sortKey.createdAt;
      }
      return left.sortKey.prId - right.sortKey.prId;
    })
    .map((entry) => entry.payload);

  return {
    criteria: {
      eventId: input.eventId,
      dates: normalizedDates,
    },
    results,
  };
}
