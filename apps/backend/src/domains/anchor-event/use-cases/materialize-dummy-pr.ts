import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventPreferenceTagRepository } from "../../../repositories/AnchorEventPreferenceTagRepository";
import type {
  AnchorEvent,
  AnchorEventId,
  PRRoute,
  TimeWindowEntry,
} from "../../../entities";
import type { PRStatus } from "../../../entities/partner-request";
import { throwHttpProblem } from "../../../lib/problem-details";
import {
  countActiveVisiblePRsByEventTimeWindowAndLocation,
  readVisibleAnchorEventPRContextRecordsByEventTimeWindow,
  canUserCreatePRForAnchorEvent,
} from "../../pr/services";
import {
  arePRRoutesEqual,
  isPublicEventScopedLocation,
} from "../services/event-scope";
import { eventOwnsTimeWindow } from "../services/time-window-pool";
import { resolvePublishedPoiByLocation } from "../../poi";
import { createPRFromStructured } from "../../pr/model/pr";

const anchorEventRepo = new AnchorEventRepository();
const preferenceTagRepo = new AnchorEventPreferenceTagRepository();

export type DummyPRMaterializationPlace =
  | {
      kind: "location";
      locationId: string;
    }
  | {
      kind: "route";
      route: PRRoute;
    };

export type MaterializeAnchorEventDummyPRInput = {
  eventId: AnchorEventId;
  timeWindow: TimeWindowEntry;
  place: DummyPRMaterializationPlace;
  preferences: string[];
};

export type MaterializeAnchorEventDummyPRResult = {
  id: number;
  createdBy: string | null;
  status: PRStatus;
  canonicalPath: string;
  materialization: "created" | "existing";
};

type ResolvedDummyPlace =
  | {
      kind: "location";
      location: string;
      route: null;
    }
  | {
      kind: "route";
      location: null;
      route: PRRoute;
    };

const normalizePreferenceLabels = (preferences: readonly string[]): string[] =>
  Array.from(
    new Set(
      preferences
        .map((preference) => preference.trim())
        .filter((preference) => preference.length > 0),
    ),
  );

const resolveDummyPreferences = async (
  eventId: AnchorEventId,
  preferences: readonly string[],
): Promise<string[]> => {
  const labels = normalizePreferenceLabels(preferences);
  if (labels.length > 1) {
    return throwHttpProblem({
      status: 400,
      detail: "Dummy PR can materialize at most one preference tag",
      code: "ANCHOR_EVENT_DUMMY_PR_INVALID_PREFERENCES",
    });
  }
  if (labels.length === 0) {
    return [];
  }

  const publishedTags = await preferenceTagRepo.findByAnchorEventIdAndStatuses(
    eventId,
    ["PUBLISHED"],
  );
  const publishedLabels = new Set(publishedTags.map((tag) => tag.label.trim()));
  if (!publishedLabels.has(labels[0]!)) {
    return throwHttpProblem({
      status: 400,
      detail: "Dummy PR preference tag is outside the published event tag pool",
      code: "ANCHOR_EVENT_DUMMY_PR_INVALID_PREFERENCES",
    });
  }

  return labels;
};

const resolveDummyPlace = async (
  event: AnchorEvent,
  place: DummyPRMaterializationPlace,
): Promise<ResolvedDummyPlace> => {
  if (place.kind === "route") {
    return {
      kind: "route",
      location: null,
      route: place.route,
    };
  }

  const location = place.locationId.trim();
  if (!(await isPublicEventScopedLocation(event, location))) {
    return throwHttpProblem({
      status: 400,
      detail: "Selected location is outside the anchor event scope",
      code: "ANCHOR_EVENT_DUMMY_PR_INVALID_PLACE",
    });
  }

  return {
    kind: "location",
    location,
    route: null,
  };
};

const isSameResolvedPlace = (
  resolvedPlace: ResolvedDummyPlace,
  candidate: {
    location: string | null;
    route: PRRoute | null;
  },
): boolean => {
  if (resolvedPlace.kind === "location") {
    return (candidate.location?.trim() ?? "") === resolvedPlace.location;
  }

  return arePRRoutesEqual(candidate.route, resolvedPlace.route);
};

