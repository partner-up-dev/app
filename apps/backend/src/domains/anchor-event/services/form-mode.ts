import { throwHttpProblem } from "../../../lib/problem-details";
import type { AnchorEvent, TimeWindowEntry } from "../../../entities";
import {
  deriveAnchorEventPreferenceTagCategory,
  normalizeAnchorEventPreferenceTagLabel,
} from "./preference-tags";
import {
  DEFAULT_AUTOMATIC_MIN_PARTNERS,
  MIN_MANUAL_PARTNERS,
} from "../../pr-core/services/partner-bounds.service";
import type { CoordinatePair, PRRoute } from "../../../entities/partner-request";

const MINUTE_MS = 60 * 1000;
const MATCHED_START_TOLERANCE_MINUTES = 5;
const EXACT_LOCATION_SCORE = 2;
const LOCATION_MISMATCH_SCORE = -2;
const MATCHED_TIME_SCORE = 2;
const NEAR_TIME_MISMATCH_SCORE = -1;
const FAR_TIME_MISMATCH_SCORE = -2;
const MISSING_TIME_SCORE = -3;
const EXACT_TAG_SCORE_CAP = 2;
const CONFLICTING_TAG_PENALTY_CAP = 4;
const CONFLICTING_TAG_PENALTY = 2;

const parseTimestamp = (value: string): Date | null => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const buildAnchorEventFormModeTimeWindow = (
  event: AnchorEvent,
  startAtIso: string,
  now: Date = new Date(),
): TimeWindowEntry => {
  const startAt = parseTimestamp(startAtIso);
  if (!startAt) {
    return throwHttpProblem({ status: 400, detail: "Invalid startAt" });
  }

  if (startAt.getTime() <= now.getTime()) {
    return throwHttpProblem({ status: 400, detail: "Selected start time has already passed" });
  }

  const durationMinutes = event.timePoolConfig.durationMinutes;
  const endAt =
    durationMinutes === null
      ? null
      : new Date(startAt.getTime() + durationMinutes * MINUTE_MS);
  const earliestLeadMinutes = event.timePoolConfig.earliestLeadMinutes;
  const boundaryAt = endAt ?? startAt;
  if (
    earliestLeadMinutes !== null &&
    boundaryAt.getTime() > now.getTime() + earliestLeadMinutes * MINUTE_MS
  ) {
    return throwHttpProblem({ status: 400, detail: "Selected start time is outside the event lead-time boundary" });
  }

  return [startAt.toISOString(), endAt?.toISOString() ?? null];
};

export const isAnchorEventFormModeStartSelectable = (
  event: Pick<AnchorEvent, "timePoolConfig">,
  startAtIso: string | null,
  now: Date = new Date(),
): boolean => {
  if (!startAtIso) {
    return false;
  }

  const startAt = parseTimestamp(startAtIso);
  if (!startAt || startAt.getTime() <= now.getTime()) {
    return false;
  }

  const earliestLeadMinutes = event.timePoolConfig.earliestLeadMinutes;
  if (earliestLeadMinutes === null) {
    return true;
  }

  return startAt.getTime() <= now.getTime() + earliestLeadMinutes * MINUTE_MS;
};

const normalizePreferenceLabels = (preferences: readonly string[]): string[] => {
  const unique = new Map<string, string>();
  for (const preference of preferences) {
    const normalized = normalizeAnchorEventPreferenceTagLabel(preference);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLocaleLowerCase("zh-CN");
    if (!unique.has(key)) {
      unique.set(key, normalized);
    }
  }
  return Array.from(unique.values());
};

const buildExactMatchKeySet = (preferences: readonly string[]): Set<string> =>
  new Set(
    normalizePreferenceLabels(preferences).map((preference) =>
      preference.toLocaleLowerCase("zh-CN"),
    ),
  );

