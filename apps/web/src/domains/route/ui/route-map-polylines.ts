import type { MapPolyline, MapPolylineTone } from "@/shared/map/types";

const ROUTE_MAP_POLYLINE_TONE_SEQUENCE: readonly MapPolylineTone[] = [
  "secondary",
  "tertiary",
  "primary",
];

export const ROUTE_MAP_FALLBACK_POLYLINE_TONE: MapPolylineTone = "danger";

export const resolveRouteMapPlannedPolylineTone = (index: number): MapPolylineTone => {
  const normalizedIndex = Number.isInteger(index) && index >= 0 ? index : 0;
  return (
    ROUTE_MAP_POLYLINE_TONE_SEQUENCE[normalizedIndex % ROUTE_MAP_POLYLINE_TONE_SEQUENCE.length] ??
    "secondary"
  );
};

const pickFirstAvailableRouteMapTone = (
  usedTones: ReadonlySet<MapPolylineTone>,
  index: number,
): MapPolylineTone => {
  for (const tone of ROUTE_MAP_POLYLINE_TONE_SEQUENCE) {
    if (!usedTones.has(tone)) return tone;
  }
  return resolveRouteMapPlannedPolylineTone(index);
};

export const normalizeRouteMapExtraPolylines = ({
  polylines,
  usedTones,
}: {
  polylines: readonly MapPolyline[];
  usedTones: ReadonlySet<MapPolylineTone>;
}): MapPolyline[] => {
  const assignedTones = new Set(usedTones);
  return polylines.map((polyline, index) => {
    const tone = polyline.tone ?? pickFirstAvailableRouteMapTone(assignedTones, index);
    assignedTones.add(tone);
    return {
      ...polyline,
      tone,
    };
  });
};