const findExistingVisiblePRForDummy = async (
  eventId: AnchorEventId,
  timeWindow: TimeWindowEntry,
  place: ResolvedDummyPlace,
): Promise<MaterializeAnchorEventDummyPRResult | null> => {
  const records = await readVisibleAnchorEventPRContextRecordsByEventTimeWindow(
    eventId,
    timeWindow,
  );
  const existing = records.find((record) =>
    isSameResolvedPlace(place, {
      location: record.root.location,
      route: record.root.route,
    }),
  );
  if (!existing) {
    return null;
  }

  return {
    id: existing.root.id,
    createdBy: existing.root.createdBy,
    status: existing.root.status,
    canonicalPath: `/pr/${existing.root.id}`,
    materialization: "existing",
  };
};

const assertLocationCapacityAvailable = async (
  eventId: AnchorEventId,
  timeWindow: TimeWindowEntry,
  place: ResolvedDummyPlace,
): Promise<void> => {
  if (place.kind !== "location") {
    return;
  }

  const poi = await resolvePublishedPoiByLocation(place.location);
  const cap = poi?.perTimeWindowCap ?? null;
  if (cap === null) {
    return;
  }

  const activeCount = await countActiveVisiblePRsByEventTimeWindowAndLocation({
    anchorEventId: eventId,
    timeWindow,
    location: place.location,
  });
  if (activeCount >= cap) {
    return throwHttpProblem({
      status: 409,
      detail: "Selected location has reached its per-time-window PR cap",
      code: "LOCATION_CAP_REACHED",
    });
  }
};

export async function materializeAnchorEventDummyPR(
  input: MaterializeAnchorEventDummyPRInput,
): Promise<MaterializeAnchorEventDummyPRResult> {
  const event = await anchorEventRepo.findById(input.eventId);
  if (!event || event.status !== "ACTIVE") {
    return throwHttpProblem({
      status: 404,
      detail: "Anchor event not found",
      code: "ANCHOR_EVENT_NOT_FOUND",
    });
  }
  if (!canUserCreatePRForAnchorEvent(event)) {
    return throwHttpProblem({
      status: 403,
      detail: "User PR creation is disabled for this anchor event type",
      code: "ANCHOR_EVENT_USER_PR_CREATION_DISABLED",
    });
  }
  if (!eventOwnsTimeWindow(event, input.timeWindow)) {
    return throwHttpProblem({
      status: 400,
      detail: "Selected time window is outside the anchor event scope",
      code: "ANCHOR_EVENT_DUMMY_PR_INVALID_TIME_WINDOW",
    });
  }

  const [place, preferences] = await Promise.all([
    resolveDummyPlace(event, input.place),
    resolveDummyPreferences(event.id, input.preferences),
  ]);

  const existing = await findExistingVisiblePRForDummy(
    event.id,
    input.timeWindow,
    place,
  );
  if (existing) {
    return existing;
  }

  await assertLocationCapacityAvailable(event.id, input.timeWindow, place);

  const created = await createPRFromStructured(
    {
      title: undefined,
      type: event.type,
      time: input.timeWindow,
      location: place.location,
      route: place.route,
      minPartners: event.defaultMinPartners ?? 2,
      maxPartners: event.defaultMaxPartners ?? null,
      partners: [],
      budget: null,
      preferences,
      notes: null,
      meetingPoint: null,
    },
    {
      authenticatedUserId: null,
      anonymousUserId: null,
      oauthOpenId: null,
    },
    {
      anchorEventId: event.id,
      createSource: "EVENT_DUMMY",
      publicationMode: "create-open",
      operationLog: {
        action: "pr.materialize_event_dummy",
        detail: {
          placeKind: place.kind,
          location: place.location,
          preferenceCount: preferences.length,
        },
      },
    },
  );

  return {
    ...created,
    materialization: "created",
  };
}
