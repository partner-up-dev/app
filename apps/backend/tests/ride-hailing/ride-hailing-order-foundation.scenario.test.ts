import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { scenario } from "../_infra/scenario/scenario";
import { givenUser, type ScenarioUser } from "../pr-core/_kit/builders/users";
import { db } from "../../src/lib/db";
import { createOffer, createProductSpu } from "../../src/domains/merchandising";
import {
  buildOrderParticipantsFromContext,
  createRideHailingOrderFoundation,
} from "../../src/domains/trade";
import { attachOrderToPr } from "../../src/domains/pr-core";
import type { OfferId } from "../../src/entities/offer";
import type { PRId } from "../../src/entities/partner-request";
import type { TradeOrderId } from "../../src/entities/trade-order";
import { PartnerRepository } from "../../src/repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";
import { RideHailingOrderRepository } from "../../src/repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../src/repositories/RideHailingProviderInstanceRepository";
import { TradeOrderRepository } from "../../src/repositories/TradeOrderRepository";

const partnerRepo = new PartnerRepository();
const partnerRequestRepo = new PartnerRequestRepository();
const tradeOrderRepo = new TradeOrderRepository();
const rideOrderRepo = new RideHailingOrderRepository();
const providerRepo = new RideHailingProviderInstanceRepository();

const hasOwnKey = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

async function givenRideHailingPr(
  creator: ScenarioUser,
  status: "READY" | "ACTIVE" = "READY",
): Promise<PRId> {
  const pr = await partnerRequestRepo.create({
    budget: null,
    createdBy: creator.user.id,
    joinGateConfig: [],
    location: "Scenario pickup",
    maxPartners: null,
    meetingPoint: null,
    minPartners: 1,
    notes: null,
    preferences: [],
    status,
    time: ["2031-03-01T10:00:00.000Z", "2031-03-01T11:00:00.000Z"],
    title: `Ride hailing foundation ${randomUUID()}`,
    type: "badminton",
  });

  await partnerRepo.createSlot({
    prId: pr.id,
    status: "JOINED",
    userId: creator.user.id,
  });

  return pr.id;
}

async function listPrOrderParticipants(prId: PRId, createdBy: string) {
  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(prId);

  return buildOrderParticipantsFromContext({
    participants: activeParticipants.map((participant) => ({
      participantId: String(participant.partnerId),
      userId: participant.userId,
      joinedVia: "PR_ACTIVE_PARTICIPANT",
    })),
    createdBy,
  });
}

