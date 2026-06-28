import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { scenario } from "../_infra/scenario/scenario";
import { givenUser, type ScenarioUser } from "../pr-core/_kit/builders/users";
import { db } from "../../src/lib/db";
import {
  createOffer,
  createPlacement,
  createProductSku,
  createProductSpu,
  matchPlacementInstance,
} from "../../src/domains/merchandising";
import {
  buildOrderParticipantsFromContext,
  createRentalOrder,
} from "../../src/domains/trade";
import {
  applyPaymentSettlementConsequence,
  registerPaymentProviderInstance,
} from "../../src/domains/payment";
import { attachOrderToPr } from "../../src/domains/pr-core";
import type { OfferId } from "../../src/entities/offer";
import type { BillId } from "../../src/entities/bill";
import type { PaymentProviderInstanceId } from "../../src/entities/payment";
import type { PRId } from "../../src/entities/partner-request";
import type { ProductSku } from "../../src/entities/product-sku";
import type { TradeOrderId } from "../../src/entities/trade-order";
import { BillLineRepository } from "../../src/repositories/BillLineRepository";
import { PartnerRepository } from "../../src/repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";
import { RentalOrderRepository } from "../../src/repositories/RentalOrderRepository";
import { TradeOrderRepository } from "../../src/repositories/TradeOrderRepository";

const partnerRepo = new PartnerRepository();
const partnerRequestRepo = new PartnerRequestRepository();
const tradeOrderRepo = new TradeOrderRepository();
const rentalOrderRepo = new RentalOrderRepository();
const billLineRepo = new BillLineRepository();

const generateRsaPrivateKeyPem = (): string => {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: {
      format: "pem",
      type: "pkcs8",
    },
    publicKeyEncoding: {
      format: "pem",
      type: "spki",
    },
  });

  return privateKey;
};

const serviceStartAt = "2031-02-01T10:00:00.000Z";
const serviceEndAt = "2031-02-01T12:00:00.000Z";

const hasOwnKey = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const defaultRentalPlacementBindingRules = () => [
  {
    fieldKey: "participantCount",
    contextPath: "activeParticipantCount",
    lock: true as const,
  },
  {
    fieldKey: "serviceStartAt",
    contextPath: "time.startAt",
    lock: true as const,
  },
  {
    fieldKey: "serviceEndAt",
    contextPath: "time.endAt",
    lock: true as const,
  },
];

const buildRentalOrderItem = (input: {
  itemId: string;
  sku: ProductSku;
}) => ({
  itemId: input.itemId,
  sku: {
    id: input.sku.id,
    version: input.sku.version,
    name: input.sku.name,
    factsSnapshot: input.sku.facts,
    pricingModelSnapshot: input.sku.pricingModel,
    cancellationPolicySnapshot: null,
  },
  quantity: 1,
});

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

