import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { scenario } from "../_infra/scenario/scenario";
import { givenUser, type ScenarioUser } from "../pr/_kit/builders/users";
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
  createOrderCommand,
  createRentalOrder,
} from "../../src/domains/trade";
import {
  applyPaymentSettlementConsequence,
  registerPaymentProviderInstance,
} from "../../src/domains/payment";
import { attachOrderToPr } from "../../src/domains/pr/commands";
import type { OfferId } from "../../src/entities/offer";
import type { BillId } from "../../src/entities/bill";
import type { OfferListingSessionId, OfferQuoteId } from "../../src/entities/commerce-quote";
import type { PaymentProviderInstanceId } from "../../src/entities/payment";
import type { PRId } from "../../src/entities/partner-request";
import type { ProductSku } from "../../src/entities/product-sku";
import { tradeOrders } from "../../src/entities/trade-order";
import type { TradeOrderId } from "../../src/entities/trade-order";
import { ProblemDetailsError } from "../../src/lib/problem-details";
import { BillLineRepository } from "../../src/repositories/BillLineRepository";
import { CommerceQuoteRepository } from "../../src/repositories/CommerceQuoteRepository";
import { PartnerRepository } from "../../src/repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";
import { RentalOrderRepository } from "../../src/repositories/RentalOrderRepository";
import { TradeOrderRepository } from "../../src/repositories/TradeOrderRepository";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";

const partnerRepo = new PartnerRepository();
const partnerRequestRepo = new PartnerRequestRepository();
const tradeOrderRepo = new TradeOrderRepository();
const rentalOrderRepo = new RentalOrderRepository();
const billLineRepo = new BillLineRepository();
const quoteRepo = new CommerceQuoteRepository();

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

