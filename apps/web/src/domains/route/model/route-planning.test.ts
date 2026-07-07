import { describe, expect, test } from "vitest";
import type { Route } from "./route";
import {
  buildTencentDrivingDirectionUrl,
  decompressTencentDirectionPolyline,
  parseTencentDrivingDirectionResponse,
} from "./route-planning";

const route: Route = [
  {
    name: "起点",
    full_address: null,
    gcj02: [39.91522, 116.403857],
    wgs84: null,
    bd09: null,
  },
  {
    name: "途经点",
    full_address: null,
    gcj02: [39.951004, 116.57198],
    wgs84: null,
    bd09: null,
  },
  {
    name: "终点",
    full_address: null,
    gcj02: [39.915285, 116.803857],
    wgs84: null,
    bd09: null,
  },
];

describe("route planning helpers", () => {
  test("decompressTencentDirectionPolyline mirrors Tencent delta decoding", () => {
    expect(
      decompressTencentDirectionPolyline([
        39.91522,
        116.403857,
        -20,
        -697,
        0,
        0,
        -40,
        170,
      ]),
    ).toEqual([
      { lat: 39.91522, lng: 116.403857 },
      { lat: 39.9152, lng: 116.40316 },
      { lat: 39.9152, lng: 116.40316 },
      { lat: 39.91516, lng: 116.40333 },
    ]);
  });

  test("buildTencentDrivingDirectionUrl formats route coordinates and waypoints", () => {
    const url = buildTencentDrivingDirectionUrl({
      route,
      apiKey: "test-key",
    });
    expect(url).not.toBeNull();
    const parsedUrl = new URL(url ?? "");
    expect(parsedUrl.origin + parsedUrl.pathname).toBe(
      "https://apis.map.qq.com/ws/direction/v1/driving/",
    );
    expect(parsedUrl.searchParams.get("from")).toBe("39.91522,116.403857");
    expect(parsedUrl.searchParams.get("to")).toBe("39.915285,116.803857");
    expect(parsedUrl.searchParams.get("waypoints")).toBe(
      "39.951004,116.57198",
    );
    expect(parsedUrl.searchParams.get("output")).toBe("json");
    expect(parsedUrl.searchParams.get("no_step")).toBe("1");
    expect(parsedUrl.searchParams.get("key")).toBe("test-key");
  });

  test("buildTencentDrivingDirectionUrl returns null for incomplete coordinates", () => {
    expect(
      buildTencentDrivingDirectionUrl({
        route: [{ ...route[0], gcj02: null }, route[2]],
        apiKey: "test-key",
      }),
    ).toBeNull();
  });

  test("parseTencentDrivingDirectionResponse extracts planned routes", () => {
    const plans = parseTencentDrivingDirectionResponse({
      status: 0,
      message: "query ok",
      result: {
        routes: [
          {
            distance: 100,
            duration: 5,
            polyline: [39.91522, 116.403857, -20, -697],
            waypoints: [
              {
                title: "途经点",
                location: { lat: 39.951004, lng: 116.57198 },
                polyline_idx: 1,
              },
            ],
          },
        ],
      },
    });
    expect(plans).toHaveLength(1);
    expect(plans[0]?.polyline).toEqual([
      { lat: 39.91522, lng: 116.403857 },
      { lat: 39.9152, lng: 116.40316 },
    ]);
    expect(plans[0]?.waypoints[0]?.location).toEqual({
      lat: 39.951004,
      lng: 116.57198,
    });
  });
});
