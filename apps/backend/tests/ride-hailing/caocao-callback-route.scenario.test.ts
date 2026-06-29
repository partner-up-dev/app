import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { scenario } from "../_infra/scenario/scenario";
import { requestJson } from "../_infra/http/backend-app";
import { givenUser } from "../pr-core/_kit/builders/users";
import { createOffer, createProductSpu } from "../../src/domains/merchandising";
import { RideHailingProviderInstanceRepository } from "../../src/repositories/RideHailingProviderInstanceRepository";
import { RideHailingOrderRepository } from "../../src/repositories/RideHailingOrderRepository";
import { TradeOrderRepository } from "../../src/repositories/TradeOrderRepository";
import { BillLineRepository } from "../../src/repositories/BillLineRepository";
import { BillRepository } from "../../src/repositories/BillRepository";
import {
  buildCaocaoCallbackInfo,
  createCaocaoSignature,
  encodeCaocaoExternalOrderId,
} from "../../src/domains/ride-hailing";
import type { TradeOrderId } from "../../src/entities/trade-order";

const providerRepo = new RideHailingProviderInstanceRepository();
const rideOrderRepo = new RideHailingOrderRepository();
const tradeOrderRepo = new TradeOrderRepository();
const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();

const listen = (server: Server): Promise<string> =>
  new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert.equal(typeof address, "object");
      assert.notEqual(address, null);
      resolve(`http://127.0.0.1:${address.port}/v2`);
    });
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

const buildCallbackForm = (input: {
  signKey: string;
  orderId?: string;
  providerOrderId?: string;
  event?: string;
  finalAmountFen?: string;
  callbackInfo?: string;
}): URLSearchParams => {
  const unsigned = {
    timestamp: "1700000000000",
    ...(input.callbackInfo ? { callback_info: input.callbackInfo } : {}),
    order_id: input.providerOrderId ?? "CC123456",
    ext_order_id: encodeCaocaoExternalOrderId(
      input.orderId ?? "123e4567-e89b-12d3-a456-426614174000",
    ),
    event: input.event ?? "20",
    ...(input.finalAmountFen ? { final_amount_fen: input.finalAmountFen } : {}),
    driver_name: "张师傅",
    driver_phone: "13800138001",
    car_no: "浙A12345",
    vehicle_brand: "曹操专车",
    vehicle_color: "白色",
  };
  return new URLSearchParams({
    ...unsigned,
    sign: createCaocaoSignature({
      params: unsigned,
      signKey: input.signKey,
    }),
  });
};

scenario("legacy Caocao callback alias resolves provider and requires local order", async () => {
  await providerRepo.create({
    providerType: "CAOCAO",
    instanceKey: "scenario-caocao-first",
    status: "ACTIVE",
    displayName: "Scenario Caocao First",
    config: {
      adapterMode: "CAOCAO_OPEN_API",
      caocaoClientId: "scenario-caocao-client-first",
      signKey: "scenario-caocao-secret-first",
      endpointBaseUrl: "https://openapi.caocaokeji.cn/v2",
      callbackBaseUrl: "https://api.partner-up.test",
    },
    createdAt: new Date("2020-01-01T00:00:00.000Z"),
    updatedAt: new Date("2020-01-01T00:00:00.000Z"),
  });
  const secondProvider = await providerRepo.create({
    providerType: "CAOCAO",
    instanceKey: "scenario-caocao-second",
    status: "ACTIVE",
    displayName: "Scenario Caocao Second",
    config: {
      adapterMode: "CAOCAO_OPEN_API",
      caocaoClientId: "scenario-caocao-client-second",
      signKey: "scenario-caocao-secret-second",
      endpointBaseUrl: "https://openapi.caocaokeji.cn/v2",
      callbackBaseUrl: "https://api.partner-up.test",
    },
    createdAt: new Date("2020-01-01T00:01:00.000Z"),
    updatedAt: new Date("2020-01-01T00:01:00.000Z"),
  });

  const validResponse = await requestJson("/api/v1/service_provider/caocao/callback/order", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: buildCallbackForm({
      signKey: "scenario-caocao-secret-first",
    }).toString(),
  });

  assert.equal(validResponse.status, 404);

  const wrongInstanceResponse = await requestJson(
    "/api/v1/service_provider/caocao/callback/order",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: buildCallbackForm({
        signKey: "scenario-caocao-secret-second",
        providerOrderId: "CC654321",
      }).toString(),
    },
  );

  assert.equal(wrongInstanceResponse.status, 400);

  const secondViaCallbackInfoResponse = await requestJson(
    "/api/v1/service_provider/caocao/callback/order",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: buildCallbackForm({
        callbackInfo: buildCaocaoCallbackInfo({
          providerInstance: secondProvider,
          routingToken: "stg",
        }),
        signKey: "scenario-caocao-secret-second",
        providerOrderId: "CC654321",
      }).toString(),
    },
  );

  assert.equal(secondViaCallbackInfoResponse.status, 404);
});

