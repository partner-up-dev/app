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

  test("serves signed estimate, create, and detail routes", async () => {
    server = await startFakeCaocaoServer();

    const estimateResponse = await fetch(
      `${server.origin}/common/estimatePriceWithDetail?${signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          car_type: "PREMIER",
          timestamp: "1",
        },
        signKey: server.fixture.signKey,
      }).toString()}`,
    );
    const estimateBody = (await estimateResponse.json()) as {
      code: number;
      data: { estimateAmountFen: number };
      success: boolean;
    };

    expect(estimateResponse.ok).toBe(true);
    expect(estimateBody.success).toBe(true);
    expect(estimateBody.data.estimateAmountFen).toBe(5200);

    const createResponse = await fetch(`${server.origin}/common/orderCarV2`, {
      body: signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          car_type: "PREMIER",
          ext_order_id: "external-order-1",
          timestamp: "2",
        },
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
      data: { phase: string };
      success: boolean;
    };

    expect(detailResponse.ok).toBe(true);
    expect(detailBody.success).toBe(true);
    expect(detailBody.data.phase).toBe("CREATED");

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
          timestamp: "3-after-advance",
        },
        signKey: server.fixture.signKey,
      }).toString()}`,
    );
    const detailAfterAdvanceBody = (await detailAfterAdvanceResponse.json()) as {
      code: number;
      data: { phase: string };
      success: boolean;
    };

    expect(detailAfterAdvanceResponse.ok).toBe(true);
    expect(detailAfterAdvanceBody.success).toBe(true);
    expect(detailAfterAdvanceBody.data.phase).toBe("ACCEPTED");

    const driverLocationResponse = await fetch(
      `${server.origin}/common/queryDriverLocationByOrderId?${signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          order_id: createBody.data.orderNo,
          timestamp: "3-driver-location",
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

    const driverPolylineResponse = await fetch(`${server.origin}/common/queryDriverPolylineV2`, {
      body: signedSearchParams({
        clientId: server.fixture.clientId,
        params: {
          order_id: createBody.data.orderNo,
          timestamp: "3-driver-polyline",
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
        driverEtaInfoVO: { lat: number; lng: number };
        navigationPolylineType: number;
        steps: Array<{ links: Array<{ coords: string }> }>;
      };
      success: boolean;
    };

    expect(driverPolylineResponse.ok).toBe(true);
    expect(driverPolylineBody.success).toBe(true);
    expect(driverPolylineBody.data.navigationPolylineType).toBe(1);
    expect(driverPolylineBody.data.steps[0]?.links[0]?.coords).toContain(";");

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

  test("supports admin estimate controls", async () => {
    server = await startFakeCaocaoServer();

    const updateResponse = await fetch(`${server.origin}/__fake_caocao/estimates`, {
      body: JSON.stringify({
        carType: "EXPRESS",
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
        params: {
          car_type: "EXPRESS",
          timestamp: "estimate-after-admin-update",
        },
        signKey: server.fixture.signKey,
      }).toString()}`,
    );
    const estimateBody = (await estimateResponse.json()) as {
      data: { estimateAmountFen: number };
      success: boolean;
    };

    expect(estimateBody.success).toBe(true);
    expect(estimateBody.data.estimateAmountFen).toBe(4100);
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
        params: {
          car_type: "EXPRESS",
          ext_order_id: "external-order-2",
          timestamp: "4",
        },
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
});