async function givenRideHailingOffer() {
  const spu = await createProductSpu({
    name: "Scenario ride hailing",
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

  return { offer, spu };
}

scenario(
  "ride_hailing_order_foundation_persists_base_typed_and_provider_binding_for_active_pr",
  async (ctx) => {
  const creator = await givenUser("ride-foundation-creator");
  const prId = await givenRideHailingPr(creator, "ACTIVE");
  const { offer, spu } = await givenRideHailingOffer();
  const provider = await providerRepo.create({
    providerType: "CAOCAO",
    instanceKey: `ride-foundation-${randomUUID()}`,
    status: "ACTIVE",
    displayName: "Scenario Caocao",
    config: {
      adapterMode: "CAOCAO_OPEN_API",
      caocaoClientId: "scenario-caocao-client",
      signKey: "scenario-caocao-secret",
      endpointBaseUrl: "https://openapi.caocaokeji.cn/v2",
      callbackBaseUrl: "https://api.partner-up.test",
    },
  });
  const itemId = randomUUID();
  const participants = await listPrOrderParticipants(prId, creator.user.id);

  const result = await db.transaction(async (tx) => {
    const orderResult = await createRideHailingOrderFoundation(
      {
        createdBy: creator.user.id,
        participants,
        offerId: offer.id,
        items: [
          {
            kind: "CHOICE_SET",
            itemId,
            productType: "RIDE_HAILING",
            candidates: [
              {
                sku: {
                  id: 901001,
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
                    providerVehicleTypeCode: "1",
                  },
                  pricingModelSnapshot: {
                    type: "DYNAMIC_QUOTE",
                    calculatorSpec: {},
                  },
                  cancellationPolicySnapshot: null,
                },
                quoteSnapshot: {
                  amountFen: 3600,
                  currency: "CNY",
                  displayName: "Scenario Caocao Express",
                  estimateAmountFen: 3600,
                  quotedAt: "2031-03-01T09:00:00.000Z",
                  explanations: [],
                },
              },
            ],
            resolution: null,
            quantity: 1,
          },
        ],
        pricingSnapshot: {
          currency: "CNY",
          itemBreakdowns: [
            {
              itemId,
              resolvedAmountFen: 3600,
              explanations: [],
            },
          ],
          orderLevelExplanations: [],
          subtotalFen: 3600,
          totalFen: 3600,
        },
        routeSnapshot: {
          origin: {
            name: "Scenario pickup",
            address: "A road",
            latitude: 30.2601,
            longitude: 120.1531,
          },
          waypoints: [],
          destination: {
            name: "Scenario destination",
            address: "B road",
            latitude: 30.2801,
            longitude: 120.1731,
          },
          drivingPlan: {
            distanceMeters: 8200,
            durationSeconds: 1500,
            polyline: [
              {
                latitude: 30.2601,
                longitude: 120.1531,
              },
              {
                latitude: 30.2801,
                longitude: 120.1731,
              },
            ],
          },
        },
        departureAt: null,
        riders: [
          {
            userId: creator.user.id,
            displayName: "Scenario rider",
            phoneMasked: "138****8000",
          },
        ],
        contactPhone: "13800138000",
      },
      tx,
    );

    await attachOrderToPr(
      {
        orderId: orderResult.orderId as TradeOrderId,
        prId,
        offerId: offer.id as OfferId,
        orderCreatedBy: creator.user.id,
      },
      tx,
    );

    return orderResult;
  });

  ctx.record("orderId", result.orderId);

  const baseOrder = await tradeOrderRepo.findById(result.orderId);
  assert.ok(baseOrder, "Base trade order should be persisted");
  assert.equal(baseOrder.family, "RIDE_HAILING");
  assert.equal(baseOrder.offerId, offer.id);
  assert.equal(baseOrder.status, "INITIATING");
  assert.equal(baseOrder.timeout.defaultWindowMinutes, 0);
  assert.equal(baseOrder.timeout.unpaidExpiresAt, "9999-12-31T23:59:59.999Z");
  assert.equal(baseOrder.items[0]?.kind, "CHOICE_SET");
  const choiceSetItem = baseOrder.items[0]?.kind === "CHOICE_SET" ? baseOrder.items[0] : null;
  assert.ok(choiceSetItem, "RideHailing base item should be a choice set");
  assert.equal(choiceSetItem.productType, "RIDE_HAILING");
  assert.equal(
    choiceSetItem.candidates[0]?.sku.factsSnapshot.rideHailingProviderInstanceId,
    provider.id,
  );
  assert.equal(choiceSetItem.resolution, null);
  assert.equal(hasOwnKey(baseOrder, "routeSnapshot"), false);
  assert.equal(hasOwnKey(baseOrder, "providerCreationStatus"), false);
  assert.equal(hasOwnKey(baseOrder, "dispatchState"), false);
  assert.equal(hasOwnKey(baseOrder, "driverAssignmentSnapshot"), false);
  assert.equal(hasOwnKey(baseOrder, "cancellationSideEffectResult"), false);
  assert.equal(hasOwnKey(baseOrder, "feeConfirmSideEffectResult"), false);
  assert.equal(hasOwnKey(baseOrder, "finalSettlementInput"), false);

  const typedOrder = await rideOrderRepo.findByOrderId(result.orderId);
  assert.ok(typedOrder, "RideHailing typed order should be persisted");
  assert.equal(typedOrder.routeSnapshot.origin.name, "Scenario pickup");
  assert.equal(typedOrder.departureAt, null);
  assert.equal(typedOrder.riders[0]?.userId, creator.user.id);
  assert.equal(typedOrder.contactPhone, "13800138000");
  assert.equal(hasOwnKey(typedOrder, "providerInstanceId"), false);
  assert.equal(hasOwnKey(typedOrder, "providerOrderId"), false);
  assert.equal(hasOwnKey(typedOrder, "providerCreationStatus"), false);
  assert.equal(hasOwnKey(typedOrder, "executionProjection"), false);
  assert.equal(hasOwnKey(typedOrder, "dispatchState"), false);
  assert.equal(hasOwnKey(typedOrder, "driverAssignmentSnapshot"), false);
  assert.equal(hasOwnKey(typedOrder, "cancellationSideEffectResult"), false);
  assert.equal(hasOwnKey(typedOrder, "feeConfirmSideEffectResult"), false);
  assert.equal(typedOrder.finalSettlementInput, null);
  assert.equal(hasOwnKey(typedOrder, "finalPricingReference"), false);

  const pr = await partnerRequestRepo.findById(prId);
  assert.ok(pr, "PR should still exist");
  assert.equal(pr.status, "ACTIVE");
  assert.deepEqual(pr.orders, [result.orderId]);
});
