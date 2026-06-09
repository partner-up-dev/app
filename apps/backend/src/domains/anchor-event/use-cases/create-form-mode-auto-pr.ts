import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type {
  AnchorEvent,
  AnchorEventId,
  PRRoute,
  TimeWindowEntry,
} from "../../../entities";
import type {
  PRAllowEditAfterReady,
  PRStatus,
} from "../../../entities/partner-request";
import { throwHttpProblem } from "../../../lib/problem-details";
import { canUserCreatePRForAnchorEvent } from "../../pr/services";
import { createPRFromStructured } from "../../pr/model/pr";
import { isPublicEventScopedLocation } from "../services/event-scope";
import { eventOwnsTimeWindow } from "../services/time-window-pool";

const anchorEventRepo = new AnchorEventRepository();

export type FormModeAutoCreatePlace =
  | {
      kind: "location";
      locationId: string;
    }
  | {
      kind: "route";
      route: PRRoute;
    };

export type CreateAnchorEventFormModeAutoPRInput = {
  eventId: AnchorEventId;
  timeWindow: TimeWindowEntry;
  place: FormModeAutoCreatePlace;
  preferences: string[];
  allowEditAfterReady?: PRAllowEditAfterReady | null;
};

export type CreateAnchorEventFormModeAutoPRResult = {
  id: number;
  createdBy: string | null;
  status: PRStatus;
  canonicalPath: string;
};

type ResolvedFormModeAutoCreatePlace =
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

const resolveFormModeAutoCreatePlace = async (
  event: AnchorEvent,
  place: FormModeAutoCreatePlace,
): Promise<ResolvedFormModeAutoCreatePlace> => {
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
      code: "ANCHOR_EVENT_FORM_MODE_AUTO_CREATE_INVALID_PLACE",
    });
  }

  return {
    kind: "location",
    location,
    route: null,
  };
};

const normalizePreferenceLabels = (preferences: readonly string[]): string[] =>
  Array.from(
    new Set(
      preferences
        .map((preference) => preference.trim())
        .filter((preference) => preference.length > 0),
    ),
  );

export async function createAnchorEventFormModeAutoPR(
  input: CreateAnchorEventFormModeAutoPRInput,
): Promise<CreateAnchorEventFormModeAutoPRResult> {
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
      code: "ANCHOR_EVENT_FORM_MODE_AUTO_CREATE_INVALID_TIME_WINDOW",
    });
  }

  const place = await resolveFormModeAutoCreatePlace(event, input.place);
  return await createPRFromStructured(
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
      preferences: normalizePreferenceLabels(input.preferences),
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
      createSource: "EVENT_FORM_MODE_AUTO",
      publicationMode: "create-open",
      allowEditAfterReady: input.allowEditAfterReady ?? null,
      operationLog: {
        action: "pr.create_form_mode_auto",
        detail: {
          placeKind: place.kind,
          location: place.location,
          preferenceCount: input.preferences.length,
        },
      },
    },
  );
}
