import { throwHttpProblem } from "../../../lib/problem-details";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { AnchorEventPRContextRepository } from "../../../repositories/AnchorEventPRContextRepository";
import type {
  AnchorEvent,
  AnchorEventId,
  PRRoute,
  PRStatus,
  UserId,
} from "../../../entities";
import {
  arePRRoutesEqual,
  findEventRoutePoolEntry,
  isPublicEventScopedLocation,
  resolveEventRoutePool,
  resolvePublicEventLocationPool,
} from "../services/event-scope";
import {
  buildAnchorEventRecommendationMatch,
  isAnchorEventMatchedRecommendation,
  resolveAnchorEventFormModeSelectionTimeWindows,
  type AnchorEventFormModeTimeSelection,
} from "../services/form-mode";

const anchorEventRepo = new AnchorEventRepository();
const eventContextRepo = new AnchorEventPRContextRepository();
const partnerRepo = new PartnerRepository();

const RECOMMENDABLE_PR_STATUSES = new Set<PRStatus>(["OPEN", "READY"]);
const MAX_ORDERED_CANDIDATE_COUNT = 6;

export type AnchorEventFormModeRecommendationPlaceSelection =
  | {
      kind: "location";
      locationId: string;
    }
  | {
      kind: "route";
      routePoolEntryId: string;
    };

type ResolvedRecommendationPlace =
  | {
      kind: "location";
      locationId: string;
      routePoolEntryId: null;
      route: null;
    }
  | {
      kind: "route";
      locationId: null;
      routePoolEntryId: string;
      route: PRRoute;
    };

const findActivePartnerPrIdsByUser = async (
  userId: UserId | null | undefined,
): Promise<Set<number>> => {
  if (!userId) {
    return new Set<number>();
  }

  const slots = await partnerRepo.findActiveByUserId(userId);
  return new Set(slots.map((slot) => slot.prId));
};

export interface AnchorEventFormModeRecommendationResponse {
  event: {
    id: number;
    title: string;
  };
  selection: {
    kind: "location" | "route";
    locationId: string | null;
    routePoolEntryId: string | null;
    timeMode: "EXACT" | "FUZZY";
    timeWindow: [string, string | null];
    timeWindows: Array<[string, string | null]>;
    preferences: string[];
  };
  matchedRecommendation: FormModeRecommendationCandidate | null;
  orderedCandidates: FormModeRecommendationCandidate[];
}

