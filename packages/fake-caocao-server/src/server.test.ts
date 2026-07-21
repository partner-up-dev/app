import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, test } from "vitest";
import { type StartedFakeCaocaoServer, startFakeCaocaoServer } from "./server";
import { createFakeCaocaoSignature } from "./signature";

const signedSearchParams = (input: {
  clientId: string;
  params: Record<string, string>;
  signKey: string;
}): URLSearchParams => {
  const params = {
    client_id: input.clientId,
    ...input.params,
  };
  return new URLSearchParams({
    ...params,
    sign: createFakeCaocaoSignature({
      params,
      signKey: input.signKey,
    }),
  });
};

const defaultEstimateParams = (
  input: Partial<Record<string, string>> = {},
): Record<string, string> => ({
  car_type: "5",
  city_code: "0571",
  from_latitude: "30.2500",
  from_longitude: "120.2000",
  timestamp: "1",
  to_latitude: "30.3000",
  to_longitude: "120.2500",
  ...input,
});

const defaultCreateParams = (
  input: Partial<Record<string, string>> = {},
): Record<string, string> => ({
  callback_info: "pu.rhc.v1.stg.00000000-0000-0000-0000-000000000501",
  caller_phone: "13800138000",
  car_type: "5",
  city_code: "0571",
  end_address: "杭州市西湖区灵隐路1号",
  end_name: "灵隐寺",
  estimate_price: "5200",
  estimate_price_key: "fake_quote_5_5200",
  ext_order_id: "external-order-1",
  from_latitude: "30.2500",
  from_longitude: "120.2000",
  is_simultaneously_call: "0",
  order_type: "1",
  start_address: "杭州市上城区全福桥路2号",
  start_name: "杭州东站",
  timestamp: "2",
  to_latitude: "30.3000",
  to_longitude: "120.2500",
  ...input,
});

const closeServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const countPolylineCoordinates = (coords: string | undefined): number =>
  coords
    ?.split(";")
    .map((item) => item.trim())
    .filter((item) => item.length > 0).length ?? 0;

const parsePolylineCoordinates = (
  coords: string | undefined,
): Array<{ latitude: number; longitude: number }> =>
  coords
    ?.split(";")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => {
      const [latitudeRaw, longitudeRaw] = item.split(",");
      return {
        latitude: Number(latitudeRaw),
        longitude: Number(longitudeRaw),
      };
    }) ?? [];

const coordinateDelta = (
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
): number =>
  Math.abs(first.latitude - second.latitude) + Math.abs(first.longitude - second.longitude);

const startCallbackResponseServer = async (input: {
  body: string;
  status: number;
}): Promise<{
  readonly origin: string;
  readonly receivedBodies: string[];
  close(): Promise<void>;
}> => {
  const receivedBodies: string[] = [];
  const server = createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      body += chunk;
    });
    req.on("end", () => {
      receivedBodies.push(body);
      res.writeHead(input.status, { "Content-Type": "application/json; charset=utf-8" });
      res.end(input.body);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Callback response server did not expose a TCP address");
  }

  return {
    close: () => closeServer(server),
    origin: `http://127.0.0.1:${(address as AddressInfo).port}`,
    receivedBodies,
  };
};

