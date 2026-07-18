import type { PRRoute } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import {
  derivePRPreferenceCategory,
  normalizePRPreferenceLabels,
} from "../../pr/contracts";
import {
  type PRDiscoveryPlaceSelection,
  type PRDiscoveryRecommendationCandidate,
  type PRDiscoveryRecommendationMatch,
  type PRDiscoveryRecommendationResponse,
  toDiscoveryCandidate,
} from "../contracts";
import {
  normalizeDiscoveryType,
  readActiveCandidatePrIdsForViewer,
  readDiscoveryRequests,
  readTypeConfig,
} from "../services/read.service";

const partnerRepo = new PartnerRepository();
const MAX_ORDERED_CANDIDATE_COUNT = 6;
const MATCHED_START_TOLERANCE_MINUTES = 5;

export type PRDiscoveryRecommendationInput = {
  type: string;
  place: PRDiscoveryPlaceSelection;
  timeWindows: Array<{ startAt: string; endAt: string }>;
  preferences: string[];
  viewerUserId?: UserId | null;
};

const areCoordinatePairsEqual = (
  left: [number, number] | null,
  right: [number, number] | null,
): boolean =>
  left === right ||
  (left !== null && right !== null && left[0] === right[0] && left[1] === right[1]);

const areRoutesEqual = (
  left: PRRoute | null | undefined,
  right: PRRoute | null | undefined,
): boolean => {
  if (!left || !right || left.length !== right.length) return false;
  return left.every((point, index) => {
    const other = right[index];
    return Boolean(
      other &&
      point.name === other.name &&
      point.full_address === other.full_address &&
      areCoordinatePairsEqual(point.wgs84, other.wgs84) &&
      areCoordinatePairsEqual(point.bd09, other.bd09) &&
      areCoordinatePairsEqual(point.gcj02, other.gcj02),
    );
  });
};

const reverseRoute = (route: PRRoute): PRRoute => [...route].reverse();

const isRouteWithinConfiguredScope = (
  route: PRRoute,
  configuredRoutes: readonly { route: PRRoute }[],
): boolean =>
  configuredRoutes.some(
    (entry) =>
      areRoutesEqual(entry.route, route) || areRoutesEqual(reverseRoute(entry.route), route),
  );

const startTimeScore = (startDeltaMinutes: number | null): number => {
  if (startDeltaMinutes === null) return -3;
  if (startDeltaMinutes <= MATCHED_START_TOLERANCE_MINUTES) return 2;
  if (startDeltaMinutes <= 30) return -1;
  return -2;
};

const parseInstant = (value: string | null): number | null => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const normalizeTimeWindows = (
  windows: readonly { startAt: string; endAt: string }[],
): Array<{ startAt: string; endAt: string }> => {
  if (windows.length < 1 || windows.length > 14) {
    return throwHttpProblem({
      status: 400,
      detail: "timeWindows must contain between 1 and 14 entries",
      code: "PR_DISCOVERY_INVALID_TIME_WINDOWS",
    });
  }
  return windows.map((window) => {
    const start = parseInstant(window.startAt);
    const end = parseInstant(window.endAt);
    if (start === null || end === null || end < start) {
      return throwHttpProblem({
        status: 400,
        detail: "Invalid recommendation time window",
        code: "PR_DISCOVERY_INVALID_TIME_WINDOW",
      });
    }
    return { startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString() };
  });
};

const candidateStartMatchesWindow = (
  candidateStart: number | null,
  window: { startAt: string; endAt: string },
): boolean => {
  const start = parseInstant(window.startAt);
  const end = parseInstant(window.endAt);
  if (candidateStart === null || start === null || end === null) return false;
  return start === end ? candidateStart === start : candidateStart >= start && candidateStart < end;
};

const candidateStartDelta = (
  candidateStart: number | null,
  windows: readonly { startAt: string; endAt: string }[],
): number | null => {
  if (candidateStart === null) return null;
  const deltas = windows.flatMap((window) => {
    const start = parseInstant(window.startAt);
    const end = parseInstant(window.endAt);
    if (start === null || end === null) return [];
    if (candidateStart >= start && candidateStart < end) return [0];
    return [Math.abs(candidateStart - start), Math.abs(candidateStart - end)];
  });
  if (deltas.length === 0) return null;
  return Math.round(Math.min(...deltas) / 60_000);
};

