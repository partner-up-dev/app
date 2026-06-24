import { describe, expect, test } from "vitest";
import {
  resolveTencentMarkerStyleId,
  shouldAnimateTencentMarkerMove,
  toTencentMarkerRotateDegrees,
} from "./tencent-lbs-provider";

describe("Tencent LBS marker heading", () => {
  test("converts north-clockwise provider heading to Tencent counter-clockwise rotate", () => {
    expect(toTencentMarkerRotateDegrees(0)).toBe(0);
    expect(toTencentMarkerRotateDegrees(90)).toBe(270);
    expect(toTencentMarkerRotateDegrees(180)).toBe(180);
    expect(toTencentMarkerRotateDegrees(270)).toBe(90);
    expect(toTencentMarkerRotateDegrees(-90)).toBe(90);
  });

  test("uses heading-aware route driver style id without replacing the driver icon style", () => {
    expect(
      resolveTencentMarkerStyleId({
        headingDegrees: 90,
        icon: "routeDriver",
        id: "driver",
        position: { lat: 30, lng: 120 },
      }),
    ).toBe("routeDriverHeading-270");

    expect(
      resolveTencentMarkerStyleId({
        active: true,
        icon: "routeDriver",
        id: "driver",
        position: { lat: 30, lng: 120 },
      }),
    ).toBe("routeDriver");
  });

  test("animates only route driver marker coordinate changes", () => {
    expect(
      shouldAnimateTencentMarkerMove({
        previous: {
          icon: "routeDriver",
          id: "driver",
          position: { lat: 30, lng: 120 },
        },
        next: {
          icon: "routeDriver",
          id: "driver",
          position: { lat: 30.001, lng: 120.001 },
        },
      }),
    ).toBe(true);

    expect(
      shouldAnimateTencentMarkerMove({
        previous: {
          icon: "routeStart",
          id: "start",
          position: { lat: 30, lng: 120 },
        },
        next: {
          icon: "routeStart",
          id: "start",
          position: { lat: 30.001, lng: 120.001 },
        },
      }),
    ).toBe(false);

    expect(
      shouldAnimateTencentMarkerMove({
        previous: {
          icon: "routeDriver",
          id: "driver",
          position: { lat: 30, lng: 120 },
        },
        next: {
          icon: "routeDriver",
          id: "driver",
          position: { lat: 30, lng: 120 },
        },
      }),
    ).toBe(false);
  });
});
