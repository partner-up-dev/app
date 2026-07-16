import type { PartnerRequest } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PRTypeConfigRepository } from "../../../repositories/PRTypeConfigRepository";
import { readVisiblePartnerRequestsByType } from "../../pr-core/services/pr-read.service";
import {
  getProductLocalDateKey,
  getProductLocalDateKeyForTimeWindowStart,
} from "../../pr-core/services/time-window.service";
import {
  type PRDiscoveryCandidate,
  type PRDiscoveryConfigRow,
  type PRDiscoveryListRecord,
  toDiscoveryCandidate,
  toDiscoveryListRecord,
} from "../contracts";

const typeConfigRepo = new PRTypeConfigRepository();
const partnerRepo = new PartnerRepository();

export const normalizeDiscoveryType = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    return throwHttpProblem({
      status: 400,
      detail: "type is required",
      code: "PR_DISCOVERY_TYPE_REQUIRED",
    });
  }
  return normalized;
};

export const normalizeDiscoveryDates = (dates: readonly string[]): string[] => {
  const normalized = Array.from(new Set(dates.map((date) => date.trim()))).filter(Boolean);
  if (normalized.length > 28) {
    return throwHttpProblem({
      status: 400,
      detail: "At most 28 dates may be selected",
      code: "PR_DISCOVERY_DATE_LIMIT",
    });
  }
  if (normalized.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    return throwHttpProblem({
      status: 400,
      detail: "dates must use YYYY-MM-DD",
      code: "PR_DISCOVERY_INVALID_DATE",
    });
  }
  const today = getProductLocalDateKey(new Date());
  if (!today) {
    return throwHttpProblem({
      status: 500,
      detail: "Unable to resolve current product-local date",
      code: "PR_DISCOVERY_DATE_CLOCK_UNAVAILABLE",
    });
  }
  const todayDate = new Date(`${today}T00:00:00Z`);
  const weekStartDate = new Date(todayDate);
  const mondayOffset = (weekStartDate.getUTCDay() + 6) % 7;
  weekStartDate.setUTCDate(weekStartDate.getUTCDate() - mondayOffset);
  const allowedDates = new Set<string>();
  for (let offset = 0; offset < 28; offset += 1) {
    const date = new Date(weekStartDate);
    date.setUTCDate(weekStartDate.getUTCDate() + offset);
    const dateKey = date.toISOString().slice(0, 10);
    if (dateKey >= today) allowedDates.add(dateKey);
  }
  if (normalized.some((date) => !allowedDates.has(date))) {
    return throwHttpProblem({
      status: 400,
      detail: "dates must fall within the next four product-local weeks",
      code: "PR_DISCOVERY_DATE_OUTSIDE_WINDOW",
    });
  }
  return normalized.sort((left, right) => left.localeCompare(right));
};

export const readTypeConfig = async (type: string): Promise<PRDiscoveryConfigRow | null> => {
  const row = await typeConfigRepo.findByType(type);
  if (!row) return null;
  return {
    type: row.type,
    title: row.title,
    description: row.description,
    coverImage: row.coverImage,
    communityQrCode: row.communityQrCode,
    locationPool: row.locationPool,
    routePool: row.routePool,
    discoveryFormRatio: row.discoveryFormRatio,
    discoveryCardRatio: row.discoveryCardRatio,
    discoveryListRatio: row.discoveryListRatio,
  };
};

const DISCOVERY_VISIBLE_STATUSES = new Set(["OPEN"]);
const DISCOVERY_LIST_VISIBLE_STATUSES = new Set(["OPEN", "READY", "ACTIVE", "CLOSED"]);

export const isDiscoveryVisible = (
  pr: Pick<PartnerRequest, "status" | "visibilityStatus">,
): boolean => pr.visibilityStatus === "VISIBLE" && DISCOVERY_VISIBLE_STATUSES.has(pr.status);

export const readDiscoveryRequests = async (type: string): Promise<PartnerRequest[]> => {
  const records = await readVisiblePartnerRequestsByType(type);
  return records.filter(isDiscoveryVisible);
};

/** LIST's public history projection intentionally has no viewer exclusion. */
export const readDiscoveryListRequests = async (type: string): Promise<PartnerRequest[]> => {
  const records = await readVisiblePartnerRequestsByType(type);
  return records.filter(
    (record) =>
      record.visibilityStatus === "VISIBLE" && DISCOVERY_LIST_VISIBLE_STATUSES.has(record.status),
  );
};

