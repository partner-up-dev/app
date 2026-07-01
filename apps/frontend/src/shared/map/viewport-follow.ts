import type { MapActiveGeometry, MapViewportFollowMode } from "@/shared/map/types";

export type MapAutomaticViewportSource = "init" | "geometry" | "view-context" | "reset";

export type MapAutomaticViewportAction =
  | {
      kind: "none";
    }
  | {
      kind: "fit-geometry";
    }
  | {
      kind: "follow-active-marker";
      markerId: string;
    };

export const resolveMapAutomaticViewportAction = ({
  activeGeometry,
  fitOnGeometryChange,
  followPausedByUser,
  source,
  viewportFollowMode,
}: {
  activeGeometry: MapActiveGeometry;
  fitOnGeometryChange: boolean;
  followPausedByUser: boolean;
  source: MapAutomaticViewportSource;
  viewportFollowMode: MapViewportFollowMode;
}): MapAutomaticViewportAction => {
  if (viewportFollowMode === "active-marker") {
    if (followPausedByUser) {
      return { kind: "none" };
    }

    if (activeGeometry?.kind === "marker") {
      return {
        kind: "follow-active-marker",
        markerId: activeGeometry.id,
      };
    }

    return source === "geometry" ? { kind: "none" } : { kind: "fit-geometry" };
  }

  if (source === "geometry" && !fitOnGeometryChange) {
    return { kind: "none" };
  }

  return { kind: "fit-geometry" };
};
