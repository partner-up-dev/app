import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { createOffer, createProductSpu, type PricingRule } from "../../src/domains/merchandising";
import { applyPaymentSettlementConsequence } from "../../src/domains/payment";
import {
  buildCaocaoCallbackInfo,
  createCaocaoSignature,
  encodeCaocaoExternalOrderId,
} from "../../src/domains/ride-hailing";
import type { RideHailingExecutionPhase } from "../../src/domains/trade/model";
import type { PaymentProviderInstanceId } from "../../src/entities/payment";
import type { TradeOrderId } from "../../src/entities/trade-order";
import { BillLineRepository } from "../../src/repositories/BillLineRepository";
import { BillRepository } from "../../src/repositories/BillRepository";
import { PaymentProviderInstanceRepository } from "../../src/repositories/PaymentProviderInstanceRepository";
import { RideHailingOrderRepository } from "../../src/repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../src/repositories/RideHailingProviderInstanceRepository";
import { TradeOrderRepository } from "../../src/repositories/TradeOrderRepository";
import { requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import { givenUser } from "../pr-core/_kit/builders/users";

const providerRepo = new RideHailingProviderInstanceRepository();
const paymentProviderRepo = new PaymentProviderInstanceRepository();
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

const createScenarioCaocaoProvider = async (input: {
  endpointBaseUrl: string;
  displayName: string;
  instanceKey: string;
  caocaoClientId: string;
  signKey: string;
}) =>
  providerRepo.create({
    providerType: "CAOCAO",
    instanceKey: input.instanceKey,
    status: "ACTIVE",
    displayName: input.displayName,
    config: {
      adapterMode: "CAOCAO_OPEN_API",
      caocaoClientId: input.caocaoClientId,
      signKey: input.signKey,
      endpointBaseUrl: input.endpointBaseUrl,
      callbackBaseUrl: "https://api.partner-up.test",
    },
    createdAt: new Date("2032-01-01T00:00:00.000Z"),
    updatedAt: new Date("2032-01-01T00:00:00.000Z"),
  });

const seedCallbackScenarioRideOrder = async (input: {
  creatorUserId: string;
  pricingRules?: PricingRule[];
  providerId: string;
  providerOrderId: string;
  quoteAmountFen?: number;
  rideExecutionPhase: RideHailingExecutionPhase;
  tradeStatus: "INITIATING" | "OPEN";
  skuName: string;
  spuName: string;
}) => {
  const quoteAmountFen = input.quoteAmountFen ?? 3600;
  const spu = await createProductSpu({
    name: input.spuName,
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
    pricingRules: input.pricingRules ?? [],
    termsVersion: 1,
  });
  const itemId = randomUUID();
  const skuSnapshot = {
    id: Number(`93${Math.floor(Math.random() * 1000000)}`),
    version: 1,
    name: input.skuName,
    presentationSnapshot: {
      heroImageAssetIds: [],
      detailImageAssetIds: [],
      sellingPoints: [],
      parameterGroups: [],
      noticeBlocks: [],
    },
    factsSnapshot: {
      rideHailingProviderInstanceId: input.providerId,
      providerVehicleTypeCode: "3",
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
  const quoteSnapshot = {
    amountFen: quoteAmountFen,
    currency: "CNY" as const,
    displayName: input.skuName,
    estimateAmountFen: quoteAmountFen,
    quotedAt: "2031-01-01T00:00:00.000Z",
    explanations: [],
  };
  const order = await tradeOrderRepo.create({
    family: "RIDE_HAILING",
    offerId: offer.id,
    createdBy: input.creatorUserId,
    status: input.tradeStatus,
    participants: [
      {
        participantId: input.creatorUserId,
        userId: input.creatorUserId,
        role: "CREATOR",
        joinedVia: "API",
      },
    ],
    splitRuleSnapshot: {
      type: "RELATIVE",
      shares: [{ userId: input.creatorUserId, percentBps: 10000 }],
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
            quoteSnapshot,
          },
        ],
        resolution: null,
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
        userId: input.creatorUserId,
        displayName: "乘客",
        phoneMasked: "138****8000",
      },
    ],
    contactPhone: "13800138000",
    dispatchBinding: {
      providerInstanceId: input.providerId,
      providerType: "CAOCAO",
      providerOrderId: input.providerOrderId,
      externalOrderId: encodeCaocaoExternalOrderId(order.id),
      submittedAt: "2031-01-01T00:00:00.000Z",
      submissionMode: "SINGLE_CANDIDATE",
      submittedCandidates: [
        {
          skuId: skuSnapshot.id,
          spuId: spu.id,
          displayName: input.skuName,
          providerVehicleTypeCode: "3",
          providerVehicleTypeName: input.skuName,
          quoteSnapshot,
        },
      ],
      providerSnapshot: null,
    },
    executionPhase: input.rideExecutionPhase,
  });
  return {
    offer,
    order,
    providerOrderId: input.providerOrderId,
    spu,
  };
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
            basicOrderVO: {
              requireLevel: 3,
              status: "5",
            },
            driverInfoVo: {
              avatar: "https://example.test/driver-li.png",
              carBrand: "曹操快车",
              card: "浙B99999",
              carType: "曹操快车",
              color: "蓝色",
              name: "李师傅",
              phone: "13900139000",
              phone_passenger: "13900139001",
              serviceType: "3",
            },
            orderFeeVo: {
              totalFee: 5000,
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
        providerVehicleTypeCode: "3",
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
          resolution: null,
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
      dispatchBinding: {
        providerInstanceId: provider.id,
        providerType: "CAOCAO",
        providerOrderId: "CC-FINAL-123",
        externalOrderId: encodeCaocaoExternalOrderId(order.id),
        submittedAt: "2031-01-01T00:00:00.000Z",
        submissionMode: "SINGLE_CANDIDATE",
        submittedCandidates: [
          {
            skuId: skuSnapshot.id,
            spuId: spu.id,
            displayName: "Scenario Caocao Express",
            providerVehicleTypeCode: "3",
            providerVehicleTypeName: "Scenario Caocao Express",
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
        providerSnapshot: null,
      },
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
    assert.equal(detailQueryCount, 2);
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
    assert.equal(
      updatedRide?.driverSnapshot?.driverAvatarUrl,
      "https://example.test/driver-li.png",
    );
    assert.equal(updatedRide?.driverSnapshot?.driverName, "李师傅");
    assert.equal(updatedRide?.driverSnapshot?.driverPhone, "13900139000");
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

scenario(
  "Caocao callback creates final bill for cancelled ride when queryOrderDetailV2 exposes non-zero totalFee",
  async () => {
    const creator = await givenUser("caocao-callback-cancelled-order-owner");
    let detailQueryCount = 0;
    let confirmFeeCount = 0;
    const fakeCaocao = createServer((request, response) => {
      if (request.url?.startsWith("/v2/common/queryOrderDetailV2")) {
        detailQueryCount += 1;
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            code: 200,
            data: {
              basicOrderVO: {
                requireLevel: 3,
                status: "20",
              },
              driverInfoVo: {
                avatar: "https://example.test/driver-wang.png",
                carBrand: "曹操快车",
                card: "浙C88888",
                carType: "曹操快车",
                color: "白色",
                name: "王师傅",
                phone: "13700137000",
                phone_passenger: "13700137000",
                serviceType: "3",
              },
              orderFeeVo: {
                totalFee: 1270,
              },
            },
            success: true,
          }),
        );
        return;
      }
      if (request.url?.startsWith("/v2/common/feeConfirm")) {
        confirmFeeCount += 1;
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            code: 200,
            data: {},
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
      const provider = await createScenarioCaocaoProvider({
        endpointBaseUrl,
        displayName: "Scenario Caocao Cancelled Callback",
        instanceKey: `scenario-caocao-cancelled-callback-${randomUUID()}`,
        caocaoClientId: "scenario-caocao-cancelled-callback-client",
        signKey: "scenario-caocao-cancelled-callback-secret",
      });
      const orderSeed = await seedCallbackScenarioRideOrder({
        creatorUserId: creator.user.id,
        pricingRules: [
          {
            id: 1,
            label: "五折结算",
            description: "取消单仍按 final settlement 进入同一 bill 模型",
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
        providerId: provider.id,
        providerOrderId: "CC-CANCELLED-123",
        rideExecutionPhase: "DISPATCHING",
        tradeStatus: "OPEN",
        skuName: "Scenario Caocao Cancelled Express",
        spuName: "Scenario Caocao Cancelled Callback SPU",
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
            signKey: "scenario-caocao-cancelled-callback-secret",
            orderId: orderSeed.order.id,
            providerOrderId: "CC-CANCELLED-123",
            event: "20",
          }).toString(),
        },
      );

      assert.equal(response.status, 200);
      assert.equal(detailQueryCount, 2);
      const updatedOrder = await tradeOrderRepo.findById(orderSeed.order.id);
      assert.ok(updatedOrder);
      assert.equal(updatedOrder.status, "CANCELLED");
      assert.ok(updatedOrder.closedAt);
      assert.equal(updatedOrder.terminationAttempts.length, 1);
      assert.equal(
        updatedOrder.terminationAttempts[0]?.requestedBy,
        "system:ride-hailing-provider",
      );
      assert.equal(updatedOrder.terminationAttempts[0]?.status, "APPROVED");
      assert.equal(updatedOrder.terminationAttempts[0]?.resolutionPath, "RIDE_HAILING_FULFILLMENT");
      const updatedRide = await rideOrderRepo.findByOrderId(orderSeed.order.id as TradeOrderId);
      assert.equal(updatedRide?.executionPhase, "CANCELLED");
      assert.equal(updatedRide?.finalSettlementInput?.amountFen, 1270);
      assert.equal(updatedRide?.finalSettlementInput?.providerOrderId, "CC-CANCELLED-123");
      assert.equal(
        updatedRide?.driverSnapshot?.driverAvatarUrl,
        "https://example.test/driver-wang.png",
      );
      assert.equal(updatedRide?.driverSnapshot?.driverName, "王师傅");
      assert.equal(updatedRide?.vehicleSnapshot?.plate, "浙C88888");
      const bill = await billRepo.findBySourceOrderId(orderSeed.order.id);
      assert.ok(bill);
      const lines = await billLineRepo.listByBillId(bill.id);
      assert.equal(lines.length, 1);
      assert.equal(lines[0]?.amountFen, 635);
      const chargeLine = lines[0];
      assert.ok(chargeLine);
      const paymentProvider = await paymentProviderRepo.create({
        providerType: "WECHAT_PAY",
        instanceKey: `scenario-cancelled-ride-final-bill-${randomUUID()}`,
        status: "ACTIVE",
        displayName: "Scenario cancelled ride final bill payment provider",
        clientId: `scenario-cancelled-ride-final-bill-${randomUUID()}`,
        config: {
          adapterMode: "WECHAT_PAY_API_V3",
          appId: "wx-cancelled-ride-final-bill",
          mchId: "mch-cancelled-ride-final-bill",
          chargeMode: "H5",
          endpointBaseUrl: null,
          apiV3Key: "0123456789abcdef0123456789abcdef",
          merchantCertificate: {
            serialNo: "cancelled-ride-final-bill-serial",
            privateKeyPem: "unused-in-this-scenario",
            certificatePem: null,
          },
        },
      });
      const paymentProviderInstanceId = paymentProvider.id as PaymentProviderInstanceId;
      const settledLine = await billLineRepo.markSettledFromProvider({
        id: chargeLine.id,
        paymentProviderInstanceId,
        attemptCount: chargeLine.attemptCount,
        settledAt: new Date(),
      });
      assert.ok(settledLine);

      const settlementConsequence = await applyPaymentSettlementConsequence({
        billLineId: chargeLine.id,
      });

      assert.deepEqual(settlementConsequence, {
        applied: true,
        reason: "RideHailing provider fee confirmed",
        orderId: orderSeed.order.id,
      });
      assert.equal(confirmFeeCount, 1);
    } finally {
      await closeServer(fakeCaocao);
    }
  },
);

scenario(
  "Caocao callback keeps terminal sync when queryOrderDetailV2 has no authoritative totalFee yet",
  async () => {
    const creator = await givenUser("caocao-callback-bill-miss-owner");
    let detailQueryCount = 0;
    const fakeCaocao = createServer((request, response) => {
      if (request.url?.startsWith("/v2/common/queryOrderDetailV2")) {
        detailQueryCount += 1;
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            code: 200,
            data: {
              basicOrderVO: {
                requireLevel: 3,
                status: "20",
              },
              driverInfoVo: {
                avatar: "https://example.test/driver-zhao.png",
                carBrand: "曹操快车",
                card: "浙D66666",
                carType: "曹操快车",
                color: "黑色",
                name: "赵师傅",
                phone: "13600136000",
                phone_passenger: "13600136000",
                serviceType: "3",
              },
              orderFeeVo: {
                totalFee: null,
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
      const provider = await createScenarioCaocaoProvider({
        endpointBaseUrl,
        displayName: "Scenario Caocao Bill Miss",
        instanceKey: `scenario-caocao-bill-miss-${randomUUID()}`,
        caocaoClientId: "scenario-caocao-bill-miss-client",
        signKey: "scenario-caocao-bill-miss-secret",
      });
      const orderSeed = await seedCallbackScenarioRideOrder({
        creatorUserId: creator.user.id,
        providerId: provider.id,
        providerOrderId: "CC-BILL-MISS-123",
        rideExecutionPhase: "DISPATCHING",
        tradeStatus: "OPEN",
        skuName: "Scenario Caocao Bill Miss Express",
        spuName: "Scenario Caocao Bill Miss SPU",
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
            signKey: "scenario-caocao-bill-miss-secret",
            orderId: orderSeed.order.id,
            providerOrderId: "CC-BILL-MISS-123",
            event: "20",
          }).toString(),
        },
      );

      assert.equal(response.status, 200);
      assert.equal(detailQueryCount, 2);
      const updatedOrder = await tradeOrderRepo.findById(orderSeed.order.id);
      assert.ok(updatedOrder);
      assert.equal(updatedOrder.status, "CANCELLED");
      assert.ok(updatedOrder.closedAt);
      const updatedRide = await rideOrderRepo.findByOrderId(orderSeed.order.id as TradeOrderId);
      assert.equal(updatedRide?.executionPhase, "CANCELLED");
      assert.equal(updatedRide?.finalSettlementInput, null);
      assert.equal(
        updatedRide?.driverSnapshot?.driverAvatarUrl,
        "https://example.test/driver-zhao.png",
      );
      assert.equal(updatedRide?.driverSnapshot?.driverName, "赵师傅");
      assert.equal(updatedRide?.vehicleSnapshot?.plate, "浙D66666");
      assert.equal(await billRepo.findBySourceOrderId(orderSeed.order.id), null);
    } finally {
      await closeServer(fakeCaocao);
    }
  },
);

scenario(
  "Caocao callback does not block terminal sync when final settlement detail reread fails",
  async () => {
    const creator = await givenUser("caocao-callback-bill-failure-owner");
    let detailQueryCount = 0;
    const fakeCaocao = createServer((request, response) => {
      if (request.url?.startsWith("/v2/common/queryOrderDetailV2")) {
        detailQueryCount += 1;
        if (detailQueryCount > 1) {
          response.writeHead(500, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ code: 500, success: false }));
          return;
        }
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            code: 200,
            data: {
              basicOrderVO: {
                requireLevel: 3,
                status: "5",
              },
              driverInfoVo: {
                avatar: "https://example.test/driver-zhou.png",
                carBrand: "曹操快车",
                card: "浙E55555",
                carType: "曹操快车",
                color: "银色",
                name: "周师傅",
                phone: "13500135000",
                phone_passenger: "13500135000",
                serviceType: "3",
              },
              orderFeeVo: {
                totalFee: null,
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
      const provider = await createScenarioCaocaoProvider({
        endpointBaseUrl,
        displayName: "Scenario Caocao Bill Failure",
        instanceKey: `scenario-caocao-bill-failure-${randomUUID()}`,
        caocaoClientId: "scenario-caocao-bill-failure-client",
        signKey: "scenario-caocao-bill-failure-secret",
      });
      const orderSeed = await seedCallbackScenarioRideOrder({
        creatorUserId: creator.user.id,
        providerId: provider.id,
        providerOrderId: "CC-BILL-FAILURE-123",
        rideExecutionPhase: "IN_TRIP",
        tradeStatus: "OPEN",
        skuName: "Scenario Caocao Bill Failure Express",
        spuName: "Scenario Caocao Bill Failure SPU",
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
            signKey: "scenario-caocao-bill-failure-secret",
            orderId: orderSeed.order.id,
            providerOrderId: "CC-BILL-FAILURE-123",
            event: "6",
          }).toString(),
        },
      );

      assert.equal(response.status, 200);
      assert.equal(detailQueryCount, 2);
      const updatedRide = await rideOrderRepo.findByOrderId(orderSeed.order.id as TradeOrderId);
      assert.equal(updatedRide?.executionPhase, "FINISHED");
      assert.equal(updatedRide?.finalSettlementInput, null);
      assert.equal(
        updatedRide?.driverSnapshot?.driverAvatarUrl,
        "https://example.test/driver-zhou.png",
      );
      assert.equal(updatedRide?.driverSnapshot?.driverName, "周师傅");
      assert.equal(updatedRide?.vehicleSnapshot?.plate, "浙E55555");
      assert.equal(await billRepo.findBySourceOrderId(orderSeed.order.id), null);
    } finally {
      await closeServer(fakeCaocao);
    }
  },
);

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
        providerVehicleTypeCode: "3",
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
          resolution: null,
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
      dispatchBinding: {
        providerInstanceId: provider.id,
        providerType: "CAOCAO",
        providerOrderId: "CC-QUERY-FAILURE-123",
        externalOrderId: encodeCaocaoExternalOrderId(order.id),
        submittedAt: "2031-01-01T00:00:00.000Z",
        submissionMode: "SINGLE_CANDIDATE",
        submittedCandidates: [
          {
            skuId: skuSnapshot.id,
            spuId: spu.id,
            displayName: "Scenario Caocao Query Failure Express",
            providerVehicleTypeCode: "3",
            providerVehicleTypeName: "Scenario Caocao Query Failure Express",
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
        providerSnapshot: null,
      },
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
