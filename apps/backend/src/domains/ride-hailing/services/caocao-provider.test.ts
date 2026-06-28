import { describe, expect, it } from "vitest";
import type {
  RideHailingProviderInstance,
  RideHailingProviderInstanceId,
} from "../../../entities/ride-hailing-provider";
import {
  buildCaocaoCallbackInfo,
  buildCaocaoSignedParams,
  CaocaoProviderAdapter,
  createCaocaoSignature,
  decodeCaocaoExternalOrderId,
  encodeCaocaoExternalOrderId,
  parseCaocaoCallbackInfo,
  parseRideHailingProviderRegistrationConfig,
  resolveCaocaoOrderStatusCallbackUrl,
} from ".";

const providerInstanceId = "00000000-0000-0000-0000-000000000501" as RideHailingProviderInstanceId;
const orderId = "123e4567-e89b-12d3-a456-426614174000";
const now = new Date("2031-01-01T00:00:00.000Z");

const caocaoProviderInstance = (): RideHailingProviderInstance => ({
  id: providerInstanceId,
  providerType: "CAOCAO",
  instanceKey: "caocao-default",
  status: "ACTIVE",
  displayName: "Caocao Default",
  config: {
    adapterMode: "CAOCAO_OPEN_API",
    caocaoClientId: "caocao-client",
    signKey: "caocao-secret",
    endpointBaseUrl: "https://openapi.caocaokeji.cn/v2",
    callbackBaseUrl: "https://api.partner-up.test",
    requestTimeoutMs: 5000,
  },
  createdAt: now,
  updatedAt: now,
});

describe("Caocao provider config", () => {
  it("validates registration config from stored provider config", () => {
    const parsed = parseRideHailingProviderRegistrationConfig({
      providerType: "CAOCAO",
      instanceKey: "caocao-default",
      displayName: "Caocao Default",
      config: caocaoProviderInstance().config,
    });

    expect(parsed.config.caocaoClientId).toBe("caocao-client");
    expect(parsed.config.signKey).toBe("caocao-secret");
  });

  it("rejects incomplete Caocao provider config", () => {
    expect(() =>
      parseRideHailingProviderRegistrationConfig({
        providerType: "CAOCAO",
        instanceKey: "caocao-default",
        displayName: "Caocao Default",
        config: {
          adapterMode: "CAOCAO_OPEN_API",
          caocaoClientId: "caocao-client",
          endpointBaseUrl: "https://openapi.caocaokeji.cn/v2",
        },
      }),
    ).toThrow();
  });
});

describe("Caocao signer", () => {
  it("signs params by key order and keeps sign_key out of transport params", () => {
    const params = {
      foo: "123",
      client_id: "caocao-client",
      timestamp: "1700000000000",
    };

    expect(
      createCaocaoSignature({
        params,
        signKey: "caocao-secret",
      }),
    ).toBe("11ef2c9311786249e5fe3c998f12b01113478ad4");

    const signed = buildCaocaoSignedParams({
      params: { foo: 123 },
      clientId: "caocao-client",
      signKey: "caocao-secret",
      timestampMs: 1700000000000,
    });

    expect(signed).toMatchObject({
      client_id: "caocao-client",
      foo: "123",
      timestamp: "1700000000000",
      sign: "11ef2c9311786249e5fe3c998f12b01113478ad4",
    });
    expect(signed).not.toHaveProperty("sign_key");
  });

  it("serializes signed GET requests without leaking sign_key", async () => {
    let requestUrl: string | null = null;
    const fetchImpl: typeof fetch = async (input) => {
      requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      return new Response(
        JSON.stringify({
          code: 200,
          success: true,
          data: { quoted: true },
        }),
        { status: 200 },
      );
    };
    const adapter = new CaocaoProviderAdapter({
      providerInstance: caocaoProviderInstance(),
      fetchImpl,
    });

    await adapter.estimate({ params: { city_code: "0571" } });

    expect(requestUrl).not.toBeNull();
    const url = new URL(requestUrl ?? "");
    expect(url.pathname).toBe("/v2/common/estimatePriceWithDetail");
    expect(url.searchParams.get("client_id")).toBe("caocao-client");
    expect(url.searchParams.get("city_code")).toBe("0571");
    expect(url.searchParams.has("timestamp")).toBe(true);
    expect(url.searchParams.has("sign")).toBe(true);
    expect(url.searchParams.has("sign_key")).toBe(false);
  });
});