const buildCategoryMap = (preferences: readonly string[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (const preference of normalizePreferenceLabels(preferences)) {
    const category = deriveAnchorEventPreferenceTagCategory(preference);
    if (!category) {
      continue;
    }
    map.set(category.toLocaleLowerCase("zh-CN"), preference);
  }
  return map;
};

const areCoordinatePairsEqual = (
  left: CoordinatePair | null,
  right: CoordinatePair | null,
): boolean => {
  if (left === null || right === null) {
    return left === right;
  }

  return left[0] === right[0] && left[1] === right[1];
};

const areRoutesEqual = (
  left: PRRoute | null | undefined,
  right: PRRoute | null | undefined,
): boolean => {
  if (!left || !right || left.length !== right.length) {
    return false;
  }

  return left.every((leftPoint, index) => {
    const rightPoint = right[index];
    return (
      rightPoint !== undefined &&
      leftPoint.name === rightPoint.name &&
      leftPoint.full_address === rightPoint.full_address &&
      areCoordinatePairsEqual(leftPoint.wgs84, rightPoint.wgs84) &&
      areCoordinatePairsEqual(leftPoint.bd09, rightPoint.bd09) &&
      areCoordinatePairsEqual(leftPoint.gcj02, rightPoint.gcj02)
    );
  });
};

export type AnchorEventRecommendationMatch = {
  exactPlace: boolean;
  exactLocation: boolean;
  exactRoute: boolean;
  startDeltaMinutes: number | null;
  startWithinTolerance: boolean;
  exactTagMatches: string[];
  conflictingTagMatches: string[];
  groupMomentumScore: number;
  score: number;
};

export const isAnchorEventMatchedRecommendation = (
  match: AnchorEventRecommendationMatch,
): boolean =>
  match.exactPlace &&
  match.startWithinTolerance &&
  match.conflictingTagMatches.length === 0;

const buildStartTimeScore = (startDeltaMinutes: number | null): number => {
  if (startDeltaMinutes === null) {
    return MISSING_TIME_SCORE;
  }
  if (startDeltaMinutes <= MATCHED_START_TOLERANCE_MINUTES) {
    return MATCHED_TIME_SCORE;
  }
  if (startDeltaMinutes <= 30) {
    return NEAR_TIME_MISMATCH_SCORE;
  }
  return FAR_TIME_MISMATCH_SCORE;
};

const buildGroupMomentumScore = (input: {
  candidateMinPartners: number | null;
  activePartnerCount: number;
}): number => {
  const minPartners =
    input.candidateMinPartners !== null &&
    input.candidateMinPartners >= MIN_MANUAL_PARTNERS
      ? input.candidateMinPartners
      : DEFAULT_AUTOMATIC_MIN_PARTNERS;
  const activePartnerCount = Math.max(0, input.activePartnerCount);
  const missingAfterCurrentUserJoins = Math.max(
    0,
    minPartners - (activePartnerCount + 1),
  );

  if (missingAfterCurrentUserJoins === 0) {
    return 2;
  }
  if (missingAfterCurrentUserJoins === 1) {
    return 1;
  }
  return 0;
};

export const buildAnchorEventRecommendationMatch = (input: {
  requestedLocationId?: string | null;
  requestedRoute?: PRRoute | null;
  requestedStartAtIso: string;
  requestedPreferences: string[];
  candidateLocationId: string | null;
  candidateRoute?: PRRoute | null;
  candidateTimeWindow: TimeWindowEntry;
  candidatePreferences: string[];
  candidateMinPartners: number | null;
  activePartnerCount: number;
}): AnchorEventRecommendationMatch => {
  const requestedStart = parseTimestamp(input.requestedStartAtIso);
  const candidateStart = parseTimestamp(input.candidateTimeWindow[0] ?? "");
  const startDeltaMinutes =
    requestedStart && candidateStart
      ? Math.round(
          Math.abs(candidateStart.getTime() - requestedStart.getTime()) / MINUTE_MS,
        )
      : null;

  const exactRequestedPreferences = buildExactMatchKeySet(
    input.requestedPreferences,
  );
  const requestedCategoryMap = buildCategoryMap(input.requestedPreferences);
  const candidatePreferences = normalizePreferenceLabels(input.candidatePreferences);

  const exactTagMatches: string[] = [];
  const conflictingTagMatches: string[] = [];

  for (const candidatePreference of candidatePreferences) {
    const candidateKey = candidatePreference.toLocaleLowerCase("zh-CN");
    if (exactRequestedPreferences.has(candidateKey)) {
      exactTagMatches.push(candidatePreference);
      continue;
    }

    const category = deriveAnchorEventPreferenceTagCategory(candidatePreference);
    if (!category) {
      continue;
    }

    if (requestedCategoryMap.has(category.toLocaleLowerCase("zh-CN"))) {
      conflictingTagMatches.push(candidatePreference);
    }
  }

  const requestedLocationId = input.requestedLocationId?.trim() ?? "";
  const exactLocation =
    requestedLocationId.length > 0 &&
    (input.candidateLocationId?.trim() ?? "") === requestedLocationId;
  const exactRoute = areRoutesEqual(input.requestedRoute, input.candidateRoute);
  const exactPlace = input.requestedRoute ? exactRoute : exactLocation;

  const startWithinTolerance =
    startDeltaMinutes !== null &&
    startDeltaMinutes <= MATCHED_START_TOLERANCE_MINUTES;
  const locationScore = exactPlace ? EXACT_LOCATION_SCORE : LOCATION_MISMATCH_SCORE;
  const timeScore = buildStartTimeScore(startDeltaMinutes);
  const preferenceScore =
    Math.min(exactTagMatches.length, EXACT_TAG_SCORE_CAP) -
    Math.min(
      conflictingTagMatches.length * CONFLICTING_TAG_PENALTY,
      CONFLICTING_TAG_PENALTY_CAP,
    );
  const groupMomentumScore = buildGroupMomentumScore({
    candidateMinPartners: input.candidateMinPartners,
    activePartnerCount: input.activePartnerCount,
  });
  const score = locationScore + timeScore + preferenceScore + groupMomentumScore;

  return {
    exactPlace,
    exactLocation,
    exactRoute,
    startDeltaMinutes,
    startWithinTolerance,
    exactTagMatches,
    conflictingTagMatches,
    groupMomentumScore,
    score,
  };
};