scenario("Caocao callback updates ride execution and creates final bill", async () => {
  const creator = await givenUser("caocao-callback-order-owner");
  let detailQueryCount = 0;
  const fakeCaocao = createServer((request, response) => {
    if (request.url?.startsWith("/v2/common/queryOrderDetailV2")) {
      detailQueryCount += 1;
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          code: 200,
          data: {
            phase: "FINISHED",
            finalAmountFen: 5000,
            driver: {
              driverName: "李师傅",
              driverPhone: "13900139000",
            },
            vehicle: {
              brand: "曹操快车",
              color: "蓝色",
              plate: "浙B99999",
            },
          },
          success: true,
        }),
      );
      return;
    }
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ code: 404, success: false }));
  });
  const endpointBaseUrl = await listen(fakeCaocao);

  try {
    const provider = await providerRepo.create({
      providerType: "CAOCAO",
      instanceKey: `scenario-caocao-callback-${randomUUID()}`,
      status: "ACTIVE",
      displayName: "Scenario Caocao Callback",
      config: {
        adapterMode: "CAOCAO_OPEN_API",
        caocaoClientId: "scenario-caocao-callback-client",
        signKey: "scenario-caocao-callback-secret",
        endpointBaseUrl,
        callbackBaseUrl: "https://api.partner-up.test",
      },
      createdAt: new Date("2032-01-01T00:00:00.000Z"),
      updatedAt: new Date("2032-01-01T00:00:00.000Z"),
    });
    const spu = await createProductSpu({
      name: "Scenario Caocao Callback SPU",
      productType: "RIDE_HAILING",
      status: "ACTIVE",
      salesPolicy: {
        skuSelectionPolicy: {
          type: "CHOICE_SET",
          min: 1,
          max: null,
          resolvesTo: 1,
        },
        quantityPolicy: {
          type: "FIXED",
          quantity: 1,
        },
      },
      servicePolicy: {
        type: "RIDE_HAILING",
      },
      presentation: {
        heroImageAssetIds: [],
        detailImageAssetIds: [],
        sellingPoints: [],
        parameterGroups: [],
        noticeBlocks: [],
      },
    });
    const offer = await createOffer({
      productType: "RIDE_HAILING",
      spuIds: [spu.id],
      status: "ACTIVE",
      pricingRules: [
        {
          id: 1,
          label: "五折结算",
          description: "测试锁定 Offer policy",
          conditionRule: true,
          action: {
            type: "RATIO",
            payload: {
              ratioBps: 5000,
            },
          },
          target: {
            level: "ORDER",
          },
          continue: true,
        },
      ],
      termsVersion: 1,
    });
    const itemId = randomUUID();
    const skuSnapshot = {
      id: 930001,
      version: 1,
      name: "Scenario Caocao Express",
      presentationSnapshot: {
        heroImageAssetIds: [],
        detailImageAssetIds: [],
        sellingPoints: [],
        parameterGroups: [],
        noticeBlocks: [],
      },
      factsSnapshot: {
        rideHailingProviderInstanceId: provider.id,
        providerVehicleTypeCode: "EXPRESS",
      },
      pricingModelSnapshot: {
        type: "DYNAMIC_QUOTE" as const,
        calculatorSpec: {
          version: 1 as const,
          currency: "CNY" as const,
          components: [],
        },
      },
      cancellationPolicySnapshot: null,
    };
    const order = await tradeOrderRepo.create({
      family: "RIDE_HAILING",
      offerId: offer.id,
      createdBy: creator.user.id,
      status: "INITIATING",
      participants: [
        {
          participantId: creator.user.id,
          userId: creator.user.id,
          role: "CREATOR",
          joinedVia: "API",
        },
      ],
      splitRuleSnapshot: {
        type: "RELATIVE",
        shares: [{ userId: creator.user.id, percentBps: 10000 }],
      },
      pricingExecutionSnapshot: {
        version: 1,
        offer: {
          id: offer.id,
          productType: "RIDE_HAILING",
          termsVersion: offer.termsVersion,
          pricingPolicySnapshot: offer.pricingPolicy,
        },
        items: [
          {
            itemId,
            quantity: 1,
            spu: {
              id: spu.id,
              version: spu.version,
              productType: spu.productType,
              factsSnapshot: spu.facts,
              salesPolicySnapshot: spu.salesPolicy,
            },
            sku: {
              id: skuSnapshot.id,
              version: skuSnapshot.version,
              name: skuSnapshot.name,
              factsSnapshot: skuSnapshot.factsSnapshot,
              pricingModelSnapshot: skuSnapshot.pricingModelSnapshot,
            },
          },
        ],
        orderContext: {
          serviceTime: null,
        },
      },
      items: [
        {
          kind: "CHOICE_SET",
          itemId,
          productType: "RIDE_HAILING",
          candidates: [
            {
              sku: skuSnapshot,
              quoteSnapshot: {
                amountFen: 3600,
                currency: "CNY",
                displayName: "Scenario Caocao Express",
                estimateAmountFen: 3600,
                quotedAt: "2031-01-01T00:00:00.000Z",
                explanations: [],
              },
            },
          ],
          resolution: {
            sku: skuSnapshot,
            providerVehicleTypeCode: "EXPRESS",
            providerVehicleTypeName: "Scenario Caocao Express",
            quoteSnapshot: {
              amountFen: 3600,
              currency: "CNY",
              displayName: "Scenario Caocao Express",
              estimateAmountFen: 3600,
              quotedAt: "2031-01-01T00:00:00.000Z",
              explanations: [],
            },
            providerBinding: {
              providerInstanceId: provider.id,
              providerType: "CAOCAO",
              providerOrderId: "CC-FINAL-123",
            },
            source: "DISPATCH_POLICY",
            candidateRelation: "IN_CANDIDATES",
            reason: null,
            resolvedAt: "2031-01-01T00:00:00.000Z",
          },
          quantity: 1,
        },
      ],
      timeout: {
        unpaidExpiresAt: "2031-01-01T00:15:00.000Z",
        defaultWindowMinutes: 15,
      },
      terminationAttempts: [],
    });
    await rideOrderRepo.create({
      orderId: order.id,
      routeSnapshot: {
        origin: {
          name: "起点",
          latitude: 30.26,
          longitude: 120.15,
        },
        waypoints: [],
        destination: {
          name: "终点",
          latitude: 30.28,
          longitude: 120.17,
        },
        drivingPlan: null,
      },
      departureAt: null,
      riders: [
        {
          userId: creator.user.id,
          displayName: "乘客",
          phoneMasked: "138****8000",
        },
      ],
      contactPhone: "13800138000",
      executionPhase: "INITIATING",
    });

    const response = await requestJson(
      `/api/ride-hailing/caocao/${provider.id}/callback/order-status`,
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: buildCallbackForm({
          callbackInfo: buildCaocaoCallbackInfo({
            providerInstance: provider,
            routingToken: "stg",
          }),
          signKey: "scenario-caocao-callback-secret",
          orderId: order.id,
          providerOrderId: "CC-FINAL-123",
          event: "6",
          finalAmountFen: "4321",
        }).toString(),
      },
    );

    assert.equal(response.status, 200);
    assert.equal(detailQueryCount, 1);
    const responseBody = (await response.json()) as {
      code: number;
      success: boolean;
    };
    assert.deepEqual(responseBody, {
      code: 200,
      success: true,
    });
    const updatedOrder = await tradeOrderRepo.findById(order.id);
    assert.equal(updatedOrder?.status, "OPEN");
    const updatedRide = await rideOrderRepo.findByOrderId(order.id as TradeOrderId);
    assert.equal(updatedRide?.executionPhase, "FINISHED");
    assert.equal(updatedRide?.finalSettlementInput?.amountFen, 5000);
    assert.equal(updatedRide?.finalSettlementInput?.providerOrderId, "CC-FINAL-123");
    assert.equal(updatedRide?.driverSnapshot?.driverName, "李师傅");
    assert.equal(updatedRide?.vehicleSnapshot?.plate, "浙B99999");
    const bill = await billRepo.findBySourceOrderId(order.id);
    assert.ok(bill);
    const lines = await billLineRepo.listByBillId(bill.id);
    assert.equal(lines.length, 1);
    assert.equal(lines[0]?.amountFen, 2500);
  } finally {
    await closeServer(fakeCaocao);
  }
});