describe("Caocao external order id", () => {
  it("roundtrips order UUID through a Caocao-compatible compact id", () => {
    const externalOrderId = encodeCaocaoExternalOrderId(orderId);

    expect(externalOrderId.startsWith("rh")).toBe(true);
    expect(externalOrderId.length).toBeLessThanOrEqual(30);
    expect(decodeCaocaoExternalOrderId(externalOrderId)).toBe(orderId);
  });

  it("rejects non-UUID local order ids", () => {
    expect(() => encodeCaocaoExternalOrderId("not-a-uuid")).toThrow(
      "Caocao external order id requires a UUID order id",
    );
  });
});

describe("Caocao callback verification", () => {
  it("builds and parses callback_info routing tokens", () => {
    const callbackInfo = buildCaocaoCallbackInfo({
      providerInstance: caocaoProviderInstance(),
      routingToken: "stg",
    });

    expect(callbackInfo).toBe("pu.rhc.v1.stg.00000000-0000-0000-0000-000000000501");
    expect(parseCaocaoCallbackInfo(callbackInfo)).toEqual({
      providerInstanceId,
      routingToken: "stg",
    });
    expect(parseCaocaoCallbackInfo("pu.rhc.v1.prod.not-a-uuid")).toBeNull();
  });

  it("verifies callback signature and resolves local order id", () => {
    const adapter = new CaocaoProviderAdapter({
      providerInstance: caocaoProviderInstance(),
    });
    const unsigned = {
      timestamp: "1700000000000",
      callback_info: buildCaocaoCallbackInfo({
        providerInstance: caocaoProviderInstance(),
        routingToken: "stg",
      }),
      order_id: "CC123456",
      ext_order_id: adapter.buildExternalOrderId(orderId),
      event: "20",
    };
    const form = {
      ...unsigned,
      sign: createCaocaoSignature({
        params: unsigned,
        signKey: "caocao-secret",
      }),
    };

    const parsed = adapter.parseOrderStatusCallback(form);

    expect(parsed.providerType).toBe("CAOCAO");
    expect(parsed.providerOrderId).toBe("CC123456");
    expect(parsed.localOrderId).toBe(orderId);
    expect(parsed.event).toBe(20);
    expect(parsed.timestampMs).toBe(1700000000000);
    expect(parsed.raw.callback_info).toBe("pu.rhc.v1.stg.00000000-0000-0000-0000-000000000501");
  });

  it("rejects callbacks with invalid signatures or unsupported events", () => {
    const adapter = new CaocaoProviderAdapter({
      providerInstance: caocaoProviderInstance(),
    });
    const unsigned = {
      timestamp: "1700000000000",
      order_id: "CC123456",
      ext_order_id: adapter.buildExternalOrderId(orderId),
      event: "20",
    };
    const validSign = createCaocaoSignature({
      params: unsigned,
      signKey: "caocao-secret",
    });

    expect(() =>
      adapter.parseOrderStatusCallback({
        ...unsigned,
        sign: "bad-signature",
      }),
    ).toThrow("Caocao callback signature verification failed");

    const unsupportedEvent = {
      ...unsigned,
      event: "999",
    };
    expect(() =>
      adapter.parseOrderStatusCallback({
        ...unsupportedEvent,
        sign: createCaocaoSignature({
          params: unsupportedEvent,
          signKey: "caocao-secret",
        }),
      }),
    ).toThrow("Caocao callback event is unsupported");
    expect(validSign).toHaveLength(40);
  });

  it("builds provider-instance-specific callback URLs from stored config", () => {
    expect(resolveCaocaoOrderStatusCallbackUrl(caocaoProviderInstance())).toBe(
      "https://api.partner-up.test/api/ride-hailing/caocao/00000000-0000-0000-0000-000000000501/callback/order-status",
    );
  });
});

