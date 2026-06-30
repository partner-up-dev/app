import { describe, expect, it, vi } from "vitest";
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

const queryCaocaoDetailForStatus = async (status: string | number) => {
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        code: 200,
        data: {
          basicOrderVO: {
            status,
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

  return adapter.queryOrderDetail({ providerOrderId: "CC123456" });
};

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

  it("serializes official estimate params without leaking sign_key", async () => {
    let requestUrl: string | null = null;
    const fetchImpl: typeof fetch = async (input) => {
      requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      return new Response(
        JSON.stringify({
          code: 200,
          success: true,
          data: [
            {
              carType: 3,
              distance: 15100,
              duration: 1800,
              name: "曹操快车",
              price: 4200,
              priceKey: "price-key-3",
            },
          ],
        }),
        { status: 200 },
      );
    };
    const adapter = new CaocaoProviderAdapter({
      providerInstance: caocaoProviderInstance(),
      fetchImpl,
    });

    const quote = await adapter.estimate({
      params: {
        car_type: "3",
        city_code: "020",
        from_latitude: 23.12908,
        from_longitude: 113.26436,
        to_latitude: 23.063968,
        to_longitude: 113.397681,
      },
    });

    expect(requestUrl).not.toBeNull();
    const url = new URL(requestUrl ?? "");
    expect(url.pathname).toBe("/v2/common/estimatePriceWithDetail");
    expect(url.searchParams.get("client_id")).toBe("caocao-client");
    expect(url.searchParams.get("city_code")).toBe("020");
    expect(url.searchParams.get("from_latitude")).toBe("23.12908");
    expect(url.searchParams.get("from_longitude")).toBe("113.26436");
    expect(url.searchParams.get("to_latitude")).toBe("23.063968");
    expect(url.searchParams.get("to_longitude")).toBe("113.397681");
    expect(url.searchParams.has("flat")).toBe(false);
    expect(url.searchParams.has("flng")).toBe(false);
    expect(url.searchParams.has("tlat")).toBe(false);
    expect(url.searchParams.has("tlng")).toBe(false);
    expect(url.searchParams.has("timestamp")).toBe(true);
    expect(url.searchParams.has("sign")).toBe(true);
    expect(url.searchParams.has("sign_key")).toBe(false);
    expect(quote).toMatchObject({
      distanceMeters: 15100,
      durationSeconds: 1800,
      estimateAmountFen: 4200,
      providerQuoteId: "price-key-3",
      providerVehicleTypeCode: "3",
      providerVehicleTypeName: "曹操快车",
    });
  });

  it("queries city code when estimate params omit city_code", async () => {
    const requestUrls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      requestUrls.push(requestUrl);
      const url = new URL(requestUrl);
      if (url.pathname.endsWith("/common/queryCity")) {
        return new Response(
          JSON.stringify({
            code: 200,
            data: { city_code: "020" },
            success: true,
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          code: 200,
          data: {
            carType: "3",
            name: "曹操快车",
            price: 4200,
            priceKey: "price-key-3",
          },
          success: true,
        }),
        { status: 200 },
      );
    };
    const adapter = new CaocaoProviderAdapter({
      providerInstance: caocaoProviderInstance(),
      fetchImpl,
    });

    await adapter.estimate({
      params: {
        car_type: "3",
        departure_at: "2026-06-29T03:00:00.000Z",
        from_latitude: 23.12908,
        from_longitude: 113.26436,
        to_latitude: 23.063968,
        to_longitude: 113.397681,
      },
    });

    expect(requestUrls).toHaveLength(2);
    const queryCityUrl = new URL(requestUrls[0]);
    expect(queryCityUrl.pathname).toBe("/v2/common/queryCity");
    expect(queryCityUrl.searchParams.get("latitude")).toBe("23.12908");
    expect(queryCityUrl.searchParams.get("longitude")).toBe("113.26436");
    const estimateUrl = new URL(requestUrls[1]);
    expect(estimateUrl.pathname).toBe("/v2/common/estimatePriceWithDetail");
    expect(estimateUrl.searchParams.get("city_code")).toBe("020");
    expect(estimateUrl.searchParams.get("from_latitude")).toBe("23.12908");
    expect(estimateUrl.searchParams.get("from_longitude")).toBe("113.26436");
    expect(estimateUrl.searchParams.get("to_latitude")).toBe("23.063968");
    expect(estimateUrl.searchParams.get("to_longitude")).toBe("113.397681");
    expect(estimateUrl.searchParams.get("departure_time")).toBe("2026-06-29 11:00:00");
    expect(estimateUrl.searchParams.get("order_type")).toBe("1");
    expect(estimateUrl.searchParams.get("carpool_type")).toBe("0");
    expect(estimateUrl.searchParams.get("count_person")).toBe("2");
  });

  it("surfaces Caocao errno error bodies from city code lookup", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          errno: 10002,
          errmsg: "参数签名错误",
        }),
        { status: 200 },
      );
    const adapter = new CaocaoProviderAdapter({
      providerInstance: caocaoProviderInstance(),
      fetchImpl,
    });

    await expect(
      adapter.estimate({
        params: {
          car_type: "3",
          from_latitude: 23.12908,
          from_longitude: 113.26436,
          to_latitude: 23.063968,
          to_longitude: 113.397681,
        },
      }),
    ).rejects.toThrow("Caocao API failed: 10002 参数签名错误");
  });
});