async function listPrOrderParticipants(prId: PRId, createdBy: string) {
  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(
    prId,
  );

  return buildOrderParticipantsFromContext({
    participants: activeParticipants.map((participant) => ({
      participantId: String(participant.partnerId),
      userId: participant.userId,
      joinedVia: "PR_ACTIVE_PARTICIPANT",
    })),
    createdBy,
  });
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
  const { offer, sku } = await givenRentalCatalog();
  const itemId = randomUUID();
  const participants = await listPrOrderParticipants(prId, creator.user.id);

  const result = await createRentalOrder({
    createdBy: creator.user.id,
    participants,
    offerId: offer.id,
    items: [buildRentalOrderItem({ itemId, sku })],
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
    serviceStartAt,
    serviceEndAt,
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
  assert.equal(baseOrder.offerId, offer.id);
  assert.equal(baseOrder.createdBy, creator.user.id);
  assert.equal(baseOrder.timeout.defaultWindowMinutes, 30);
  const unpaidExpiresAtMs = new Date(baseOrder.timeout.unpaidExpiresAt).getTime();
  const unpaidWindowMs = unpaidExpiresAtMs - baseOrder.createdAt.getTime();
  assert.ok(
    unpaidWindowMs >= 29 * 60 * 1000 && unpaidWindowMs <= 31 * 60 * 1000,
    "Rental base order should keep a 30-minute unpaid window",
  );
  assert.equal(hasOwnKey(baseOrder, "selectedZoneCodes"), false);
  assert.equal(hasOwnKey(baseOrder, "serviceStartAt"), false);
  assert.equal(hasOwnKey(baseOrder, "serviceEndAt"), false);
  assert.equal(hasOwnKey(baseOrder, "participantCount"), false);
  assert.equal(hasOwnKey(baseOrder, "contactPhone"), false);
  assert.equal(hasOwnKey(baseOrder, "registrants"), false);

  const typedOrder = await rentalOrderRepo.findByOrderId(result.orderId);
  assert.ok(typedOrder, "Rental typed order should be persisted");
  assert.equal(typedOrder.serviceStartAt.toISOString(), serviceStartAt);
  assert.equal(typedOrder.serviceEndAt.toISOString(), serviceEndAt);
  assert.equal(typedOrder.contactPhone, "13800138000");
  assert.equal(typedOrder.registrants[0]?.name, "张三");
  assert.equal(typedOrder.bookingStatus, "PENDING_BOOKING");
  assert.equal(typedOrder.cancellationHandlingStatus, "NONE");
});

scenario("commerce_late_payment_after_cancel_does_not_start_fulfillment", async (ctx) => {
  const creator = await givenUser("rental-late-payment-cancelled");
  const prId = await givenRentalPr(creator);
  const { offer, sku } = await givenRentalCatalog();
  const itemId = randomUUID();
  const participants = await listPrOrderParticipants(prId, creator.user.id);

  const orderResult = await createRentalOrder({
    createdBy: creator.user.id,
    participants,
    offerId: offer.id,
    items: [buildRentalOrderItem({ itemId, sku })],
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
    serviceStartAt,
    serviceEndAt,
    contactPhone: "13800138002",
    registrants: [
      {
        name: "王五",
        phone: "13800138002",
        nationalIdMasked: null,
      },
    ],
  });
  ctx.record("orderId", orderResult.orderId);

  const lines = await billLineRepo.listByBillId(orderResult.billId as BillId);
  const chargeLine = lines.find((line) => line.kind === "CHARGE");
  assert.ok(chargeLine, "Order should have a charge BillLine");

  const providerResult = await registerPaymentProviderInstance({
    providerType: "WECHAT_PAY",
    instanceKey: `late-payment-${randomUUID()}`,
    displayName: "Scenario late payment provider",
    clientId: `late-payment-${randomUUID()}`,
    config: {
      adapterMode: "WECHAT_PAY_API_V3",
      appId: "wx-late-payment",
      mchId: "mch-late-payment",
      chargeMode: "H5",
      endpointBaseUrl: null,
      apiV3Key: "0123456789abcdef0123456789abcdef",
      merchantCertificate: {
        serialNo: "late-payment-serial",
        privateKeyPem: generateRsaPrivateKeyPem(),
        certificatePem: null,
      },
    },
  });

  const openedChargeLine = await billLineRepo.openProviderExecutionSlot({
    id: chargeLine.id,
    paymentProviderInstanceId:
      providerResult.providerInstanceId as PaymentProviderInstanceId,
  });
  assert.ok(openedChargeLine, "Charge BillLine should open a provider slot");
  await billLineRepo.markSettledFromProvider({
    id: openedChargeLine.id,
    paymentProviderInstanceId:
      providerResult.providerInstanceId as PaymentProviderInstanceId,
    attemptCount: openedChargeLine.attemptCount,
    settledAt: new Date(),
  });

  await tradeOrderRepo.applyTerminationState({
    id: orderResult.orderId as TradeOrderId,
    status: "OPEN",
    terminationAttempts: [
      {
        attemptId: "attempt-late-payment",
        requestedAt: new Date().toISOString(),
        requestedBy: creator.user.id,
        status: "PENDING",
        resolutionPath: "RENTAL_FULFILLMENT",
        reason: null,
        effectKind: null,
        effectAmountFen: null,
        decidedAt: null,
      },
    ],
  });

  const pendingResult = await applyPaymentSettlementConsequence({
    billLineId: openedChargeLine.id,
  });

  assert.deepEqual(pendingResult, {
    applied: false,
    reason: "Order is not eligible for prepaid settlement consequence",
  });
  assert.equal(
    (await rentalOrderRepo.findByOrderId(orderResult.orderId as TradeOrderId))
      ?.bookingStatus,
    "PENDING_BOOKING",
  );

  await tradeOrderRepo.updateStatus(
    orderResult.orderId as TradeOrderId,
    "CANCELLED",
    new Date(),
  );

  const cancelledResult = await applyPaymentSettlementConsequence({
    billLineId: openedChargeLine.id,
  });

  assert.deepEqual(cancelledResult, {
    applied: false,
    reason: "Order is not eligible for prepaid settlement consequence",
  });
  assert.equal(
    (await rentalOrderRepo.findByOrderId(orderResult.orderId as TradeOrderId))
      ?.bookingStatus,
    "PENDING_BOOKING",
  );
});

scenario(
  "commerce_pr_offer_allows_new_order_after_terminal_order",
  async (ctx) => {
    const creator = await givenUser("rental-terminal-order-reorder");
    const prId = await givenRentalPr(creator);
    const { offer, sku, spu } = await givenRentalCatalog();
    const placement = await createPlacement({
      placementType: "BUTTON",
      offerId: offer.id,
      status: "ACTIVE",
      matchingRule: { "===": [{ var: "kind" }, "PR"] },
      priority: 10,
      creative: {
        ctaLabel: "预订场地",
      },
      bindingRules: defaultRentalPlacementBindingRules(),
    });

    const createOrder = async () => {
      const itemId = randomUUID();
      const participants = await listPrOrderParticipants(prId, creator.user.id);

      return db.transaction(async (tx) => {
        const result = await createRentalOrder(
          {
            createdBy: creator.user.id,
            participants,
            offerId: offer.id,
            items: [buildRentalOrderItem({ itemId, sku })],
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
            serviceStartAt,
            serviceEndAt,
            contactPhone: "13800138003",
            registrants: [
              {
                name: "赵六",
                phone: "13800138003",
                nationalIdMasked: null,
              },
            ],
          },
          tx,
        );

        await attachOrderToPr(
          {
            orderId: result.orderId as TradeOrderId,
            prId,
            offerId: offer.id as OfferId,
            orderCreatedBy: creator.user.id,
          },
          tx,
        );

        return result;
      });
    };

    const firstOrder = await createOrder();
    ctx.record("firstOrderId", firstOrder.orderId);
    ctx.record("placementId", placement.id);

    await assert.rejects(
      () => createOrder(),
      /An active order already exists for this PR and offer/,
    );

    const orderProjection = await matchPlacementInstance({
      type: "BUTTON",
      matchingContext: { kind: "PR" },
    });
    assert.equal(orderProjection.placements[0]?.offerId, offer.id);

    await tradeOrderRepo.updateStatus(
      firstOrder.orderId as TradeOrderId,
      "CANCELLED",
      new Date(),
    );

    const orderingProjection = await matchPlacementInstance({
      type: "BUTTON",
      matchingContext: { kind: "PR" },
    });
    assert.equal(orderingProjection.placements[0]?.offerId, offer.id);

    const secondOrder = await createOrder();
    ctx.record("secondOrderId", secondOrder.orderId);
    assert.notEqual(secondOrder.orderId, firstOrder.orderId);
  },
);

scenario("commerce_placement_resolution_does_not_filter_product_type", async () => {
  await givenUser("placement-non-rental-offer-creator");
  const spu = await createProductSpu({
    name: "Scenario ride hailing service",
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
  await createPlacement({
    placementType: "BUTTON",
    offerId: offer.id,
    status: "ACTIVE",
    matchingRule: { "===": [{ var: "kind" }, "PR"] },
    priority: 10,
    creative: {
      ctaLabel: "叫车",
    },
    bindingRules: [],
  });

  const projection = await matchPlacementInstance({
    type: "BUTTON",
    matchingContext: { kind: "PR" },
  });

  assert.equal(projection.placements[0]?.offerId, offer.id);
});

scenario("commerce_rental_order_create_rolls_back_typed_rows", async () => {
  const creator = await givenUser("rental-typed-order-rollback");
  const prId = await givenRentalPr(creator);
  const { offer, sku, spu } = await givenRentalCatalog();
  const itemId = randomUUID();
  const participants = await listPrOrderParticipants(prId, creator.user.id);

  await assert.rejects(() =>
    createRentalOrder({
      createdBy: creator.user.id,
      participants,
      offerId: offer.id,
      items: [buildRentalOrderItem({ itemId, sku })],
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
      serviceStartAt: "not-a-date",
      serviceEndAt,
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