const buildRentalOrderItem = (input: { itemId: string; sku: ProductSku }) => ({
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

async function givenRentalPr(
  creator: ScenarioUser,
  status: "READY" | "ACTIVE" = "READY",
): Promise<PRId> {
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
    status,
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

async function createRentalFixedQuote(input: {
  offerId: OfferId;
  sku: ProductSku;
  spuId: number;
  participants: Awaited<ReturnType<typeof listPrOrderParticipants>>;
  contactPhone: string;
  registrantName: string;
}): Promise<OfferQuoteId> {
  const quoteId = randomUUID() as OfferQuoteId;
  await quoteRepo.create({
    id: quoteId,
    listingSessionId: randomUUID() as OfferListingSessionId,
    offerId: input.offerId,
    productType: "RENTAL",
    itemKind: "FIXED",
    spuId: input.spuId,
    skuId: input.sku.id,
    quantity: 1,
    listingContextSnapshot: {
      productType: "RENTAL",
      participants: input.participants,
      serviceStartAt,
      serviceEndAt,
      contactPhone: input.contactPhone,
      registrants: input.participants.map(() => ({
        name: input.registrantName,
        phone: input.contactPhone,
        nationalIdMasked: null,
      })),
    },
    fulfillmentQuoteSnapshot: {
      productType: "RENTAL",
    },
    pricingSnapshot: {
      currency: "CNY",
      totalFen: 1200,
      explanations: [],
    },
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  return quoteId;
}

async function createStandaloneRentalOrder(input: {
  user: ScenarioUser;
  offerId: OfferId;
  sku: ProductSku;
  contactPhone: string;
  registrantName: string;
  totalFen?: number;
}) {
  const itemId = randomUUID();
  const totalFen = input.totalFen ?? 1200;
  const participants = buildOrderParticipantsFromContext({
    participants: [
      {
        participantId: `standalone-${randomUUID()}`,
        userId: input.user.user.id,
        joinedVia: "API",
      },
    ],
    createdBy: input.user.user.id,
  });

  return createRentalOrder({
    createdBy: input.user.user.id,
    participants,
    offerId: input.offerId,
    items: [buildRentalOrderItem({ itemId, sku: input.sku })],
    pricingSnapshot: {
      currency: "CNY",
      itemBreakdowns: [
        {
          itemId,
          resolvedAmountFen: totalFen,
          explanations: [],
        },
      ],
      orderLevelExplanations: [],
      subtotalFen: totalFen,
      totalFen,
    },
    serviceStartAt,
    serviceEndAt,
    contactPhone: input.contactPhone,
    registrants: [
      {
        name: input.registrantName,
        phone: input.contactPhone,
        nationalIdMasked: null,
      },
    ],
  });
}

async function assertProblemCode(run: () => Promise<unknown>, expectedCode: string): Promise<void> {
  let thrown: unknown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }

  assert.ok(thrown instanceof ProblemDetailsError);
  assert.equal(thrown.code, expectedCode);
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

scenario("commerce_rental_order_attaches_to_active_pr_orders", async (ctx) => {
  const creator = await givenUser("rental-active-pr-attachment");
  const prId = await givenRentalPr(creator, "ACTIVE");
  const { offer, sku } = await givenRentalCatalog();
  const itemId = randomUUID();
  const participants = await listPrOrderParticipants(prId, creator.user.id);

  const result = await db.transaction(async (tx) => {
    const created = await createRentalOrder(
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
        contactPhone: "13800138008",
        registrants: [
          {
            name: "李四",
            phone: "13800138008",
            nationalIdMasked: null,
          },
        ],
      },
      tx,
    );

    await attachOrderToPr(
      {
        orderId: created.orderId as TradeOrderId,
        prId,
        offerId: offer.id as OfferId,
        orderCreatedBy: creator.user.id,
      },
      tx,
    );

    return created;
  });

  ctx.record("prId", prId);
  ctx.record("orderId", result.orderId);

  const updatedPr = await partnerRequestRepo.findById(prId);
  assert.ok(updatedPr, "PR should still exist after ACTIVE attachment");
  assert.equal(updatedPr.status, "ACTIVE");
  assert.deepEqual(updatedPr.orders, [result.orderId]);
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
    paymentProviderInstanceId: providerResult.providerInstanceId as PaymentProviderInstanceId,
  });
  assert.ok(openedChargeLine, "Charge BillLine should open a provider slot");
  await billLineRepo.markSettledFromProvider({
    id: openedChargeLine.id,
    paymentProviderInstanceId: providerResult.providerInstanceId as PaymentProviderInstanceId,
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
    (await rentalOrderRepo.findByOrderId(orderResult.orderId as TradeOrderId))?.bookingStatus,
    "PENDING_BOOKING",
  );

  await tradeOrderRepo.updateStatus(orderResult.orderId as TradeOrderId, "CANCELLED", new Date());

  const cancelledResult = await applyPaymentSettlementConsequence({
    billLineId: openedChargeLine.id,
  });

  assert.deepEqual(cancelledResult, {
    applied: false,
    reason: "Order is not eligible for prepaid settlement consequence",
  });
  assert.equal(
    (await rentalOrderRepo.findByOrderId(orderResult.orderId as TradeOrderId))?.bookingStatus,
    "PENDING_BOOKING",
  );
});

scenario("commerce_pr_offer_allows_new_order_after_terminal_order", async (ctx) => {
  const creator = await givenUser("rental-terminal-order-reorder");
  const prId = await givenRentalPr(creator);
  const { offer, sku } = await givenRentalCatalog();
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

  await assert.rejects(() => createOrder(), /An active order already exists for this PR and offer/);

  const orderProjection = await matchPlacementInstance({
    type: "BUTTON",
    matchingContext: { kind: "PR" },
  });
  assert.equal(orderProjection.placements[0]?.offerId, offer.id);

  await tradeOrderRepo.updateStatus(firstOrder.orderId as TradeOrderId, "CANCELLED", new Date());

  const orderingProjection = await matchPlacementInstance({
    type: "BUTTON",
    matchingContext: { kind: "PR" },
  });
  assert.equal(orderingProjection.placements[0]?.offerId, offer.id);

  const secondOrder = await createOrder();
  ctx.record("secondOrderId", secondOrder.orderId);
  assert.notEqual(secondOrder.orderId, firstOrder.orderId);
});

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
  const { offer, sku } = await givenRentalCatalog();
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
    (await rentalOrderRepo.listByOrderIds(leakedBaseOrders.map((order) => order.id))).length,
    0,
  );
});

