/**
 * PR read service with explicit consistency modes:
 * - strong: await status synchronization before returning results
 * - eventual: return current snapshot and schedule a background sync
 */

import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PRStatus } from "../contracts/partner-request";
import { refreshTemporalStatus } from "../temporal-refresh";

export type PRReadConsistency = "strong" | "eventual";
type TimeWindowEntry = PartnerRequest["time"];

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

export const isPRPubliclyReadableStatus = (status: PRStatus | string): boolean =>
  status === "OPEN" ||
  status === "READY" ||
  status === "ACTIVE" ||
  status === "CLOSED" ||
  status === "EXPIRED";

export const isPRActiveStatus = (status: PRStatus | string): boolean =>
  status === "OPEN" || status === "READY" || status === "ACTIVE";

const filterPubliclyReadablePartnerRequests = (
  requests: readonly PartnerRequest[],
): PartnerRequest[] => requests.filter((request) => isPRPubliclyReadableStatus(request.status));

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
  const synced = await applyConsistencyToRequests(rows, options.consistency ?? "strong");
  return filterPubliclyReadablePartnerRequests(synced);
}

export async function readVisiblePartnerRequestsByTypeAndTime(
  type: string,
  timeWindow: TimeWindowEntry,
  options: { consistency?: PRReadConsistency } = {},
): Promise<PartnerRequest[]> {
  const rows = await prRepo.findVisibleByTypeAndTime(type, timeWindow);
  const synced = await applyConsistencyToRequests(rows, options.consistency ?? "strong");
  return filterPubliclyReadablePartnerRequests(synced);
}

export async function readVisiblePartnerRequestsByTypeTimeAndLocation(
  type: string,
  timeWindow: TimeWindowEntry,
  location: string,
  options: { consistency?: PRReadConsistency } = {},
): Promise<PartnerRequest[]> {
  const requests = await readVisiblePartnerRequestsByTypeAndTime(type, timeWindow, options);
  return requests.filter((request) => request.location === location);
}

export async function countActiveVisiblePartnerRequestsByTypeTimeAndLocation({
  type,
  timeWindow,
  location,
  excludePrId,
  consistency,
}: {
  type: string;
  timeWindow: TimeWindowEntry;
  location: string;
  excludePrId?: PRId;
  consistency?: PRReadConsistency;
}): Promise<number> {
  const records = await readVisiblePartnerRequestsByTypeTimeAndLocation(
    type,
    timeWindow,
    location,
    {
      consistency,
    },
  );
  return records.filter((request) => {
    if (excludePrId !== undefined && request.id === excludePrId) return false;
    return isPRActiveStatus(request.status);
  }).length;
}