const buildMatch = (input: {
  place: PRDiscoveryPlaceSelection;
  timeWindows: Array<{ startAt: string; endAt: string }>;
  preferences: string[];
  location: string | null;
  route: PRRoute | null;
  time: [string | null, string | null];
  candidatePreferences: string[];
  minPartners: number | null;
  partnerCount: number;
}): PRDiscoveryRecommendationMatch => {
  const exactLocation =
    input.place.kind === "location" && input.location?.trim() === input.place.location;
  const exactRoute = input.place.kind === "route" && areRoutesEqual(input.route, input.place.route);
  const exactPlace = exactLocation || exactRoute;
  const candidateStart = parseInstant(input.time[0]);
  const startWithinWindow = input.timeWindows.some((window) =>
    candidateStartMatchesWindow(candidateStart, window),
  );
  const startDeltaMinutes = candidateStartDelta(candidateStart, input.timeWindows);
  const wanted = new Set(input.preferences.map((value) => value.toLocaleLowerCase("zh-CN")));
  const requestedCategories = new Set(
    input.preferences.flatMap((value) => {
      const category = derivePRPreferenceCategory(value);
      return category ? [category.toLocaleLowerCase("zh-CN")] : [];
    }),
  );
  const candidatePreferences = normalizePRPreferenceLabels(input.candidatePreferences);
  const exactTagMatches: string[] = [];
  const conflictingTagMatches: string[] = [];
  for (const candidatePreference of candidatePreferences) {
    const candidateKey = candidatePreference.toLocaleLowerCase("zh-CN");
    if (wanted.has(candidateKey)) {
      exactTagMatches.push(candidatePreference);
      continue;
    }
    const category = derivePRPreferenceCategory(candidatePreference);
    if (category && requestedCategories.has(category.toLocaleLowerCase("zh-CN"))) {
      conflictingTagMatches.push(candidatePreference);
    }
  }
  const minPartners = input.minPartners !== null && input.minPartners >= 2 ? input.minPartners : 2;
  const missingAfterJoin = Math.max(0, minPartners - (Math.max(0, input.partnerCount) + 1));
  const groupMomentumScore = missingAfterJoin === 0 ? 2 : missingAfterJoin === 1 ? 1 : 0;
  const score =
    (exactPlace ? 2 : -2) +
    startTimeScore(startDeltaMinutes) +
    Math.min(exactTagMatches.length, 2) -
    Math.min(conflictingTagMatches.length * 2, 4) +
    groupMomentumScore;
  return {
    exactPlace,
    exactLocation,
    exactRoute,
    startDeltaMinutes,
    startWithinWindow,
    exactTagMatches,
    conflictingTagMatches,
    groupMomentumScore,
    score,
  };
};

const isMatched = (match: PRDiscoveryRecommendationMatch): boolean =>
  match.exactPlace && match.startWithinWindow && match.conflictingTagMatches.length === 0;

export const recommendPRDiscoveryCandidates = async (
  input: PRDiscoveryRecommendationInput,
): Promise<PRDiscoveryRecommendationResponse> => {
  const type = normalizeDiscoveryType(input.type);
  const config = await readTypeConfig(type);
  const place =
    input.place.kind === "location"
      ? { kind: "location" as const, location: input.place.location.trim() }
      : input.place;
  if (place.kind === "location" && !place.location) {
    return throwHttpProblem({
      status: 400,
      detail: "place.location is required",
      code: "PR_DISCOVERY_PLACE_REQUIRED",
    });
  }
  if (place.kind === "location" && config && !config.locationPool.includes(place.location)) {
    return throwHttpProblem({
      status: 400,
      detail: "Selected location is outside the PR type scope",
      code: "PR_DISCOVERY_LOCATION_OUTSIDE_SCOPE",
    });
  }
  if (
    place.kind === "route" &&
    config &&
    !isRouteWithinConfiguredScope(place.route, config.routePool)
  ) {
    return throwHttpProblem({
      status: 400,
      detail: "Selected route is outside the PR type scope",
      code: "PR_DISCOVERY_ROUTE_OUTSIDE_SCOPE",
    });
  }
  const timeWindows = normalizeTimeWindows(input.timeWindows);
  const preferences = normalizePRPreferenceLabels(input.preferences);
  const viewerPrIds = await readActiveCandidatePrIdsForViewer(input.viewerUserId);
  const records = (await readDiscoveryRequests(type)).filter((record) => {
    if (viewerPrIds.has(record.id)) return false;
    if (!config) return false;
    if (place.kind === "location") {
      const location = record.location?.trim() ?? "";
      return config.locationPool.includes(location);
    }
    return areRoutesEqual(record.route, place.route);
  });
  const partnerCounts = await partnerRepo.countActiveByPrIds(records.map((record) => record.id));
  const ranked = records
    .map((record): PRDiscoveryRecommendationCandidate => {
      const partnerCount = partnerCounts.get(record.id) ?? 0;
      const candidate = toDiscoveryCandidate(record, partnerCount);
      return {
        ...candidate,
        match: buildMatch({
          place,
          timeWindows,
          preferences,
          location: record.location,
          route: record.route,
          time: record.time,
          candidatePreferences: record.preferences,
          minPartners: record.minPartners,
          partnerCount,
        }),
      };
    })
    .sort(
      (left, right) =>
        right.match.score - left.match.score ||
        (left.match.startDeltaMinutes ?? Infinity) - (right.match.startDeltaMinutes ?? Infinity) ||
        right.createdAt.localeCompare(left.createdAt),
    );
  const matchedCandidate = ranked.find((candidate) => isMatched(candidate.match)) ?? null;
  return {
    selection: { type, place, timeWindows, preferences },
    matchedCandidate,
    orderedCandidates: matchedCandidate ? [] : ranked.slice(0, MAX_ORDERED_CANDIDATE_COUNT),
  };
};