scenario("commerce_create_order_blocks_participant_with_unpaid_order", async () => {
  const creator = await givenUser("rental-create-order-unpaid-block");
  const existingPrId = await givenRentalPr(creator);
  const nextPrId = await givenRentalPr(creator);
  const { offer, sku, spu } = await givenRentalCatalog();
  const existingParticipants = await listPrOrderParticipants(existingPrId, creator.user.id);
  const existingItemId = randomUUID();

  await createRentalOrder({
    createdBy: creator.user.id,
    participants: existingParticipants,
    offerId: offer.id,
    items: [buildRentalOrderItem({ itemId: existingItemId, sku })],
    pricingSnapshot: {
      currency: "CNY",
      itemBreakdowns: [
        {
          itemId: existingItemId,
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
    contactPhone: "13800138111",
    registrants: [
      {
        name: "王五",
        phone: "13800138111",
        nationalIdMasked: null,
      },
    ],
  });
  const nextParticipants = await listPrOrderParticipants(nextPrId, creator.user.id);
  const nextQuoteId = await createRentalFixedQuote({
    offerId: offer.id as OfferId,
    sku,
    spuId: spu.id,
    participants: nextParticipants,
    contactPhone: "13800138222",
    registrantName: "赵六",
  });

  await assertProblemCode(
    () =>
      createOrderCommand({
        createdBy: creator.user.id,
        prId: nextPrId,
        items: [
          {
            kind: "FIXED",
            quoteId: nextQuoteId,
          },
        ],
      }),
    "ORDERING_PARTICIPANT_UNPAID_ORDER_EXISTS",
  );
});

scenario("commerce_create_order_ignores_expired_unpaid_participant_bill_lines", async () => {
  const creator = await givenUser("creator-with-expired-unpaid-order");
  const prId = await givenRentalPr(creator);
  const { offer, sku, spu } = await givenRentalCatalog();
  const expiredOrder = await createStandaloneRentalOrder({
    user: creator,
    offerId: offer.id,
    sku,
    contactPhone: "13800138223",
    registrantName: "过期账单用户",
  });

  await db
    .update(tradeOrders)
    .set({
      timeout: {
        unpaidExpiresAt: "2020-01-01T00:00:00.000Z",
        defaultWindowMinutes: 30,
      },
    })
    .where(eq(tradeOrders.id, expiredOrder.orderId as TradeOrderId));

  const nextParticipants = await listPrOrderParticipants(prId, creator.user.id);
  const nextQuoteId = await createRentalFixedQuote({
    offerId: offer.id as OfferId,
    sku,
    spuId: spu.id,
    participants: nextParticipants,
    contactPhone: "13800138224",
    registrantName: "下一单用户",
  });

  const result = await createOrderCommand({
    createdBy: creator.user.id,
    prId,
    items: [
      {
        kind: "FIXED",
        quoteId: nextQuoteId,
      },
    ],
  });

  assert.equal(result.outcome, "CREATED");
});

scenario("commerce_expired_bill_detail_no_longer_exposes_payable_line", async () => {
  const viewer = await givenUser("expired-bill-detail-viewer");
  const { offer, sku } = await givenRentalCatalog();
  const expiredOrder = await createStandaloneRentalOrder({
    user: viewer,
    offerId: offer.id,
    sku,
    contactPhone: "13800138225",
    registrantName: "过期详情用户",
  });

  await db
    .update(tradeOrders)
    .set({
      timeout: {
        unpaidExpiresAt: "2020-01-01T00:00:00.000Z",
        defaultWindowMinutes: 30,
      },
    })
    .where(eq(tradeOrders.id, expiredOrder.orderId as TradeOrderId));

  const response = await requestJson(`/api/commerce/bills/${expiredOrder.billId}`, {
    token: viewer.token,
  });
  const body = await expectJsonResponse<{
    bill: {
      settlementStatus: string;
    };
    lines: Array<{
      settlementStatus: string;
      payableByViewer: boolean;
    }>;
  }>(response, 200);

  assert.equal(body.bill.settlementStatus, "UNPAID");
  assert.equal(body.lines[0]?.settlementStatus, "UNPAID");
  assert.equal(body.lines[0]?.payableByViewer, false);
});

scenario("commerce_zero_amount_charge_bill_is_treated_as_paid", async () => {
  const viewer = await givenUser("zero-amount-bill-viewer");
  const prId = await givenRentalPr(viewer);
  const { offer, sku, spu } = await givenRentalCatalog();
  const zeroAmountOrder = await createStandaloneRentalOrder({
    user: viewer,
    offerId: offer.id,
    sku,
    contactPhone: "13800138226",
    registrantName: "零元账单用户",
    totalFen: 0,
  });

  const lines = await billLineRepo.listByBillId(zeroAmountOrder.billId as BillId);
  assert.ok(lines[0]?.settledAt, "Zero-amount charge line should be auto-settled");

  const billResponse = await requestJson(`/api/commerce/bills/${zeroAmountOrder.billId}`, {
    token: viewer.token,
  });
  const billBody = await expectJsonResponse<{
    bill: {
      settlementStatus: string;
      totalAmountFen: number;
    };
    lines: Array<{
      settlementStatus: string;
      payableByViewer: boolean;
      paidFen: number;
    }>;
  }>(billResponse, 200);

  assert.equal(billBody.bill.settlementStatus, "PAID");
  assert.equal(billBody.bill.totalAmountFen, 0);
  assert.equal(billBody.lines[0]?.settlementStatus, "PAID");
  assert.equal(billBody.lines[0]?.payableByViewer, false);
  assert.equal(billBody.lines[0]?.paidFen, 0);

  const nextParticipants = await listPrOrderParticipants(prId, viewer.user.id);
  const nextQuoteId = await createRentalFixedQuote({
    offerId: offer.id as OfferId,
    sku,
    spuId: spu.id,
    participants: nextParticipants,
    contactPhone: "13800138227",
    registrantName: "零元后续用户",
  });

  const result = await createOrderCommand({
    createdBy: viewer.user.id,
    prId,
    items: [
      {
        kind: "FIXED",
        quoteId: nextQuoteId,
      },
    ],
  });

  assert.equal(result.outcome, "CREATED");
});

scenario("commerce_bill_list_returns_only_viewer_bill_ids", async (ctx) => {
  const viewer = await givenUser("viewer-bills-owner");
  const otherUser = await givenUser("viewer-bills-other-user");
  const { offer, sku } = await givenRentalCatalog();

  const firstViewerOrder = await createStandaloneRentalOrder({
    user: viewer,
    offerId: offer.id,
    sku,
    contactPhone: "13800138011",
    registrantName: "账单用户一",
  });
  const secondViewerOrder = await createStandaloneRentalOrder({
    user: viewer,
    offerId: offer.id,
    sku,
    contactPhone: "13800138012",
    registrantName: "账单用户二",
  });
  const otherUserOrder = await createStandaloneRentalOrder({
    user: otherUser,
    offerId: offer.id,
    sku,
    contactPhone: "13800138013",
    registrantName: "其他用户",
  });

  ctx.record("viewerUserId", viewer.user.id);
  ctx.record("firstViewerBillId", firstViewerOrder.billId);
  ctx.record("secondViewerBillId", secondViewerOrder.billId);
  ctx.record("otherUserBillId", otherUserOrder.billId);

  const response = await requestJson("/api/commerce/bills", {
    token: viewer.token,
  });
  const body = await expectJsonResponse<{ billIds: string[] }>(response, 200);

  assert.equal(body.billIds.includes(otherUserOrder.billId), false);
  assert.equal(body.billIds.length, 2);
  assert.deepEqual(
    new Set(body.billIds),
    new Set([firstViewerOrder.billId, secondViewerOrder.billId]),
  );
});

scenario("commerce_bill_list_requires_authenticated_role", async () => {
  const response = await requestJson("/api/commerce/bills");
  const body = await expectJsonResponse<{
    status: number;
    code?: string;
    detail: string;
  }>(response, 401);

  assert.equal(body.code, "AUTHENTICATED_REQUIRED");
});
