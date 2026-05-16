import { throwHttpProblem } from "../../../lib/problem-details";
import type { AnchorEventId, PartnerRequestFields } from "../../../entities";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { createPRFromStructured } from "../../pr-core/use-cases/create-pr-structured";
import {
  type CreatorIdentityInput,
} from "../../pr/services";
import {
  findEventRoutePoolEntry,
  findEventRoutePoolEntryByRoute,
  isPublicEventScopedLocation,
  resolveEventRoutePool,
} from "../services/event-scope";
import { buildAnchorEventFormModeTimeWindow } from "../services/form-mode";
import { eventOwnsTimeWindow } from "../services/time-window-pool";

const anchorEventRepo = new AnchorEventRepository();

export async function createEventAssistedPR(
  input: {
    anchorEventId: AnchorEventId;
    fields: PartnerRequestFields;
    creatorIdentity: CreatorIdentityInput;
    routePoolEntryId?: string | null;
  },
) {
  const event = await anchorEventRepo.findById(input.anchorEventId);
  if (!event) {
    return throwHttpProblem({
      status: 404,
      detail: "Anchor event not found",
      code: "ANCHOR_EVENT_NOT_FOUND",
    });
  }

  if (input.fields.type.trim() !== event.type) {
    return throwHttpProblem({ status: 400, detail: "Selected type does not match the anchor event type" });
  }

  const routePool = resolveEventRoutePool(event);
  const selectedRouteEntry =
    routePool.length > 0 || input.routePoolEntryId
      ? input.routePoolEntryId
        ? findEventRoutePoolEntry(event, input.routePoolEntryId)
        : findEventRoutePoolEntryByRoute(event, input.fields.route)
      : null;
  const selectedFields =
    selectedRouteEntry === null
      ? input.fields
      : {
          ...input.fields,
          location: null,
          route: selectedRouteEntry.route,
        };

  if (routePool.length > 0 || input.routePoolEntryId) {
    if (!selectedRouteEntry) {
      return throwHttpProblem({
        status: 400,
        detail: "Selected route is outside the anchor event scope",
      });
    }
  } else if (!(await isPublicEventScopedLocation(event, input.fields.location))) {
    return throwHttpProblem({
      status: 400,
      detail: "Selected location is outside the anchor event scope",
    });
  }

  const [startAt] = selectedFields.time;
  if (!startAt) {
    return throwHttpProblem({ status: 400, detail: "Missing start time" });
  }

  const validatedTimeWindow = buildAnchorEventFormModeTimeWindow(event, startAt);
  if (!eventOwnsTimeWindow(event, validatedTimeWindow)) {
    return throwHttpProblem({ status: 400, detail: "Selected time window is outside the anchor event time pool" });
  }

  const result = await createPRFromStructured(
    {
      ...selectedFields,
      time: validatedTimeWindow,
    },
    input.creatorIdentity,
    {
      anchorEventId: event.id,
      createSource: "EVENT_ASSISTED",
    },
  );

  return result;
}
