import { describe, expect, test } from "vitest";
import {
  buildTencentDrivingDirectionUrl,
  createTencentDrivingRoutePlanner,
  decompressTencentDirectionPolyline,
  parseTencentDrivingDirectionResponse,
} from "./route-planning";

describe("fake Caocao Tencent route planning", () => {
  test("builds Tencent driving direction URL with Caocao coordinates", () => {
    const url = buildTencentDrivingDirectionUrl({
      apiKey: "test-key",
      from: { latitude: 30.1, longitude: 120.2 },
      to: { latitude: 30.3, longitude: 120.4 },
    });

    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://apis.map.qq.com/ws/direction/v1/driving/",
    );
    expect(parsed.searchParams.get("from")).toBe("30.1,120.2");
    expect(parsed.searchParams.get("to")).toBe("30.3,120.4");
    expect(parsed.searchParams.get("no_step")).toBe("1");
    expect(parsed.searchParams.get("key")).toBe("test-key");
  });

  test("decompresses Tencent delta polyline to Caocao latitude-longitude coordinates", () => {
    expect(decompressTencentDirectionPolyline([39.91522, 116.403857, -20, -697])).toEqual([
      { latitude: 39.91522, longitude: 116.403857 },
      { latitude: 39.9152, longitude: 116.40316 },
    ]);
  });

  test("parses Tencent driving direction response", () => {
    const plans = parseTencentDrivingDirectionResponse({
      status: 0,
      result: {
        routes: [
          {
            distance: 100,
            duration: 12,
            polyline: [39.91522, 116.403857, -20, -697],
          },
        ],
      },
    });

    expect(plans).toEqual([
      {
        distance: 100,
        duration: 12,
        polyline: [
          { latitude: 39.91522, longitude: 116.403857 },
          { latitude: 39.9152, longitude: 116.40316 },
        ],
      },
    ]);
  });

  test("creates route planner backed by Tencent response parser", async () => {
    const requestedUrls: string[] = [];
    const planner = createTencentDrivingRoutePlanner({
      apiKey: "test-key",
      fetcher: async (url) => {
        requestedUrls.push(String(url));
        return new Response(
          JSON.stringify({
            status: 0,
            result: {
              routes: [
                {
                  distance: 100,
                  duration: 12,
                  polyline: [39.91522, 116.403857, -20, -697],
                },
              ],
            },
          }),
          {
            status: 200,
          },
        );
      },
    });

    const plan = await planner({
      from: { latitude: 30.1, longitude: 120.2 },
      providerOrderId: "CC1",
      routeKind: "PICKUP",
      to: { latitude: 30.3, longitude: 120.4 },
    });

    expect(requestedUrls).toHaveLength(1);
    expect(new URL(requestedUrls[0] ?? "").searchParams.get("key")).toBe("test-key");
    expect(plan.coordinates).toHaveLength(2);
    expect(plan.distanceMeters).toBe(100);
    expect(plan.durationSeconds).toBe(12);
  });
});
