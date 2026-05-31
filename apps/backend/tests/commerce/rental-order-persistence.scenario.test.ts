import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { scenario } from "../_infra/scenario/scenario";
import { givenUser, type ScenarioUser } from "../pr-core/_kit/builders/users";
import {
  createOffer,
  createProductSku,
  createProductSpu,
} from "../../src/domains/merchandising";
import { createRentalOrder } from "../../src/domains/trade";
import type { PRId } from "../../src/entities/partner-request";
import { PartnerRepository } from "../../src/repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";
import { RentalOrderRepository } from "../../src/repositories/RentalOrderRepository";
import { TradeOrderRepository } from "../../src/repositories/TradeOrderRepository";

const partnerRepo = new PartnerRepository();
const partnerRequestRepo = new PartnerRequestRepository();
const tradeOrderRepo = new TradeOrderRepository();
const rentalOrderRepo = new RentalOrderRepository();

const serviceStartAt = "2031-02-01T10:00:00.000Z";
const serviceEndAt = "2031-02-01T12:00:00.000Z";

const hasOwnKey = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

async function givenRentalPr(creator: ScenarioUser): Promise<PRId> {
  const pr = await partnerRequestRepo.create({
    budget: null,
    createdBy: creator.user.id,
    joinGateConfig: [],
    location: "Scenario Kitchen",
    maxPartners: null,
    meetingPoint: null,
    minPartners: 1,
    notes: null,
    preferences: [],
    status: "READY",
    time: [serviceStartAt, serviceEndAt],
    title: `Rental persistence ${randomUUID()}`,
    type: "badminton",
  });

  await partnerRepo.createSlot({
    prId: pr.id,
    status: "JOINED",
    userId: creator.user.id,
  });

  return pr.id;
}

async function givenRentalCatalog() {
  const spu = await createProductSpu({
    name: "Scenario typed rental room",
    productType: "RENTAL",
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
      type: "RENTAL",
      bookingLeadTimeMinutes: 0,
      requiresContactPhone: true,
      requiresRealName: true,
      requiresNationalId: false,
    },
    pricingRules: [],
    presentation: {
      heroImageAssetIds: [],
      detailImageAssetIds: [],
      sellingPoints: [],
      parameterGroups: [],
      noticeBlocks: [],
    },
  });
  const sku = await createProductSku({
    spuId: spu.id,
    name: "Scenario typed rental sku",
    status: "ACTIVE",
    facts: {
      type: "RENTAL",
      zoneCode: "TYPED_RENTAL_ZONE",
      participantCount: 1,
      durationMinutes: 120,
    },
    pricingModel: {
      type: "FIXED_TOTAL",
      amountFen: 1200,
    },
  });
  const offer = await createOffer({
    productType: "RENTAL",
    spuIds: [spu.id],
    status: "ACTIVE",
    pricingRules: [],
    termsVersion: 1,
  });

  return { offer, sku, spu };
}