export interface FormModeRecommendationCandidate {
  pr: {
    id: number;
    title: string | null;
    type: string;
    location: string | null;
    route: PRRoute | null;
    time: [string | null, string | null];
    status: PRStatus;
    minPartners: number | null;
    maxPartners: number | null;
    preferences: string[];
    notes: string | null;
    partnerCount: number;
    createdAt: string;
  };
  match: {
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
}

const resolveRecommendationPlace = async (
  event: AnchorEvent,
  place: AnchorEventFormModeRecommendationPlaceSelection,
): Promise<ResolvedRecommendationPlace> => {
  if (place.kind === "route") {
    const routePoolEntry = findEventRoutePoolEntry(event, place.routePoolEntryId);
    if (!routePoolEntry) {
      return throwHttpProblem({
        status: 400,
        detail: "Selected route is outside the anchor event scope",
      });
    }

    return {
      kind: "route",
      locationId: null,
      routePoolEntryId: routePoolEntry.id,
      route: routePoolEntry.route,
    };
  }

  const locationId = place.locationId.trim();
  if (!(await isPublicEventScopedLocation(event, locationId))) {
    return throwHttpProblem({
      status: 400,
      detail: "Selected location is outside the anchor event scope",
    });
  }

  return {
    kind: "location",
    locationId,
    routePoolEntryId: null,
    route: null,
  };
};

const buildBestTimeSelectionMatch = (input: {
  requestedLocationId?: string | null;
  requestedRoute?: PRRoute | null;
  requestedStartAtIsos: readonly string[];
  requestedPreferences: string[];
  candidateLocationId: string | null;
  candidateRoute?: PRRoute | null;
  candidateTimeWindow: [string | null, string | null];
  candidatePreferences: string[];
  candidateMinPartners: number | null;
  activePartnerCount: number;
}) =>
  input.requestedStartAtIsos
    .map((requestedStartAtIso) =>
      buildAnchorEventRecommendationMatch({
        requestedLocationId: input.requestedLocationId,
        requestedRoute: input.requestedRoute,
        requestedStartAtIso,
        requestedPreferences: input.requestedPreferences,
        candidateLocationId: input.candidateLocationId,
        candidateRoute: input.candidateRoute,
        candidateTimeWindow: input.candidateTimeWindow,
        candidatePreferences: input.candidatePreferences,
        candidateMinPartners: input.candidateMinPartners,
        activePartnerCount: input.activePartnerCount,
      }),
    )
    .sort((left, right) => {
      const leftMatched = isAnchorEventMatchedRecommendation(left) ? 1 : 0;
      const rightMatched = isAnchorEventMatchedRecommendation(right) ? 1 : 0;
      if (leftMatched !== rightMatched) {
        return rightMatched - leftMatched;
      }
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      const leftDelta = left.startDeltaMinutes ?? Number.POSITIVE_INFINITY;
      const rightDelta = right.startDeltaMinutes ?? Number.POSITIVE_INFINITY;
      return leftDelta - rightDelta;
    })[0];

export async function recommendAnchorEventFormModePRs(input: {
  eventId: AnchorEventId;
  viewerUserId?: UserId | null;
  place: AnchorEventFormModeRecommendationPlaceSelection;
  timeSelection: AnchorEventFormModeTimeSelection;
  preferences: string[];
}): Promise<AnchorEventFormModeRecommendationResponse> {
  const event = await anchorEventRepo.findById(input.eventId);
  if (!event) {
    return throwHttpProblem({ status: 404, detail: "Anchor event not found" });
  }

  const selectedPlace = await resolveRecommendationPlace(event, input.place);

  const selectionTimeWindows = resolveAnchorEventFormModeSelectionTimeWindows(
    event,
    input.timeSelection,
  );
  const requestedStartAtIsos = selectionTimeWindows.map((timeWindow) => timeWindow[0]);
  const selectionPreferences = Array.from(
    new Set(input.preferences.map((preference) => preference.trim()).filter(Boolean)),
  );
  const publicLocationSet = new Set(await resolvePublicEventLocationPool(event));
  const routePool = resolveEventRoutePool(event);

  const scopedCandidateRecords = (await eventContextRepo.findVisibleByAnchorEventId(event.id))
    .filter((record) => RECOMMENDABLE_PR_STATUSES.has(record.root.status))
    .filter((record) => {
      if (selectedPlace.kind === "route") {
        return routePool.some((entry) =>
          arePRRoutesEqual(entry.route, record.root.route),
        );
      }

      const location = record.root.location?.trim() ?? "";
      return location.length > 0 && publicLocationSet.has(location);
    })
    .filter((record) => record.root.id !== undefined);
  const activePartnerPrIds = await findActivePartnerPrIdsByUser(
    input.viewerUserId,
  );
  const candidateRecords =
    activePartnerPrIds.size === 0
      ? scopedCandidateRecords
      : scopedCandidateRecords.filter(
          (record) => !activePartnerPrIds.has(record.root.id),
        );

  const activePartnerCounts = await partnerRepo.countActiveByPrIds(
    candidateRecords.map((record) => record.root.id),
  );

  const rankedCandidates = candidateRecords
    .map<FormModeRecommendationCandidate>((record) => {
      const match = buildBestTimeSelectionMatch({
        requestedLocationId: selectedPlace.locationId,
        requestedRoute: selectedPlace.route,
        requestedStartAtIsos,
        requestedPreferences: selectionPreferences,
        candidateLocationId: record.root.location,
        candidateRoute: record.root.route,
        candidateTimeWindow: record.root.time,
        candidatePreferences: record.root.preferences,
        candidateMinPartners: record.root.minPartners,
        activePartnerCount: activePartnerCounts.get(record.root.id) ?? 0,
      });

      return {
        pr: {
          id: record.root.id,
          title: record.root.title,
          type: record.root.type,
          location: record.root.location,
          route: record.root.route,
          time: record.root.time,
          status: record.root.status,
          minPartners: record.root.minPartners,
          maxPartners: record.root.maxPartners,
          preferences: [...record.root.preferences],
          notes: record.root.notes,
          partnerCount: activePartnerCounts.get(record.root.id) ?? 0,
          createdAt: record.root.createdAt.toISOString(),
        },
        match,
      };
    })
    .sort((left, right) => {
      if (right.match.score !== left.match.score) {
        return right.match.score - left.match.score;
      }

      const leftDelta = left.match.startDeltaMinutes ?? Number.POSITIVE_INFINITY;
      const rightDelta = right.match.startDeltaMinutes ?? Number.POSITIVE_INFINITY;
      if (leftDelta !== rightDelta) {
        return leftDelta - rightDelta;
      }

      return right.pr.createdAt.localeCompare(left.pr.createdAt);
    });

  const matchedRecommendation =
    rankedCandidates.find((candidate) =>
      isAnchorEventMatchedRecommendation(candidate.match),
    ) ?? null;
  const orderedCandidates =
    matchedRecommendation === null
      ? rankedCandidates.slice(0, MAX_ORDERED_CANDIDATE_COUNT)
      : [];

  return {
    event: {
      id: event.id,
      title: event.title,
    },
    selection: {
      kind: selectedPlace.kind,
        locationId: selectedPlace.locationId,
        routePoolEntryId: selectedPlace.routePoolEntryId,
      timeMode: input.timeSelection.mode,
      timeWindow: selectionTimeWindows[0]!,
      timeWindows: selectionTimeWindows,
      preferences: selectionPreferences,
    },
    matchedRecommendation,
    orderedCandidates,
  };
}
