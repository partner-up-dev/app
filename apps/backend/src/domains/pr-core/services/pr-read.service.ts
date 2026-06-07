/**
 * PR read service with explicit consistency modes:
 * - strong: await status synchronization before returning results
 * - eventual: return current snapshot and schedule a background sync
 */

import {
  AnchorEventPRContextRepository,
  type AnchorEventPRContextRecord,
} from "../../../repositories/AnchorEventPRContextRepository";
import type { AnchorEventId } from "../../../entities/anchor-event";
import type { TimeWindowEntry } from "../../../entities/anchor-event";
import type {
  PRId,
  PRStatus,
  PartnerRequest,
} from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { refreshTemporalStatus } from "../temporal-refresh";

export type PRReadConsistency = "strong" | "eventual";

const eventContextRepo = new AnchorEventPRContextRepository();
const prRepo = new PartnerRequestRepository();

const applyEventualRefresh = (request: PartnerRequest): void => {
  void refreshTemporalStatus(request).catch(() => {
    // Intentionally swallow errors for eventual consistency mode.
  });
};

const applyConsistencyToRequest = async (
  request: PartnerRequest,
  consistency: PRReadConsistency,
): Promise<PartnerRequest> => {
  if (consistency === "eventual") {
    applyEventualRefresh(request);
    return request;
  }
  return refreshTemporalStatus(request);
};

const applyConsistencyToRequests = async (
  requests: PartnerRequest[],
  consistency: PRReadConsistency,
): Promise<PartnerRequest[]> => {
  if (consistency === "eventual") {
    requests.forEach((request) => {
      applyEventualRefresh(request);
    });
    return requests;
  }
  return Promise.all(requests.map((request) => refreshTemporalStatus(request)));
};

export const isPublicVisiblePRStatus = (status: PRStatus | string): boolean =>
  status === "OPEN" ||
  status === "READY" ||
  status === "ACTIVE" ||
  status === "CLOSED" ||
  status === "EXPIRED";

export const isActiveVisiblePRStatus = (status: PRStatus | string): boolean =>
  status === "OPEN" || status === "READY" || status === "ACTIVE";

const filterPublicVisibleRequests = (
  requests: readonly PartnerRequest[],
): PartnerRequest[] =>
  requests.filter((request) => isPublicVisiblePRStatus(request.status));

export async function readPartnerRequestById(
  id: PRId,
  options: { consistency?: PRReadConsistency } = {},
): Promise<PartnerRequest | null> {
  const request = await prRepo.findById(id);
  if (!request) return null;
  return applyConsistencyToRequest(request, options.consistency ?? "strong");
}

export async function readPartnerRequestsByIds(
  ids: PRId[],
  options: { consistency?: PRReadConsistency } = {},
): Promise<PartnerRequest[]> {
  const rows = await prRepo.findByIds(ids);
  return applyConsistencyToRequests(rows, options.consistency ?? "strong");
}

export async function readPartnerRequestsByCreatorId(
  userId: UserId,
  options: { consistency?: PRReadConsistency } = {},
): Promise<PartnerRequest[]> {
  const rows = await prRepo.findByCreatorId(userId);
  return applyConsistencyToRequests(rows, options.consistency ?? "strong");
}

export async function readVisiblePartnerRequestsByType(
  type: string,
  options: { consistency?: PRReadConsistency } = {},
): Promise<PartnerRequest[]> {
  const rows = await prRepo.findVisibleByType(type);
  const synced = await applyConsistencyToRequests(
    rows,
    options.consistency ?? "strong",
  );
  return filterPublicVisibleRequests(synced);
}

export async function readVisiblePartnerRequestsByTypeAndTime(
  type: string,
  timeWindow: TimeWindowEntry,
  options: { consistency?: PRReadConsistency } = {},
): Promise<PartnerRequest[]> {
  const rows = await prRepo.findVisibleByTypeAndTime(type, timeWindow);
  const synced = await applyConsistencyToRequests(
    rows,
    options.consistency ?? "strong",
  );
  return filterPublicVisibleRequests(synced);
}

const applyConsistencyToAnchorRecords = async (
  records: AnchorEventPRContextRecord[],
  consistency: PRReadConsistency,
): Promise<AnchorEventPRContextRecord[]> => {
  const syncedRoots = await applyConsistencyToRequests(
    records.map((record) => record.root),
    consistency,
  );
  return records
    .map((record, index) => ({
      ...record,
      root: syncedRoots[index]!,
    }))
    .filter((record) => isPublicVisiblePRStatus(record.root.status));
};

export async function readVisibleAnchorEventPRContextRecordsByEventTimeWindow(
  anchorEventId: AnchorEventId,
  timeWindow: TimeWindowEntry,
  options: { consistency?: PRReadConsistency } = {},
): Promise<AnchorEventPRContextRecord[]> {
  const records = await eventContextRepo.findVisibleByAnchorEventAndTimeWindow(
    anchorEventId,
    timeWindow,
  );
  return applyConsistencyToAnchorRecords(records, options.consistency ?? "strong");
}

export async function readAnchorEventPRContextRecordsByEventTimeWindow(
  anchorEventId: AnchorEventId,
  timeWindow: TimeWindowEntry,
  options: { consistency?: PRReadConsistency } = {},
): Promise<AnchorEventPRContextRecord[]> {
  const records = await eventContextRepo.findByAnchorEventAndTimeWindow(
    anchorEventId,
    timeWindow,
  );
  return applyConsistencyToAnchorRecords(records, options.consistency ?? "strong");
}

export async function readVisibleAnchorEventPRContextRecordsByEventTimeWindowAndLocation(
  anchorEventId: AnchorEventId,
  timeWindow: TimeWindowEntry,
  location: string,
  options: { consistency?: PRReadConsistency } = {},
): Promise<AnchorEventPRContextRecord[]> {
  const records = await eventContextRepo.findVisibleByAnchorEventTimeWindowAndLocation(
    anchorEventId,
    timeWindow,
    location,
  );
  return applyConsistencyToAnchorRecords(records, options.consistency ?? "strong");
}

export async function countActiveVisiblePRsByEventTimeWindowAndLocation({
  anchorEventId,
  timeWindow,
  location,
  excludePrId,
  consistency,
}: {
  anchorEventId: AnchorEventId;
  timeWindow: TimeWindowEntry;
  location: string;
  excludePrId?: PRId;
  consistency?: PRReadConsistency;
}): Promise<number> {
  const records = await readVisibleAnchorEventPRContextRecordsByEventTimeWindowAndLocation(
    anchorEventId,
    timeWindow,
    location,
    { consistency },
  );
  return records.filter((record) => {
    if (excludePrId !== undefined && record.root.id === excludePrId) return false;
    return isActiveVisiblePRStatus(record.root.status);
  }).length;
}