describe("startFakeCaocaoServer", () => {
  let server: StartedFakeCaocaoServer | null = null;

  afterEach(async () => {
    await server?.close();
    server = null;
  });

  test("serves health readiness", async () => {
    server = await startFakeCaocaoServer();

    const response = await fetch(`${server.origin}/health`, {
      method: "HEAD",
    });

    expect(response.ok).toBe(true);
  });

  test("serves signed estimate, create, detail, and authoritative payable routes", async () => {
    server = await startFakeCaocaoServer();

    const estimateResponse = await fetch(
      `${server.origin}/common/estimatePriceWithDetail?${signedSearchParams({
        clientId: server.fixture.clientId,
        params: defaultEstimateParams(),
        signKey: server.fixture.signKey,
      }).toString()}`,
    );
    const estimateBody = (await estimateResponse.json()) as {
      code: number;
      data: { price: number };
      success: boolean;
    };

    expect(estimateResponse.ok).toBe(true);
    expect(estimateBody.success).toBe(true);
    expect(estimateBody.data.price).toBe(5200);

    const createResponse = await fetch(`${server.origin}/common/orderCarV2`, {
      body: signedSearchParams({
        clientId: server.fixture.clientId,
        params: defaultCreateParams(),
        signKey: server.fixture.signKey,
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    const createBody = (await createResponse.json()) as {
      code: number;
      data: { orderNo: string };
      success: boolean;
    };

    expect(createResponse.ok).toBe(true);
    expect(createBody.success).toBe(true);
    expect(createBody.data.orderNo).toBe("CCexternalorder1");
    expect(server.state.findOrder(createBody.data.orderNo)?.callbackInfo).toBe(
      "pu.rhc.v1.stg.00000000-0000-0000-0000-000000000501",
    );
    expect(server.state.findOrder(createBody.data.orderNo)?.submittedCarTypes).toEqual(["5"]);

    const detailResponse = await fetch(
      `${server.origin}/common/queryOrderDetailV2?${signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          order_id: createBody.data.orderNo,
          timestamp: "3",
        },
        signKey: server.fixture.signKey,
      }).toString()}`,
    );
    const detailBody = (await detailResponse.json()) as {
      code: number;
      data: { basicOrderVO: { requireLevel: number; status: string }; driverInfoVo: null };
      success: boolean;
    };

    expect(detailResponse.ok).toBe(true);
    expect(detailBody.success).toBe(true);
    expect(detailBody.data.basicOrderVO.status).toBe("1");
    expect(detailBody.data.basicOrderVO.requireLevel).toBe(5);
    expect(detailBody.data.driverInfoVo).toBeNull();

    const advanceResponse = await fetch(`${server.origin}/__fake_caocao/orders/latest/advance`, {
      method: "POST",
    });
    const advanceBody = (await advanceResponse.json()) as {
      ok: boolean;
      order: { phase: string; providerOrderId: string };
    };

    expect(advanceResponse.ok).toBe(true);
    expect(advanceBody.ok).toBe(true);
    expect(advanceBody.order.providerOrderId).toBe(createBody.data.orderNo);
    expect(advanceBody.order.phase).toBe("ACCEPTED");

    const detailAfterAdvanceResponse = await fetch(
      `${server.origin}/common/queryOrderDetailV2?${signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          order_id: createBody.data.orderNo,
          timestamp: "31",
        },
        signKey: server.fixture.signKey,
      }).toString()}`,
    );
    const detailAfterAdvanceBody = (await detailAfterAdvanceResponse.json()) as {
      code: number;
      data: {
        basicOrderVO: {
          requireLevel: number;
          routeFixedPrice: boolean;
          specialFixedPrice: boolean;
          status: string;
        } & Record<string, unknown>;
        driverInfoVo: {
          avatar: string;
          card: string;
          carType: string;
          location: { lat: number; lng: number } & Record<string, unknown>;
          name: string;
          phone: string;
          phone_passenger: string;
          serviceType: string;
        } & Record<string, unknown>;
        orderFeeVo: {
          companyPayAmount: number | null;
          detailFeeVos: Array<{ amount: number; chargeCode: string; chargeDesc: string }>;
          doubleTollFlag: number;
          originTotalFee: number | null;
          personalPayAmount: number | null;
          totalFee: number | null;
        };
        orderInvoiceVo: {
          companyAmount: number | null;
          personalAmount: number | null;
        };
        orderPayVo: {
          giftAmount: number | null;
          principalAmount: number | null;
        };
      };
      success: boolean;
    };

    expect(detailAfterAdvanceResponse.ok).toBe(true);
    expect(detailAfterAdvanceBody.success).toBe(true);
    expect(detailAfterAdvanceBody.data.basicOrderVO.status).toBe("9");
    expect(detailAfterAdvanceBody.data.basicOrderVO.requireLevel).toBe(5);
    expect(detailAfterAdvanceBody.data.basicOrderVO.routeFixedPrice).toBe(false);
    expect(detailAfterAdvanceBody.data.basicOrderVO.specialFixedPrice).toBe(false);
    expect(detailAfterAdvanceBody.data.driverInfoVo.avatar).toBe(
      "https://fake.caocao.partner-up.test/driver/avatar.png",
    );
    expect(detailAfterAdvanceBody.data.driverInfoVo.carType).toBe("几何A");
    expect(detailAfterAdvanceBody.data.driverInfoVo.card).toBe("浙A12345");
    expect(detailAfterAdvanceBody.data.driverInfoVo.location.lat).toBeTypeOf("number");
    expect(detailAfterAdvanceBody.data.driverInfoVo.location.lng).toBeTypeOf("number");
    expect(detailAfterAdvanceBody.data.driverInfoVo.name).toBe("曹操测试司机");
    expect(detailAfterAdvanceBody.data.driverInfoVo.phone).toBe("13900139000");
    expect(detailAfterAdvanceBody.data.driverInfoVo.phone_passenger).toBe("13900139000");
    expect(detailAfterAdvanceBody.data.driverInfoVo.serviceType).toBe("5");
    expect(detailAfterAdvanceBody.data.orderFeeVo).toEqual({
      companyPayAmount: null,
      detailFeeVos: [],
      doubleTollFlag: 0,
      originTotalFee: null,
      personalPayAmount: null,
      totalFee: null,
    });
    expect(detailAfterAdvanceBody.data.orderInvoiceVo).toEqual({
      companyAmount: null,
      personalAmount: null,
    });
    expect(detailAfterAdvanceBody.data.orderPayVo).toEqual({
      giftAmount: null,
      principalAmount: null,
    });

    const driverLocationResponse = await fetch(
      `${server.origin}/common/queryDriverLocationByOrderId?${signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          order_id: createBody.data.orderNo,
          timestamp: "32",
        },
        signKey: server.fixture.signKey,
      }).toString()}`,
    );
    const driverLocationBody = (await driverLocationResponse.json()) as {
      code: number;
      data: { direction: number; latitude: number; longitude: number };
      success: boolean;
    };

    expect(driverLocationResponse.ok).toBe(true);
    expect(driverLocationBody.success).toBe(true);
    expect(driverLocationBody.data.latitude).toBeTypeOf("number");
    expect(driverLocationBody.data.longitude).toBeTypeOf("number");
    expect(driverLocationBody.data.direction).toBeTypeOf("number");

    const driverPolylineResponse = await fetch(`${server.origin}/common/queryDriverPolyline`, {
      body: signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          navigation_polyline_type: "1",
          order_id: createBody.data.orderNo,
          timestamp: "33",
        },
        signKey: server.fixture.signKey,
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    const driverPolylineBody = (await driverPolylineResponse.json()) as {
      code: number;
      data: {
        driverEtaInfoVO: { direction: number; lat: number; lng: number };
        navigationPolylineType: number;
        steps: Array<{ links: Array<{ coords: string }> }>;
      };
      success: boolean;
    };

    expect(driverPolylineResponse.ok).toBe(true);
    expect(driverPolylineBody.success).toBe(true);
    expect(driverPolylineBody.data.navigationPolylineType).toBe(1);
    expect(driverPolylineBody.data.steps[0]?.links[0]?.coords).toContain(";");
    expect(
      countPolylineCoordinates(driverPolylineBody.data.steps[0]?.links[0]?.coords),
    ).toBeGreaterThan(2);
    const pickupRoute = parsePolylineCoordinates(
      driverPolylineBody.data.steps[0]?.links[0]?.coords,
    );
    expect(pickupRoute[0]?.latitude).toBeCloseTo(driverLocationBody.data.latitude, 6);
    expect(pickupRoute[0]?.longitude).toBeCloseTo(driverLocationBody.data.longitude, 6);
    expect(driverPolylineBody.data.driverEtaInfoVO.lat).toBeCloseTo(
      driverLocationBody.data.latitude,
      6,
    );
    expect(driverPolylineBody.data.driverEtaInfoVO.lng).toBeCloseTo(
      driverLocationBody.data.longitude,
      6,
    );

    const advancedDriverLocationResponse = await fetch(
      `${server.origin}/common/queryDriverLocationByOrderId?${signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          order_id: createBody.data.orderNo,
          timestamp: "34",
        },
        signKey: server.fixture.signKey,
      }).toString()}`,
    );
    const advancedDriverLocationBody = (await advancedDriverLocationResponse.json()) as {
      data: { direction: number; latitude: number; longitude: number };
      success: boolean;
    };
    expect(advancedDriverLocationBody.success).toBe(true);
    expect(
      coordinateDelta(driverLocationBody.data, advancedDriverLocationBody.data),
    ).toBeGreaterThan(0.00001);

    const arrivedPhaseResponse = await fetch(
      `${server.origin}/__fake_caocao/orders/${createBody.data.orderNo}/advance`,
      {
        method: "POST",
      },
    );
    const arrivedPhaseBody = (await arrivedPhaseResponse.json()) as {
      ok: boolean;
      order: { phase: string };
    };
    expect(arrivedPhaseResponse.ok).toBe(true);
    expect(arrivedPhaseBody.ok).toBe(true);
    expect(arrivedPhaseBody.order.phase).toBe("ARRIVED_AT_PICKUP");

    const inTripPhaseResponse = await fetch(
      `${server.origin}/__fake_caocao/orders/${createBody.data.orderNo}/advance`,
      {
        method: "POST",
      },
    );
    const inTripPhaseBody = (await inTripPhaseResponse.json()) as {
      ok: boolean;
      order: { phase: string };
    };

    expect(inTripPhaseResponse.ok).toBe(true);
    expect(inTripPhaseBody.ok).toBe(true);
    expect(inTripPhaseBody.order.phase).toBe("IN_TRIP");

    const inTripDriverLocationResponse = await fetch(
      `${server.origin}/common/queryDriverLocationByOrderId?${signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          order_id: createBody.data.orderNo,
          timestamp: "35",
        },
        signKey: server.fixture.signKey,
      }).toString()}`,
    );
    const inTripDriverLocationBody = (await inTripDriverLocationResponse.json()) as {
      data: { direction: number; latitude: number; longitude: number };
      success: boolean;
    };
    expect(inTripDriverLocationBody.success).toBe(true);

    const inTripPolylineResponse = await fetch(`${server.origin}/common/queryDriverPolyline`, {
      body: signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          navigation_polyline_type: "3",
          order_id: createBody.data.orderNo,
          timestamp: "36",
        },
        signKey: server.fixture.signKey,
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    const inTripPolylineBody = (await inTripPolylineResponse.json()) as {
      code: number;
      data: {
        driverEtaInfoVO: { direction: number; lat: number; lng: number };
        navigationPolylineType: number;
        steps: Array<{ links: Array<{ coords: string }> }>;
      };
      success: boolean;
    };

    expect(inTripPolylineResponse.ok).toBe(true);
    expect(inTripPolylineBody.success).toBe(true);
    expect(inTripPolylineBody.data.navigationPolylineType).toBe(3);
    expect(
      countPolylineCoordinates(inTripPolylineBody.data.steps[0]?.links[0]?.coords),
    ).toBeGreaterThan(2);
    const inTripRoute = parsePolylineCoordinates(
      inTripPolylineBody.data.steps[0]?.links[0]?.coords,
    );
    expect(inTripRoute[0]?.latitude).toBeCloseTo(inTripDriverLocationBody.data.latitude, 6);
    expect(inTripRoute[0]?.longitude).toBeCloseTo(inTripDriverLocationBody.data.longitude, 6);

    const finishedPhaseResponse = await fetch(
      `${server.origin}/__fake_caocao/orders/${createBody.data.orderNo}/advance`,
      {
        method: "POST",
      },
    );
    const finishedPhaseBody = (await finishedPhaseResponse.json()) as {
      ok: boolean;
      order: { phase: string };
    };

    expect(finishedPhaseResponse.ok).toBe(true);
    expect(finishedPhaseBody.ok).toBe(true);
    expect(finishedPhaseBody.order.phase).toBe("FINISHED");

    const queryCalculateBillResponse = await fetch(`${server.origin}/common/queryCalculateBill`, {
      body: signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          order_id: createBody.data.orderNo,
          timestamp: "37",
        },
        signKey: server.fixture.signKey,
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    const queryCalculateBillBody = (await queryCalculateBillResponse.json()) as {
      code: number;
      data: {
        companyFee: number;
        personalFee: number;
        totalFee: number;
      };
      success: boolean;
    };

    expect(queryCalculateBillResponse.ok).toBe(true);
    expect(queryCalculateBillBody.success).toBe(true);
    expect(queryCalculateBillBody.data.companyFee).toBe(5600);
    expect(queryCalculateBillBody.data.personalFee).toBe(0);
    expect(queryCalculateBillBody.data.totalFee).toBe(5600);

    const finishedDetailResponse = await fetch(
      `${server.origin}/common/queryOrderDetailV2?${signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          order_id: createBody.data.orderNo,
          timestamp: "38",
        },
        signKey: server.fixture.signKey,
      }).toString()}`,
    );
    const finishedDetailBody = (await finishedDetailResponse.json()) as {
      data: {
        orderFeeVo: {
          companyPayAmount: number;
          detailFeeVos: Array<{ amount: number; chargeCode: string; chargeDesc: string }>;
          doubleTollFlag: number;
          originTotalFee: number;
          personalPayAmount: number;
          totalFee: number;
        };
        orderInvoiceVo: {
          companyAmount: number;
          personalAmount: number;
        };
        orderPayVo: {
          giftAmount: number;
          principalAmount: number;
        };
      };
      success: boolean;
    };

    expect(finishedDetailResponse.ok).toBe(true);
    expect(finishedDetailBody.success).toBe(true);
    expect(finishedDetailBody.data.orderFeeVo).toEqual({
      companyPayAmount: 5600,
      detailFeeVos: [
        {
          amount: 1200,
          chargeCode: "start_fee",
          chargeDesc: "订单起步价",
        },
        {
          amount: 4400,
          chargeCode: "travel_km_fee",
          chargeDesc: "里程费用",
        },
      ],
      doubleTollFlag: 0,
      originTotalFee: 5600,
      personalPayAmount: 0,
      totalFee: 5600,
    });
    expect(finishedDetailBody.data.orderInvoiceVo).toEqual({
      companyAmount: 5600,
      personalAmount: 0,
    });
    expect(finishedDetailBody.data.orderPayVo).toEqual({
      giftAmount: 0,
      principalAmount: 5600,
    });

    const invalidPhaseResponse = await fetch(
      `${server.origin}/__fake_caocao/orders/${createBody.data.orderNo}/phase?phase=BOARDING`,
      {
        method: "POST",
      },
    );
    const invalidPhaseBody = (await invalidPhaseResponse.json()) as {
      code: string;
      message: string;
    };

    expect(invalidPhaseResponse.status).toBe(400);
    expect(invalidPhaseBody.code).toBe("FAKE_CAOCAO_UNSUPPORTED_ORDER_PHASE");
  });

  test("serves multi-vehicle orderCarV2 and records submitted car types", async () => {
    server = await startFakeCaocaoServer();

    const createParams = defaultCreateParams({
      ext_order_id: "external-order-multi",
      is_simultaneously_call: "1",
      service_type_price: JSON.stringify([
        {
          estimateKey: "fake_quote_3_3600",
          estimatePrice: 3600,
          serviceType: 3,
        },
        {
          estimateKey: "fake_quote_5_5200",
          estimatePrice: 5200,
          serviceType: 5,
        },
      ]),
      timestamp: "41",
    });
    delete createParams.car_type;
    delete createParams.estimate_price;
    delete createParams.estimate_price_key;

    const createResponse = await fetch(`${server.origin}/common/orderCarV2`, {
      body: signedSearchParams({
        clientId: server.fixture.clientId,
        params: createParams,
        signKey: server.fixture.signKey,
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    const createBody = (await createResponse.json()) as {
      data: { orderNo: string };
      success: boolean;
    };

    expect(createResponse.ok).toBe(true);
    expect(createBody.success).toBe(true);
    const order = server.state.findOrder(createBody.data.orderNo);
    expect(order?.carType).toBe("3");
    expect(order?.estimatePriceFen).toBe(3600);
    expect(order?.submittedCarTypes).toEqual(["3", "5"]);

    const detailResponse = await fetch(
      `${server.origin}/common/queryOrderDetailV2?${signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          order_id: createBody.data.orderNo,
          timestamp: "42",
        },
        signKey: server.fixture.signKey,
      }).toString()}`,
    );
    const detailBody = (await detailResponse.json()) as {
      data: { basicOrderVO: { requireLevel: number } };
      success: boolean;
    };
    expect(detailResponse.ok).toBe(true);
    expect(detailBody.success).toBe(true);
    expect(detailBody.data.basicOrderVO.requireLevel).toBe(3);
  });

  test("supports admin retreat controls", async () => {
    server = await startFakeCaocaoServer();

    const created = server.state.createOrder({
      carType: "3",
      externalOrderId: "external-order-retreat",
    });
    server.state.setOrderPhase(created.providerOrderId, "ARRIVED_AT_PICKUP");

    const retreatResponse = await fetch(`${server.origin}/__fake_caocao/orders/latest/retreat`, {
      method: "POST",
    });
    const retreatBody = (await retreatResponse.json()) as {
      callback: { skipped: boolean };
      ok: boolean;
      order: { phase: string; providerOrderId: string };
    };

    expect(retreatResponse.ok).toBe(true);
    expect(retreatBody.ok).toBe(true);
    expect(retreatBody.callback.skipped).toBe(true);
    expect(retreatBody.order.providerOrderId).toBe(created.providerOrderId);
    expect(retreatBody.order.phase).toBe("ACCEPTED");

    const secondRetreatResponse = await fetch(
      `${server.origin}/__fake_caocao/orders/${created.providerOrderId}/retreat`,
      { method: "POST" },
    );
    const secondRetreatBody = (await secondRetreatResponse.json()) as {
      order: { phase: string; providerOrderId: string };
    };

    expect(secondRetreatResponse.ok).toBe(true);
    expect(secondRetreatBody.order.phase).toBe("CREATED");

    const nonRetreatableResponse = await fetch(
      `${server.origin}/__fake_caocao/orders/${created.providerOrderId}/retreat`,
      { method: "POST" },
    );
    const nonRetreatableBody = (await nonRetreatableResponse.json()) as {
      code: string;
    };

    expect(nonRetreatableResponse.status).toBe(409);
    expect(nonRetreatableBody.code).toBe("FAKE_CAOCAO_ORDER_PHASE_NOT_RETREATABLE");
  });

  test("uses cached planned routes for driver movement geometry", async () => {
    const plannerCalls: Array<{
      routeKind: string;
      from: { latitude: number; longitude: number };
      to: { latitude: number; longitude: number };
    }> = [];
    server = await startFakeCaocaoServer({
      routePlanner: async (input) => {
        plannerCalls.push({
          from: input.from,
          routeKind: input.routeKind,
          to: input.to,
        });
        return {
          coordinates: [
            input.from,
            { latitude: input.from.latitude + 0.03, longitude: input.from.longitude + 0.001 },
            { latitude: input.to.latitude - 0.01, longitude: input.to.longitude - 0.02 },
            input.to,
          ],
          distanceMeters: 4200,
          durationSeconds: 900,
        };
      },
    });

    const created = server.state.createOrder({
      carType: "3",
      destination: { latitude: 30.35, longitude: 120.3 },
      externalOrderId: "external-order-planned-route",
      origin: { latitude: 30.25, longitude: 120.2 },
    });
    server.state.setOrderPhase(created.providerOrderId, "IN_TRIP");

    const firstResponse = await fetch(`${server.origin}/common/queryDriverPolyline`, {
      body: signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          navigation_polyline_type: "3",
          order_id: created.providerOrderId,
          timestamp: "41",
        },
        signKey: server.fixture.signKey,
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    const firstBody = (await firstResponse.json()) as {
      data: {
        steps: Array<{ links: Array<{ coords: string }> }>;
      };
      success: boolean;
    };
    const firstRoute = parsePolylineCoordinates(firstBody.data.steps[0]?.links[0]?.coords);

    expect(firstBody.success).toBe(true);
    expect(plannerCalls).toHaveLength(1);
    expect(plannerCalls[0]?.routeKind).toBe("DROPOFF");
    expect(firstRoute).toHaveLength(4);
    expect(firstRoute[1]?.latitude).toBeCloseTo(30.28, 6);
    expect(firstRoute[1]?.longitude).toBeCloseTo(120.201, 6);

    const secondResponse = await fetch(`${server.origin}/common/queryDriverPolyline`, {
      body: signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          navigation_polyline_type: "3",
          order_id: created.providerOrderId,
          timestamp: "42",
        },
        signKey: server.fixture.signKey,
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    const secondBody = (await secondResponse.json()) as {
      data: {
        steps: Array<{ links: Array<{ coords: string }> }>;
      };
      success: boolean;
    };
    const secondRoute = parsePolylineCoordinates(secondBody.data.steps[0]?.links[0]?.coords);

    expect(secondBody.success).toBe(true);
    expect(plannerCalls).toHaveLength(1);
    expect(firstRoute[0]).not.toEqual(secondRoute[0]);
    expect(secondRoute.at(-1)).toEqual({
      latitude: 30.35,
      longitude: 120.3,
    });
  });

  test("requires v1 navigation_polyline_type for driver polyline queries", async () => {
    server = await startFakeCaocaoServer();

    const created = server.state.createOrder({
      carType: "3",
      externalOrderId: "external-order-missing-nav-type",
    });
    server.state.setOrderPhase(created.providerOrderId, "ACCEPTED");

    const response = await fetch(`${server.origin}/common/queryDriverPolyline`, {
      body: signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          order_id: created.providerOrderId,
          timestamp: "43",
        },
        signKey: server.fixture.signKey,
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    const body = (await response.json()) as {
      code: number;
      msg: string;
      success: boolean;
    };

    expect(response.ok).toBe(true);
    expect(body.success).toBe(false);
    expect(body.code).toBe(40001);
    expect(body.msg).toBe("body(queryDriverPolyline)/navigation_polyline_type is required");
  });

  test("reports admin callback delivery failures", async () => {
    server = await startFakeCaocaoServer();
    const callbackServer = await startCallbackResponseServer({
      body: JSON.stringify({ error: "backend callback rejected" }),
      status: 503,
    });

    try {
      const created = server.state.createOrder({
        callbackUrl: `${callbackServer.origin}/callback`,
        carType: "3",
        externalOrderId: "external-order-callback-failure",
      });

      const advanceResponse = await fetch(
        `${server.origin}/__fake_caocao/orders/${created.providerOrderId}/advance`,
        { method: "POST" },
      );
      const advanceBody = (await advanceResponse.json()) as {
        callback: {
          bodyPreview: string | null;
          callbackUrl: string;
          ok: boolean;
          status: number | null;
        };
        code: string;
        message: string;
        order: { phase: string; providerOrderId: string };
      };

      expect(advanceResponse.status).toBe(502);
      expect(advanceBody.code).toBe("FAKE_CAOCAO_CALLBACK_DELIVERY_FAILED");
      expect(advanceBody.callback.ok).toBe(false);
      expect(advanceBody.callback.callbackUrl).toBe(`${callbackServer.origin}/callback`);
      expect(advanceBody.callback.status).toBe(503);
      expect(advanceBody.callback.bodyPreview).toContain("backend callback rejected");
      expect(advanceBody.order.providerOrderId).toBe(created.providerOrderId);
      expect(advanceBody.order.phase).toBe("ACCEPTED");
      expect(server.state.findOrder(created.providerOrderId)?.phase).toBe("ACCEPTED");
      expect(callbackServer.receivedBodies[0]).toContain("order_id=");
    } finally {
      await callbackServer.close();
    }
  });

  test("posts callback_info during successful callback delivery", async () => {
    server = await startFakeCaocaoServer();
    const callbackServer = await startCallbackResponseServer({
      body: JSON.stringify({ code: 200, success: true }),
      status: 200,
    });

    try {
      const callbackInfo = "pu.rhc.v1.stg.00000000-0000-0000-0000-000000000501";
      const created = server.state.createOrder({
        callbackInfo,
        callbackUrl: `${callbackServer.origin}/callback`,
        carType: "3",
        externalOrderId: "external-order-callback-success",
      });

      const advanceResponse = await fetch(
        `${server.origin}/__fake_caocao/orders/${created.providerOrderId}/advance`,
        { method: "POST" },
      );
      const advanceBody = (await advanceResponse.json()) as {
        callback: {
          callbackUrl: string;
          ok: boolean;
          status: number | null;
        };
        ok: boolean;
        order: { phase: string; providerOrderId: string };
      };

      expect(advanceResponse.ok).toBe(true);
      expect(advanceBody.ok).toBe(true);
      expect(advanceBody.callback.ok).toBe(true);
      expect(advanceBody.callback.callbackUrl).toBe(`${callbackServer.origin}/callback`);
      expect(advanceBody.callback.status).toBe(200);
      expect(advanceBody.order.providerOrderId).toBe(created.providerOrderId);
      expect(advanceBody.order.phase).toBe("ACCEPTED");
      expect(new URLSearchParams(callbackServer.receivedBodies[0]).get("callback_info")).toBe(
        callbackInfo,
      );
    } finally {
      await callbackServer.close();
    }
  });

  test("supports admin estimate controls", async () => {
    server = await startFakeCaocaoServer();

    const updateResponse = await fetch(`${server.origin}/__fake_caocao/estimates`, {
      body: JSON.stringify({
        carType: "3",
        estimateAmountFen: 4100,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const updateBody = (await updateResponse.json()) as {
      estimate: { estimateAmountFen: number };
      ok: boolean;
    };

    expect(updateResponse.ok).toBe(true);
    expect(updateBody.ok).toBe(true);
    expect(updateBody.estimate.estimateAmountFen).toBe(4100);

    const estimateResponse = await fetch(
      `${server.origin}/common/estimatePriceWithDetail?${signedSearchParams({
        clientId: server.fixture.clientId,
        params: defaultEstimateParams({
          car_type: "3",
          timestamp: "51",
        }),
        signKey: server.fixture.signKey,
      }).toString()}`,
    );
    const estimateBody = (await estimateResponse.json()) as {
      data: { price: number };
      success: boolean;
    };

    expect(estimateBody.success).toBe(true);
    expect(estimateBody.data.price).toBe(4100);
  });

  test("supports admin reset and next-create failure controls", async () => {
    server = await startFakeCaocaoServer();

    const failNextResponse = await fetch(`${server.origin}/__fake_caocao/create-failure/next`, {
      method: "POST",
    });
    expect(failNextResponse.ok).toBe(true);

    const createResponse = await fetch(`${server.origin}/common/orderCarV2`, {
      body: signedSearchParams({
        clientId: server.fixture.clientId,
        params: defaultCreateParams({
          car_type: "3",
          estimate_price: "3600",
          estimate_price_key: "fake_quote_3_3600",
          ext_order_id: "external-order-2",
          timestamp: "4",
        }),
        signKey: server.fixture.signKey,
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    const createBody = (await createResponse.json()) as {
      code: number;
      msg: string;
      success: boolean;
    };

    expect(createBody.success).toBe(false);
    expect(createBody.code).toBe(50001);
    expect(createBody.msg).toBe("Fake Caocao create failed");

    await fetch(`${server.origin}/__fake_caocao/reset`, {
      method: "POST",
    });

    const stateResponse = await fetch(`${server.origin}/__fake_caocao/state`);
    const stateBody = (await stateResponse.json()) as {
      failNextCreate: boolean;
      orders: unknown[];
    };

    expect(stateBody.failNextCreate).toBe(false);
    expect(stateBody.orders).toHaveLength(0);
  });

  test("accepts one create while dropping its response and exposes provider call count", async () => {
    server = await startFakeCaocaoServer();
    const armed = await fetch(`${server.origin}/__fake_caocao/create-response-loss/next`, {
      method: "POST",
    });
    expect(armed.ok).toBe(true);

    const createResponse = await fetch(`${server.origin}/common/orderCarV2`, {
      body: signedSearchParams({
        clientId: server.fixture.clientId,
        params: defaultCreateParams({
          car_type: "3",
          estimate_price: "3600",
          estimate_price_key: "fake_quote_3_3600",
          ext_order_id: "external-response-lost",
          timestamp: "52",
        }),
        signKey: server.fixture.signKey,
      }).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    });
    expect(createResponse.status).toBe(503);

    const stateResponse = await fetch(`${server.origin}/__fake_caocao/state`);
    const stateBody = (await stateResponse.json()) as {
      createRequestCount: number;
      dropNextCreateResponseAfterAccept: boolean;
      orders: unknown[];
    };
    expect(stateBody.createRequestCount).toBe(1);
    expect(stateBody.dropNextCreateResponseAfterAccept).toBe(false);
    expect(stateBody.orders).toHaveLength(1);
  });
});
