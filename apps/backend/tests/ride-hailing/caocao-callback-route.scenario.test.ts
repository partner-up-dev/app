import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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
  createCaocaoSignature,
  encodeCaocaoExternalOrderId,
} from "../../src/domains/ride-hailing";
import type { TradeOrderId } from "../../src/entities/trade-order";

const providerRepo = new RideHailingProviderInstanceRepository();
const rideOrderRepo = new RideHailingOrderRepository();
const tradeOrderRepo = new TradeOrderRepository();
const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();

const buildCallbackForm = (input: {
  signKey: string;
  orderId?: string;
  providerOrderId?: string;
  event?: string;
  finalAmountFen?: string;
}): URLSearchParams => {
  const unsigned = {
    timestamp: "1700000000000",
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
  await providerRepo.create({
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

  const validResponse = await requestJson(
    "/api/v1/service_provider/caocao/callback/order",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: buildCallbackForm({
        signKey: "scenario-caocao-secret-first",
      }).toString(),
    },
  );

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
});

scenario("Caocao callback updates ride execution and creates final bill", async () => {
  const creator = await givenUser("caocao-callback-order-owner");
  const provider = await providerRepo.create({
    providerType: "CAOCAO",
    instanceKey: `scenario-caocao-callback-${randomUUID()}`,
    status: "ACTIVE",
    displayName: "Scenario Caocao Callback",
    config: {
      adapterMode: "CAOCAO_OPEN_API",
      caocaoClientId: "scenario-caocao-callback-client",
      signKey: "scenario-caocao-callback-secret",
      endpointBaseUrl: "https://openapi.caocaokeji.cn/v2",
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
        type: "EXACTLY_ONE",
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
    items: [
      {
        itemId: randomUUID(),
        sku: {
          id: 930001,
          version: 1,
          name: "Scenario Caocao Express",
          factsSnapshot: {
            rideHailingProviderInstanceId: provider.id,
            providerVehicleTypeCode: "EXPRESS",
          },
          pricingModelSnapshot: {
            type: "DYNAMIC_QUOTE",
            calculatorSpec: {},
          },
          cancellationPolicySnapshot: null,
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
    providerInstanceId: provider.id,
    providerOrderId: null,
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
        signKey: "scenario-caocao-callback-secret",
        orderId: order.id,
        providerOrderId: "CC-FINAL-123",
        event: "25",
        finalAmountFen: "4321",
      }).toString(),
    },
  );

  assert.equal(response.status, 200);
  const updatedOrder = await tradeOrderRepo.findById(order.id);
  assert.equal(updatedOrder?.status, "OPEN");
  const updatedRide = await rideOrderRepo.findByOrderId(order.id as TradeOrderId);
  assert.equal(updatedRide?.providerOrderId, "CC-FINAL-123");
  assert.equal(updatedRide?.executionPhase, "FINISHED");
  assert.equal(updatedRide?.finalSettlementInput?.amountFen, 4321);
  assert.equal(updatedRide?.driverSnapshot?.driverName, "张师傅");
  assert.equal(updatedRide?.vehicleSnapshot?.plate, "浙A12345");
  const bill = await billRepo.findBySourceOrderId(order.id);
  assert.ok(bill);
  const lines = await billLineRepo.listByBillId(bill.id);
  assert.equal(lines.length, 1);
  assert.equal(lines[0]?.amountFen, 4321);
});