export const readDiscoveryCandidates = async (input: {
  type: string;
  dates?: readonly string[];
  viewerUserId?: UserId | null;
}): Promise<PRDiscoveryCandidate[]> => {
  const type = normalizeDiscoveryType(input.type);
  const dates = normalizeDiscoveryDates(input.dates ?? []);
  const records = await readDiscoveryRequests(type);
  const viewerPrIds = await readActiveCandidatePrIdsForViewer(input.viewerUserId);
  const dateSet = dates.length > 0 ? new Set(dates) : null;
  const filtered = dateSet
    ? records.filter((record) => {
        const date = getProductLocalDateKeyForTimeWindowStart(record.time);
        return date !== null && dateSet.has(date);
      })
    : records;
  const viewerFiltered = filtered.filter((record) => !viewerPrIds.has(record.id));

  const counts = await partnerRepo.countActiveByPrIds(viewerFiltered.map((record) => record.id));
  return viewerFiltered
    .map((record) => toDiscoveryCandidate(record, counts.get(record.id) ?? 0))
    .sort(compareCandidates);
};

export const readDiscoveryListRecords = async (input: {
  type: string;
  dates?: readonly string[];
}): Promise<PRDiscoveryListRecord[]> => {
  const type = normalizeDiscoveryType(input.type);
  const dates = normalizeDiscoveryDates(input.dates ?? []);
  const records = await readDiscoveryListRequests(type);
  const dateSet = dates.length > 0 ? new Set(dates) : null;
  const filtered = dateSet
    ? records.filter((record) => {
        const date = getProductLocalDateKeyForTimeWindowStart(record.time);
        return date !== null && dateSet.has(date);
      })
    : records;
  const counts = await partnerRepo.countActiveByPrIds(filtered.map((record) => record.id));
  return filtered
    .map((record) => toDiscoveryListRecord(record, counts.get(record.id) ?? 0))
    .sort(compareListRecords);
};

/** Build CARD/LIST projections from one temporally refreshed public snapshot. */
export const readDiscoveryDirectoryProjections = async (input: {
  type: string;
  dates?: readonly string[];
  viewerUserId?: UserId | null;
}): Promise<{ candidates: PRDiscoveryCandidate[]; listRecords: PRDiscoveryListRecord[] }> => {
  const type = normalizeDiscoveryType(input.type);
  const dates = normalizeDiscoveryDates(input.dates ?? []);
  const records = await readVisiblePartnerRequestsByType(type);
  const dateSet = dates.length > 0 ? new Set(dates) : null;
  const dateFiltered = dateSet
    ? records.filter((record) => {
        const date = getProductLocalDateKeyForTimeWindowStart(record.time);
        return date !== null && dateSet.has(date);
      })
    : records;
  const viewerPrIds = await readActiveCandidatePrIdsForViewer(input.viewerUserId);
  const candidateRecords = dateFiltered.filter(
    (record) => isDiscoveryVisible(record) && !viewerPrIds.has(record.id),
  );
  const listRecords = dateFiltered.filter(
    (record) =>
      record.visibilityStatus === "VISIBLE" && DISCOVERY_LIST_VISIBLE_STATUSES.has(record.status),
  );
  const counts = await partnerRepo.countActiveByPrIds([
    ...new Set([...candidateRecords, ...listRecords].map((record) => record.id)),
  ]);
  return {
    candidates: candidateRecords
      .map((record) => toDiscoveryCandidate(record, counts.get(record.id) ?? 0))
      .sort(compareCandidates),
    listRecords: listRecords
      .map((record) => toDiscoveryListRecord(record, counts.get(record.id) ?? 0))
      .sort(compareListRecords),
  };
};

const parseTimestamp = (value: string | null): number => {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
};

const compareCandidates = (left: PRDiscoveryCandidate, right: PRDiscoveryCandidate): number => {
  const leftTime = parseTimestamp(left.time[0]);
  const rightTime = parseTimestamp(right.time[0]);
  if (leftTime !== rightTime) return leftTime - rightTime;
  const createdDiff = parseTimestamp(right.createdAt) - parseTimestamp(left.createdAt);
  if (createdDiff !== 0) return createdDiff;
  return left.prId - right.prId;
};

const compareListRecords = (left: PRDiscoveryListRecord, right: PRDiscoveryListRecord): number => {
  const leftTime = parseTimestamp(left.time[0]);
  const rightTime = parseTimestamp(right.time[0]);
  if (leftTime !== rightTime) return leftTime - rightTime;
  const createdDiff = parseTimestamp(right.createdAt) - parseTimestamp(left.createdAt);
  if (createdDiff !== 0) return createdDiff;
  return left.prId - right.prId;
};

export const readActiveCandidatePrIdsForViewer = async (
  viewerUserId: UserId | null | undefined,
): Promise<Set<number>> => {
  if (!viewerUserId) return new Set<number>();
  const slots = await partnerRepo.findActiveByUserId(viewerUserId);
  return new Set(slots.map((slot) => slot.prId));
};