scenario("Caocao callback returns retryable failure when provider detail query fails", async () => {
  const creator = await givenUser("caocao-callback-query-failure-owner");
  const fakeCaocao = createServer((request, response) => {
    if (request.url?.startsWith("/v2/common/queryOrderDetailV2")) {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ code: 500, success: false }));
      return;
    }
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ code: 404, success: false }));
  });
  const endpointBaseUrl = await listen(fakeCaocao);

  try {
    const provider = await providerRepo.create({
      providerType: "CAOCAO",
      instanceKey: `scenario-caocao-callback-query-failure-${randomUUID()}`,
      status: "ACTIVE",
      displayName: "Scenario Caocao Callback Query Failure",
      config: {
        adapterMode: "CAOCAO_OPEN_API",
        caocaoClientId: "scenario-caocao-callback-query-failure-client",
        signKey: "scenario-caocao-callback-query-failure-secret",
        endpointBaseUrl,
        callbackBaseUrl: "https://api.partner-up.test",
      },
      createdAt: new Date("2032-01-01T00:00:00.000Z"),
      updatedAt: new Date("2032-01-01T00:00:00.000Z"),
    });
    const spu = await createProductSpu({
      name: "Scenario Caocao Query Failure SPU",
      productType: "RIDE_HAILING",
      status: "ACTIVE",
      salesPolicy: {
        skuSelectionPolicy: {
          type: "CHOICE_SET",
          min: 1,
          max: null,
          resolvesTo: 1,
        },
        quantityPolicy: {
          type: "FIXED",
          quantity: 1,
        },
      },
      servicePolicy: {
        type: "RIDE_HAILING",
      },
      presentation: {
        heroImageAssetIds: [],
        detailImageAssetIds: [],
        sellingPoints: [],
        parameterGroups: [],
        noticeBlocks: [],
      },
    });
    const offer = await createOffer({
      productType: "RIDE_HAILING",
      spuIds: [spu.id],
      status: "ACTIVE",
      pricingRules: [],
      termsVersion: 1,
    });
    const itemId = randomUUID();
    const skuSnapshot = {
      id: 930002,
      version: 1,
      name: "Scenario Caocao Query Failure Express",
      presentationSnapshot: {
        heroImageAssetIds: [],
        detailImageAssetIds: [],
        sellingPoints: [],
        parameterGroups: [],
        noticeBlocks: [],
      },
      factsSnapshot: {
        rideHailingProviderInstanceId: provider.id,
        providerVehicleTypeCode: "EXPRESS",
      },
      pricingModelSnapshot: {
        type: "DYNAMIC_QUOTE" as const,
        calculatorSpec: {
          version: 1 as const,
          currency: "CNY" as const,
          components: [],
        },
      },
      cancellationPolicySnapshot: null,
    };
    const order = await tradeOrderRepo.create({
      family: "RIDE_HAILING",
      offerId: offer.id,
      createdBy: creator.user.id,
      status: "OPEN",
      participants: [
        {
          participantId: creator.user.id,
          userId: creator.user.id,
          role: "CREATOR",
          joinedVia: "API",
        },
      ],
      splitRuleSnapshot: {
        type: "RELATIVE",
        shares: [{ userId: creator.user.id, percentBps: 10000 }],
      },
      items: [
        {
          kind: "CHOICE_SET",
          itemId,
          productType: "RIDE_HAILING",
          candidates: [
            {
              sku: skuSnapshot,
              quoteSnapshot: {
                amountFen: 3600,
                currency: "CNY",
                displayName: "Scenario Caocao Query Failure Express",
                estimateAmountFen: 3600,
                quotedAt: "2031-01-01T00:00:00.000Z",
                explanations: [],
              },
            },
          ],
          resolution: {
            sku: skuSnapshot,
            providerVehicleTypeCode: "EXPRESS",
            providerVehicleTypeName: "Scenario Caocao Query Failure Express",
            quoteSnapshot: {
              amountFen: 3600,
              currency: "CNY",
              displayName: "Scenario Caocao Query Failure Express",
              estimateAmountFen: 3600,
              quotedAt: "2031-01-01T00:00:00.000Z",
              explanations: [],
            },
            providerBinding: {
              providerInstanceId: provider.id,
              providerType: "CAOCAO",
              providerOrderId: "CC-QUERY-FAILURE-123",
            },
            source: "DISPATCH_POLICY",
            candidateRelation: "IN_CANDIDATES",
            reason: null,
            resolvedAt: "2031-01-01T00:00:00.000Z",
          },
          quantity: 1,
        },
      ],
      timeout: {
        unpaidExpiresAt: "2031-01-01T00:15:00.000Z",
        defaultWindowMinutes: 15,
      },
      terminationAttempts: [],
    });
    await rideOrderRepo.create({
      orderId: order.id,
      routeSnapshot: {
        origin: {
          name: "起点",
          latitude: 30.26,
          longitude: 120.15,
        },
        waypoints: [],
        destination: {
          name: "终点",
          latitude: 30.28,
          longitude: 120.17,
        },
        drivingPlan: null,
      },
      departureAt: null,
      riders: [
        {
          userId: creator.user.id,
          displayName: "乘客",
          phoneMasked: "138****8000",
        },
      ],
      contactPhone: "13800138000",
      executionPhase: "DISPATCHING",
    });

    const response = await requestJson(
      `/api/ride-hailing/caocao/${provider.id}/callback/order-status`,
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: buildCallbackForm({
          callbackInfo: buildCaocaoCallbackInfo({
            providerInstance: provider,
            routingToken: "stg",
          }),
          signKey: "scenario-caocao-callback-query-failure-secret",
          orderId: order.id,
          providerOrderId: "CC-QUERY-FAILURE-123",
          event: "6",
          finalAmountFen: "4321",
        }).toString(),
      },
    );

    assert.equal(response.status, 503);
    const updatedRide = await rideOrderRepo.findByOrderId(order.id as TradeOrderId);
    assert.equal(updatedRide?.executionPhase, "DISPATCHING");
    assert.equal(updatedRide?.finalSettlementInput, null);
    assert.equal(updatedRide?.driverSnapshot, null);
    assert.equal(updatedRide?.vehicleSnapshot, null);
    assert.equal(await billRepo.findBySourceOrderId(order.id), null);
  } finally {
    await closeServer(fakeCaocao);
  }
});
