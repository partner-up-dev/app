import { describe, expect, test } from "vitest";
import { resolveMapAutomaticViewportAction } from "./viewport-follow";

describe("resolveMapAutomaticViewportAction", () => {
  test("keeps static maps fitting on geometry changes by default", () => {
    expect(
      resolveMapAutomaticViewportAction({
        activeGeometry: { kind: "all" },
        fitOnGeometryChange: true,
        followPausedByUser: false,
        source: "geometry",
        viewportFollowMode: "none",
      }),
    ).toEqual({ kind: "fit-geometry" });
  });

  test("does not auto-fit static map geometry changes when disabled", () => {
    expect(
      resolveMapAutomaticViewportAction({
        activeGeometry: { kind: "all" },
        fitOnGeometryChange: false,
        followPausedByUser: false,
        source: "geometry",
        viewportFollowMode: "none",
      }),
    ).toEqual({ kind: "none" });
  });

  test("follows active marker instead of fitting all geometry", () => {
    expect(
      resolveMapAutomaticViewportAction({
        activeGeometry: { kind: "marker", id: "driver" },
        fitOnGeometryChange: true,
        followPausedByUser: false,
        source: "geometry",
        viewportFollowMode: "active-marker",
      }),
    ).toEqual({
      kind: "follow-active-marker",
      markerId: "driver",
    });
  });

  test("pauses all automatic viewport changes after user interaction", () => {
    expect(
      resolveMapAutomaticViewportAction({
        activeGeometry: { kind: "marker", id: "driver" },
        fitOnGeometryChange: true,
        followPausedByUser: true,
        source: "geometry",
        viewportFollowMode: "active-marker",
      }),
    ).toEqual({ kind: "none" });
  });

  test("does not fit dynamic route geometry updates when no marker target is available", () => {
    expect(
      resolveMapAutomaticViewportAction({
        activeGeometry: { kind: "polyline", id: "live-route" },
        fitOnGeometryChange: true,
        followPausedByUser: false,
        source: "geometry",
        viewportFollowMode: "active-marker",
      }),
    ).toEqual({ kind: "none" });
  });

  test("allows explicit reset to fit non-marker dynamic geometry", () => {
    expect(
      resolveMapAutomaticViewportAction({
        activeGeometry: { kind: "polyline", id: "live-route" },
        fitOnGeometryChange: true,
        followPausedByUser: false,
        source: "reset",
        viewportFollowMode: "active-marker",
      }),
    ).toEqual({ kind: "fit-geometry" });
  });
});