scenario("commerce_rental_order_persists_base_and_typed_rows", async (ctx) => {
  const creator = await givenUser("rental-typed-order-creator");
  const prId = await givenRentalPr(creator);
  const { offer, sku, spu } = await givenRentalCatalog();
  const itemId = randomUUID();

  const result = await createRentalOrder({
    prId,
    createdBy: creator.user.id,
    offerSnapshot: {
      offerId: offer.id,
      termsVersion: offer.termsVersion,
      productType: "RENTAL",
    },
    items: [
      {
        itemId,
        spuId: spu.id,
        spuVersion: spu.version,
        spuName: spu.name,
        skuId: sku.id,
        skuVersion: sku.version,
        skuName: sku.name,
        quantity: 1,
        skuFactsSnapshot: sku.facts,
        pricingModelSnapshot: sku.pricingModel,
        cancellationPolicySnapshot: null,
      },
    ],
    pricingSnapshot: {
      currency: "CNY",
      itemBreakdowns: [
        {
          itemId,
          resolvedAmountFen: 1200,
          explanations: [],
        },
      ],
      orderLevelExplanations: [],
      subtotalFen: 1200,
      totalFen: 1200,
    },
    selectedZoneCodes: ["TYPED_RENTAL_ZONE"],
    serviceStartAt,
    serviceEndAt,
    participantCount: 1,
    contactPhone: "13800138000",
    registrants: [
      {
        name: "张三",
        phone: "13800138000",
        nationalIdMasked: null,
      },
    ],
  });

  ctx.record("orderId", result.orderId);
  ctx.record("billId", result.billId);

  const baseOrder = await tradeOrderRepo.findById(result.orderId);
  assert.ok(baseOrder, "Base trade order should be persisted");
  assert.equal(baseOrder.family, "RENTAL");
  assert.equal(baseOrder.createdBy, creator.user.id);
  assert.equal(hasOwnKey(baseOrder, "selectedZoneCodes"), false);
  assert.equal(hasOwnKey(baseOrder, "serviceStartAt"), false);
  assert.equal(hasOwnKey(baseOrder, "serviceEndAt"), false);
  assert.equal(hasOwnKey(baseOrder, "participantCount"), false);
  assert.equal(hasOwnKey(baseOrder, "contactPhone"), false);
  assert.equal(hasOwnKey(baseOrder, "registrants"), false);

  const typedOrder = await rentalOrderRepo.findByOrderId(result.orderId);
  assert.ok(typedOrder, "Rental typed order should be persisted");
  assert.deepEqual(typedOrder.selectedZoneCodes, ["TYPED_RENTAL_ZONE"]);
  assert.equal(typedOrder.serviceStartAt.toISOString(), serviceStartAt);
  assert.equal(typedOrder.serviceEndAt.toISOString(), serviceEndAt);
  assert.equal(typedOrder.participantCount, 1);
  assert.equal(typedOrder.contactPhone, "13800138000");
  assert.equal(typedOrder.registrants[0]?.name, "张三");
});

scenario("commerce_rental_order_create_rolls_back_typed_rows", async () => {
  const creator = await givenUser("rental-typed-order-rollback");
  const prId = await givenRentalPr(creator);
  const { sku, spu } = await givenRentalCatalog();
  const itemId = randomUUID();

  await assert.rejects(() =>
    createRentalOrder({
      prId,
      createdBy: creator.user.id,
      offerSnapshot: {
        offerId: 9_999_999,
        termsVersion: 1,
        productType: "RENTAL",
      },
      items: [
        {
          itemId,
          spuId: spu.id,
          spuVersion: spu.version,
          spuName: spu.name,
          skuId: sku.id,
          skuVersion: sku.version,
          skuName: sku.name,
          quantity: 1,
          skuFactsSnapshot: sku.facts,
          pricingModelSnapshot: sku.pricingModel,
          cancellationPolicySnapshot: null,
        },
      ],
      pricingSnapshot: {
        currency: "CNY",
        itemBreakdowns: [
          {
            itemId,
            resolvedAmountFen: 1200,
            explanations: [],
          },
        ],
        orderLevelExplanations: [],
        subtotalFen: 1200,
        totalFen: 1200,
      },
      selectedZoneCodes: ["TYPED_RENTAL_ROLLBACK"],
      serviceStartAt,
      serviceEndAt,
      participantCount: 1,
      contactPhone: "13800138001",
      registrants: [
        {
          name: "李四",
          phone: "13800138001",
          nationalIdMasked: null,
        },
      ],
    }),
  );

  const leakedBaseOrders = (await tradeOrderRepo.listAll()).filter(
    (order) => order.createdBy === creator.user.id,
  );
  assert.equal(leakedBaseOrders.length, 0);
  assert.equal(
    (await rentalOrderRepo.listByOrderIds(leakedBaseOrders.map((order) => order.id)))
      .length,
    0,
  );
});
