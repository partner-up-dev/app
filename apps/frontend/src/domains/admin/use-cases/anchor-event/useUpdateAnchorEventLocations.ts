import { useUpdateAdminAnchorEvent } from "@/domains/admin/queries/useAdminAnchorEvents";
import {
  type AdminAnchorEventRecord,
  type AnchorEventLocationsDraft,
  buildLocationMeetingPointsInput,
  buildMeetingPointInput,
  normalizeLines,
  normalizeRoutePoolForSubmit,
  toAnchorEventMutationInput,
} from "@/domains/admin/use-cases/anchor-event/anchorEventMutationInput";

export const useUpdateAnchorEventLocations = () => {
  const mutation = useUpdateAdminAnchorEvent();

  const updateLocations = async ({
    event,
    draft,
  }: {
    event: AdminAnchorEventRecord;
    draft: AnchorEventLocationsDraft;
  }) => {
    const locationPool =
      draft.placePoolMode === "location"
        ? normalizeLines(draft.locationPoolText)
        : [];
    const routePool =
      draft.placePoolMode === "route"
        ? normalizeRoutePoolForSubmit(draft.routePool)
        : [];
    return await mutation.mutateAsync({
      eventId: event.id,
      input: toAnchorEventMutationInput(event, {
        locationPool,
        routePool,
        meetingPoint: buildMeetingPointInput(
          draft.meetingPointDescription,
          draft.meetingPointImageUrl,
        ),
        locationMeetingPoints:
          draft.placePoolMode === "location"
            ? buildLocationMeetingPointsInput(
                locationPool,
                draft.locationMeetingPoints,
              )
            : {},
      }),
    });
  };

  return {
    updateLocations,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
};