describe("Caocao create ride", () => {
  it("submits multiple provider candidates through orderCarV2", async () => {
    const requests: Array<{ body: string | null; url: string }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const body =
        typeof init?.body === "string"
          ? init.body
          : init?.body instanceof URLSearchParams
            ? init.body.toString()
            : null;
      requests.push({
        url: requestUrl,
        body,
      });
      const url = new URL(requestUrl);
      if (url.pathname.endsWith("/common/queryCity")) {
        return new Response(
          JSON.stringify({
            code: 200,
            data: { cityCode: "020" },
            success: true,
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          code: 200,
          data: {
            orderNo: "CC123456",
          },
          success: true,
        }),
        { status: 200 },
      );
    };
    const adapter = new CaocaoProviderAdapter({
      providerInstance: caocaoProviderInstance(),
      fetchImpl,
    });

    const created = await adapter.createRide({
      orderId,
      callbackInfo: "callback-info",
      candidates: [
        {
          candidateId: "sku-5",
          providerVehicleTypeCode: "5",
          providerVehicleTypeName: "曹操专车",
          estimateAmountFen: 6800,
          providerQuoteId: "price-key-5",
          quoteAmountFen: 6800,
          providerSnapshot: null,
        },
        {
          candidateId: "sku-3",
          providerVehicleTypeCode: "3",
          providerVehicleTypeName: "曹操快车",
          estimateAmountFen: 4200,
          providerQuoteId: "price-key-3",
          quoteAmountFen: 4200,
          providerSnapshot: null,
        },
      ],
      contactPhone: "13800138000",
      departureAt: "2026-06-29T03:00:00.000Z",
      passenger: {
        name: "乘客",
        phone: "13800138000",
      },
      route: {
        origin: {
          name: "杭州东站",
          address: "天城路1号",
          latitude: 30.291,
          longitude: 120.212,
        },
        waypoints: [],
        destination: {
          name: "灵隐寺",
          address: "法云弄1号",
          latitude: 30.24,
          longitude: 120.102,
        },
      },
    });

    expect(requests).toHaveLength(2);
    const createRequest = requests[1];
    expect(createRequest).toBeDefined();
    expect(new URL(createRequest?.url ?? "").pathname).toBe("/v2/common/orderCarV2");
    const body = new URLSearchParams(createRequest?.body ?? "");
    expect(body.get("is_simultaneously_call")).toBe("1");
    expect(body.get("car_type")).toBeNull();
    expect(body.get("estimate_price")).toBeNull();
    expect(body.get("estimate_price_key")).toBeNull();
    expect(JSON.parse(body.get("service_type_price") ?? "[]")).toEqual([
      {
        estimateKey: "price-key-5",
        estimatePrice: 6800,
        serviceType: 5,
      },
      {
        estimateKey: "price-key-3",
        estimatePrice: 4200,
        serviceType: 3,
      },
    ]);
    expect(body.get("passenger_name")).toBe("乘客");
    expect(created.providerOrderId).toBe("CC123456");
    expect(created.dispatchSubmission).toEqual({
      submissionMode: "MULTI_CANDIDATE",
      submittedCandidateIds: ["sku-5", "sku-3"],
      providerVehicleTypeCodes: ["5", "3"],
    });
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
  it.each([
    { label: "未派单", status: 1 },
    { label: "已派单", status: "2" },
    { label: "行程中", status: "3" },
    { label: "系统取消", status: "4" },
    { label: "待支付", status: "5" },
    { label: "已评价", status: "6" },
    { label: "已支付待评价", status: "7" },
    { label: "计费结束", status: "8" },
    { label: "接客中", status: "9" },
    { label: "取消待付款", status: "10" },
    { label: "改派中", status: "11" },
    { label: "司机已到达", status: "12" },
    { label: "取消已支付", status: "13" },
    { label: "免责取消", status: "14" },
    { label: "用户取消", status: "20" },
    { label: "客服取消", status: "21" },
    { label: "司机取消", status: "26" },
    { label: "第三方取消", status: "27" },
  ])("labels official order status $status as $label", async ({ status, label }) => {
    const detail = await queryCaocaoDetailForStatus(status);

    expect(detail.phase).toBe(String(status));
    expect(detail.statusLabel).toBe(label);
  });

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
                requireLevel: 3,
                status: "12",
              },
              driverInfoVo: {
                carBrand: "几何",
                carNo: "浙A12345",
                carType: "几何A",
                color: "白色",
                driverName: "张师傅",
                driverPhone: "13800138001",
                location: {
                  direction: 90,
                  lat: 30.2688,
                  lng: 120.1608,
                  speed: 0,
                },
                serviceType: 7,
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

      if (url.pathname.endsWith("/common/queryDriverPolyline")) {
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
    expect(detail.providerVehicleTypeCode).toBe("3");
    expect(detail.providerVehicleTypeName).toBeNull();
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
      "/v2/common/queryDriverPolyline",
    ]);
  });

  it("does not infer provider vehicle type from non-requireLevel detail fields", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          code: 200,
          data: {
            basicOrderVO: {
              carType: 3,
              serviceType: 3,
              status: "9",
            },
            driverInfoVo: {
              carBrand: "几何",
              carNo: "浙A12345",
              carType: "几何A",
              color: "白色",
              driverName: "张师傅",
              driverPhone: "13800138001",
              serviceType: 3,
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
    expect(detail.providerVehicleTypeCode).toBeNull();
    expect(detail.providerVehicleTypeName).toBeNull();
  });

  it("queries authoritative final settlement from queryOrderDetailV2 orderFeeVo.totalFee", async () => {
    const requestPaths: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(requestUrl);
      requestPaths.push(url.pathname);

      if (url.pathname.endsWith("/common/queryOrderDetailV2")) {
        expect(init).toBeUndefined();
        expect(url.searchParams.get("order_id")).toBe("CC123456");
        return new Response(
          JSON.stringify({
            code: 200,
            data: {
              basicOrderVO: {
                status: "5",
              },
              orderFeeVo: {
                totalFee: 1200,
              },
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

    const bill = await adapter.queryFinalSettlement({ providerOrderId: "CC123456" });

    expect(requestPaths).toEqual(["/v2/common/queryOrderDetailV2"]);
    expect(bill).toEqual({
      amountFen: 1200,
      currency: "CNY",
      providerOrderId: "CC123456",
      providerSnapshot: {
        basicOrderVO: {
          status: "5",
        },
        orderFeeVo: {
          totalFee: 1200,
        },
      },
    });
  });

  it("queries cancellation fee preview from queryCancelFee", async () => {
    const requestPaths: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(requestUrl);
      requestPaths.push(url.pathname);

      if (url.pathname.endsWith("/common/queryCancelFee")) {
        expect(url.searchParams.get("order_no")).toBe("CC123456");
        return new Response(
          JSON.stringify({
            code: 200,
            data: {
              cancelFee: 800,
              orderNo: "CC123456",
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

    const preview = await adapter.queryCancelFee({ providerOrderId: "CC123456" });

    expect(requestPaths).toEqual(["/v2/common/queryCancelFee"]);
    expect(preview).toEqual({
      cancelFeeFen: 800,
      providerOrderId: "CC123456",
      providerSnapshot: {
        cancelFee: 800,
        orderNo: "CC123456",
      },
    });
  });

  it("treats missing orderFeeVo.totalFee as no authoritative final settlement yet", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          code: 200,
          data: {
            basicOrderVO: {
              status: "5",
            },
            orderFeeVo: {
              totalFee: null,
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

    await expect(adapter.queryFinalSettlement({ providerOrderId: "CC123456" })).resolves.toBeNull();
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

  it("logs provider diagnostics for failed route queries", async () => {
    const stdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      const fetchImpl: typeof fetch = async () =>
        new Response(
          JSON.stringify({
            code: 25011,
            msg: "订单状态不正确",
            success: false,
          }),
          { status: 200 },
        );
      const adapter = new CaocaoProviderAdapter({
        providerInstance: caocaoProviderInstance(),
        fetchImpl,
      });

      await expect(
        adapter.queryDriverRoute({
          providerOrderId: "CC123456",
          routeKind: "PICKUP",
        }),
      ).rejects.toThrow("Caocao API failed: 25011 订单状态不正确");

      const logOutput = stdoutWrite.mock.calls.map(([chunk]) => String(chunk)).join("");
      expect(logOutput).toContain('"marker":"RideHailingProviderCaocao"');
      expect(logOutput).toContain('"event":"caocao_provider_failure"');
      expect(logOutput).toContain('"endpointPath":"/common/queryDriverPolyline"');
      expect(logOutput).toContain('"providerCode":25011');
      expect(logOutput).toContain('"providerMsg":"订单状态不正确"');
    } finally {
      stdoutWrite.mockRestore();
    }
  });
});
