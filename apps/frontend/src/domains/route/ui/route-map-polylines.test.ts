import { describe, expect, test } from "vitest";
import type { MapPolylineTone } from "@/shared/map/types";
import {
  normalizeRouteMapExtraPolylines,
  ROUTE_MAP_FALLBACK_POLYLINE_TONE,
  resolveRouteMapPlannedPolylineTone,
} from "./route-map-polylines";

describe("route map polyline tones", () => {
  test("defaults route polylines to secondary and avoids duplicate tones for alternatives", () => {
    expect(resolveRouteMapPlannedPolylineTone(0)).toBe("secondary");
    expect(resolveRouteMapPlannedPolylineTone(1)).toBe("tertiary");
    expect(resolveRouteMapPlannedPolylineTone(2)).toBe("primary");
    expect(resolveRouteMapPlannedPolylineTone(3)).toBe("secondary");
  });

  test("uses danger only for route map fallback geometry", () => {
    expect(ROUTE_MAP_FALLBACK_POLYLINE_TONE).toBe("danger");
  });

  test("assigns extra polylines without colliding with existing route tones", () => {
    expect(
      normalizeRouteMapExtraPolylines({
        polylines: [
          {
            id: "provider-route",
            path: [
              { lat: 30, lng: 120 },
              { lat: 31, lng: 121 },
            ],
          },
        ],
        usedTones: new Set<MapPolylineTone>(["secondary"]),
      }),
    ).toEqual([
      {
        id: "provider-route",
        path: [
          { lat: 30, lng: 120 },
          { lat: 31, lng: 121 },
        ],
        tone: "tertiary",
      },
    ]);
  });

  test("preserves explicit extra polyline tones", () => {
    expect(
      normalizeRouteMapExtraPolylines({
        polylines: [
          {
            id: "live-route",
            path: [
              { lat: 30, lng: 120 },
              { lat: 31, lng: 121 },
            ],
            tone: "secondary",
          },
        ],
        usedTones: new Set<MapPolylineTone>(["secondary"]),
      })[0]?.tone,
    ).toBe("secondary");
  });
});