describe("Caocao live order projection", () => {
  it("normalizes order detail, driver location, and navigation route responses", async () => {
    const requestPaths: string[] = [];
    const routeRequestBodies: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(requestUrl);
      requestPaths.push(url.pathname);

      if (url.pathname.endsWith("/common/queryOrderDetailV2")) {
        return new Response(
          JSON.stringify({
            code: 200,
            data: {
              basicOrderVO: {
                status: "12",
              },
              driverInfoVO: {
                carBrand: "几何",
                card: "浙A12345",
                color: "白色",
                location: {
                  direction: 90,
                  latitude: 30.2688,
                  longitude: 120.1608,
                  speed: 0,
                },
                name: "张师傅",
                phone: "13800138001",
              },
            },
            success: true,
          }),
          { status: 200 },
        );
      }

      if (url.pathname.endsWith("/common/queryDriverLocationByOrderId")) {
        return new Response(
          JSON.stringify({
            code: 200,
            data: {
              direction: 88,
              latitude: 30.27,
              longitude: 120.16,
              speed: 12,
            },
            success: true,
          }),
          { status: 200 },
        );
      }

      if (url.pathname.endsWith("/common/queryDriverPolylineV2")) {
        routeRequestBodies.push(init?.body?.toString() ?? "");
        return new Response(
          JSON.stringify({
            code: 200,
            data: {
              driverEtaInfoVO: {
                direction: 88,
                lat: 30.27,
                lng: 120.16,
                remainDistance: 820,
                remainLightCount: 2,
                remainTime: 240,
                speed: 12,
                timestamp: "1755571305064",
              },
              navigationPolylineType: 1,
              steps: [
                {
                  links: [
                    {
                      coords: "30.270000,120.160000;30.269700,120.160600;30.269100,120.160900",
                    },
                    {
                      coords: "30.268900,120.160850;30.268800,120.160800",
                    },
                  ],
                },
              ],
            },
            success: true,
          }),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify({ code: 404, success: false }), { status: 200 });
    };
    const adapter = new CaocaoProviderAdapter({
      providerInstance: caocaoProviderInstance(),
      fetchImpl,
    });

    const detail = await adapter.queryOrderDetail({ providerOrderId: "CC123456" });
    const location = await adapter.queryDriverLocation({ providerOrderId: "CC123456" });
    const route = await adapter.queryDriverRoute({
      providerOrderId: "CC123456",
      routeKind: "PICKUP",
    });

    expect(detail.phase).toBe("12");
    expect(detail.statusLabel).toBe("司机已到达");
    expect(detail.driver?.driverName).toBe("张师傅");
    expect(detail.vehicle?.plate).toBe("浙A12345");
    expect(detail.vehicleLocation?.headingDegrees).toBe(90);
    expect(location?.headingDegrees).toBe(88);
    expect(route?.routeKind).toBe("PICKUP");
    expect(route?.remainingDistanceMeters).toBe(820);
    expect(route?.trafficLightCount).toBe(2);
    expect(route?.polyline).toEqual([
      { latitude: 30.27, longitude: 120.16 },
      { latitude: 30.2697, longitude: 120.1606 },
      { latitude: 30.2691, longitude: 120.1609 },
      { latitude: 30.2689, longitude: 120.16085 },
      { latitude: 30.2688, longitude: 120.1608 },
    ]);
    expect(routeRequestBodies).toHaveLength(1);
    expect(new URLSearchParams(routeRequestBodies[0]).get("navigation_polyline_type")).toBe("1");
    expect(requestPaths).toEqual([
      "/v2/common/queryOrderDetailV2",
      "/v2/common/queryDriverLocationByOrderId",
      "/v2/common/queryDriverPolylineV2",
    ]);
  });

  it("labels realtime accepted status as picking up", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          code: 200,
          data: {
            basicOrderVO: {
              status: "9",
            },
          },
          success: true,
        }),
        { status: 200 },
      );
    const adapter = new CaocaoProviderAdapter({
      providerInstance: caocaoProviderInstance(),
      fetchImpl,
    });

    const detail = await adapter.queryOrderDetail({ providerOrderId: "CC123456" });

    expect(detail.phase).toBe("9");
    expect(detail.statusLabel).toBe("接客中");
  });
});
