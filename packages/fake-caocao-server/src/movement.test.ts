import { describe, expect, test } from "vitest";
import { bearingDegrees, movementSnapshotFromRoute, remainingRouteFromDistance } from "./movement";

describe("fake Caocao movement helpers", () => {
  test("keeps Caocao heading convention as north-clockwise", () => {
    expect(
      bearingDegrees({ latitude: 30, longitude: 120 }, { latitude: 31, longitude: 120 }),
    ).toBeCloseTo(0, 0);
    expect(
      bearingDegrees({ latitude: 30, longitude: 120 }, { latitude: 30, longitude: 121 }),
    ).toBeCloseTo(90, 0);
  });

  test("returns remaining route from the current point", () => {
    const route = [
      { latitude: 30, longitude: 120 },
      { latitude: 30, longitude: 120.01 },
      { latitude: 30.01, longitude: 120.01 },
    ];

    const remainingRoute = remainingRouteFromDistance(route, 600);

    expect(remainingRoute).toHaveLength(3);
    expect(remainingRoute[0]?.latitude).toBeCloseTo(30, 6);
    expect(remainingRoute[0]?.longitude).toBeGreaterThan(120);
    expect(remainingRoute[1]).toEqual(route[1]);
    expect(remainingRoute[2]).toEqual(route[2]);
  });

  test("creates a movement snapshot with current coordinate, heading, and remaining path", () => {
    const route = [
      { latitude: 30, longitude: 120 },
      { latitude: 30, longitude: 120.01 },
      { latitude: 30.01, longitude: 120.01 },
    ];

    const snapshot = movementSnapshotFromRoute({
      progressRatio: 0.5,
      route,
    });

    expect(snapshot.coordinate.longitude).toBeGreaterThan(120);
    expect(snapshot.remainingRoute[0]).toEqual(snapshot.coordinate);
    expect(snapshot.remainingRoute.length).toBeGreaterThan(1);
    expect(snapshot.remainingDistanceMeters).toBeGreaterThan(0);
    expect(snapshot.headingDegrees).toBeGreaterThanOrEqual(0);
    expect(snapshot.headingDegrees).toBeLessThan(360);
  });

  test("can create movement snapshot from distance instead of route percentage", () => {
    const shortRoute = [
      { latitude: 30, longitude: 120 },
      { latitude: 30, longitude: 120.01 },
    ];
    const longRoute = [
      { latitude: 30, longitude: 120 },
      { latitude: 30, longitude: 120.02 },
    ];

    const shortSnapshot = movementSnapshotFromRoute({
      distanceAlongRouteMeters: 300,
      route: shortRoute,
    });
    const longSnapshot = movementSnapshotFromRoute({
      distanceAlongRouteMeters: 300,
      route: longRoute,
    });

    expect(shortSnapshot.coordinate.longitude - 120).toBeCloseTo(
      longSnapshot.coordinate.longitude - 120,
      4,
    );
    expect(shortSnapshot.remainingDistanceMeters).toBeLessThan(
      longSnapshot.remainingDistanceMeters,
    );
  });
});
