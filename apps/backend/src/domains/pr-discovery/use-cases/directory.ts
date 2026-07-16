import type { UserId } from "../../../entities/user";
import type { PRDiscoveryDirectoryResponse } from "../contracts";
import { groupPRDiscoveryCandidates } from "../services/card-grouping";
import {
  normalizeDiscoveryDates,
  normalizeDiscoveryType,
  readDiscoveryDirectoryProjections,
} from "../services/read.service";

export const listPRDiscoveryDirectory = async (input: {
  type: string;
  dates?: readonly string[];
  viewerUserId?: UserId | null;
}): Promise<PRDiscoveryDirectoryResponse> => {
  const type = normalizeDiscoveryType(input.type);
  const dates = normalizeDiscoveryDates(input.dates ?? []);
  const projections = await readDiscoveryDirectoryProjections({
    type,
    dates,
    viewerUserId: input.viewerUserId,
  });
  return {
    criteria: { type, dates },
    candidates: projections.candidates,
    listRecords: projections.listRecords,
    cardGroups: groupPRDiscoveryCandidates(projections.candidates),
  };
};
