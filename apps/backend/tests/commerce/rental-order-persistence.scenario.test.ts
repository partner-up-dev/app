import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createBillFromSeed } from "../../src/domains/bill/commands";
import {
  createOffer,
  createProductSku,
  createProductSpu,
} from "../../src/domains/merchandising/commands";
import { createOrderCommand } from "../../src/domains/trade/commands";
import { buildOrderParticipantsFromContext } from "../trade/_kit/order-foundation";
import type { OfferId } from "../../src/entities/offer";
import type { OfferListingSessionId, OfferQuoteId } from "../../src/entities/commerce-quote";
import type { PRId } from "../../src/entities/partner-request";
import type { TradeOrderId } from "../../src/entities/trade-order";
import { ProblemDetailsError } from "../../src/lib/problem-details";
import { BillRepository } from "../../src/repositories/BillRepository";
import { CommerceQuoteRepository } from "../../src/repositories/CommerceQuoteRepository";
import { CreateOrderAttemptRepository } from "../../src/repositories/CreateOrderAttemptRepository";
import { PartnerRepository } from "../../src/repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";
import { RentalOrderRepository } from "../../src/repositories/RentalOrderRepository";
import { TradeOrderRepository } from "../../src/repositories/TradeOrderRepository";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import { givenUser, type ScenarioUser } from "../pr/_kit/builders/users";

const partnerRepo = new PartnerRepository();
const partnerRequestRepo = new PartnerRequestRepository();
const tradeOrderRepo = new TradeOrderRepository();
const rentalOrderRepo = new RentalOrderRepository();
const billRepo = new BillRepository();
const quoteRepo = new CommerceQuoteRepository();
const createOrderAttemptRepo = new CreateOrderAttemptRepository();

const serviceStartAt = "2031-02-01T10:00:00.000Z";
const serviceEndAt = "2031-02-01T12:00:00.000Z";

async function givenRentalPr(creator: ScenarioUser): Promise<PRId> {
  const pr = await partnerRequestRepo.create({
    budget: null,
    createdBy: creator.user.id,
    joinGateConfig: [],
    location: "Historical Scenario Kitchen",
    maxPartners: null,
    meetingPoint: null,
    minPartners: 1,
    notes: null,
    preferences: [],
    status: "READY",
    time: [serviceStartAt, serviceEndAt],
    title: `Retired Rental ${randomUUID()}`,
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
    name: "Retired Rental fixture SPU",
    productType: "RENTAL",
    status: "ACTIVE",
    salesPolicy: {
      skuSelectionPolicy: { type: "EXACTLY_ONE" },
      quantityPolicy: { type: "FIXED", quantity: 1 },
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
    name: "Retired Rental fixture SKU",
    status: "ACTIVE",
    facts: {
      type: "RENTAL",
      zoneCode: "RETIRED_RENTAL_ZONE",
      participantCount: 1,
      durationMinutes: 120,
    },
    pricingModel: { type: "FIXED_TOTAL", amountFen: 1200 },
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

async function givenRentalQuote(input: {
  creator: ScenarioUser;
  offerId: OfferId;
  skuId: number;
  spuId: number;
}): Promise<OfferQuoteId> {
  const participants = buildOrderParticipantsFromContext({
    participants: [
      {
        participantId: `participant-${input.creator.user.id}`,
        userId: input.creator.user.id,
        joinedVia: "PR_ACTIVE_PARTICIPANT",
      },
    ],
    createdBy: input.creator.user.id,
  });
  const quoteId = randomUUID() as OfferQuoteId;
  await quoteRepo.create({
    id: quoteId,
    listingSessionId: randomUUID() as OfferListingSessionId,
    offerId: input.offerId,
    productType: "RENTAL",
    itemKind: "FIXED",
    spuId: input.spuId,
    skuId: input.skuId,
    quantity: 1,
    listingContextSnapshot: {
      productType: "RENTAL",
      participants,
      serviceStartAt,
      serviceEndAt,
      contactPhone: "13800138000",
      registrants: [{ name: "历史用户", phone: "13800138000", nationalIdMasked: null }],
    },
    fulfillmentQuoteSnapshot: { productType: "RENTAL" },
    pricingSnapshot: { currency: "CNY", totalFen: 1200, explanations: [] },
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  return quoteId;
}

scenario("commerce_rental_order_command_is_retired_before_writes", async (ctx) => {
  const creator = await givenUser("retired-rental-command");
  const prId = await givenRentalPr(creator);
  const { offer, sku, spu } = await givenRentalCatalog();
  const quoteId = await givenRentalQuote({
    creator,
    offerId: offer.id as OfferId,
    skuId: sku.id,
    spuId: spu.id,
  });
  const idempotencyKey = randomUUID();
  const before = {
    orderCount: (await tradeOrderRepo.listAll()).length,
    rentalOrderCount: (await rentalOrderRepo.listAll()).length,
    billCount: (await billRepo.listAll()).length,
  };

  let thrown: unknown = null;
  try {
    await createOrderCommand({
      createdBy: creator.user.id,
      idempotencyKey,
      prId,
      items: [{ kind: "FIXED", quoteId }],
    });
  } catch (error) {
    thrown = error;
  }

  assert.ok(thrown instanceof ProblemDetailsError);
  assert.equal(thrown.status, 410);
  assert.equal(thrown.code, "RENTAL_RUNTIME_RETIRED");
  assert.deepEqual(
    {
      orderCount: (await tradeOrderRepo.listAll()).length,
      rentalOrderCount: (await rentalOrderRepo.listAll()).length,
      billCount: (await billRepo.listAll()).length,
    },
    before,
  );
  assert.equal(
    await createOrderAttemptRepo.findByActorAndKey({
      actorUserId: creator.user.id,
      idempotencyKey,
    }),
    null,
  );
  ctx.record("quoteId", quoteId);
});

scenario("commerce_historical_rental_fixture_remains_readable", async (ctx) => {
  const viewer = await givenUser("historical-rental-reader");
  const { offer } = await givenRentalCatalog();
  const participants = buildOrderParticipantsFromContext({
    participants: [
      {
        participantId: `historical-${viewer.user.id}`,
        userId: viewer.user.id,
        joinedVia: "API",
      },
    ],
    createdBy: viewer.user.id,
  });
  const order = await tradeOrderRepo.create({
    family: "RENTAL",
    offerId: offer.id as OfferId,
    createdBy: viewer.user.id,
    status: "OPEN",
    participants,
    splitRuleSnapshot: {
      type: "RELATIVE",
      shares: [{ userId: viewer.user.id, percentBps: 10000 }],
    },
    pricingExecutionSnapshot: null,
    items: [],
    timeout: {
      unpaidExpiresAt: "2031-02-01T09:00:00.000Z",
      defaultWindowMinutes: 30,
    },
  });
  await rentalOrderRepo.create({
    orderId: order.id as TradeOrderId,
    serviceStartAt: new Date(serviceStartAt),
    serviceEndAt: new Date(serviceEndAt),
    contactPhone: "13800138001",
    registrants: [{ name: "历史用户", phone: "13800138001", nationalIdMasked: null }],
  });
  const bill = await createBillFromSeed({
    sourceOrderId: order.id,
    currency: "CNY",
    chargeLines: [
      {
        userId: viewer.user.id,
        amountFen: 1200,
        label: "Historical Rental charge",
        description: "Read-only fixture",
      },
    ],
  });

  const response = await requestJson(`/api/commerce/orders/${order.id}`, {
    token: viewer.token,
  });
  const body = await expectJsonResponse<{
    order: {
      id: string;
      family: string;
      serviceStartAt: string | null;
      serviceEndAt: string | null;
      contactPhone: string | null;
      registrants: Array<{ name: string }>;
    };
    bill: { id: string; lines: Array<{ amountFen: number }> } | null;
    fulfillment: { bookingStatus: string } | null;
  }>(response, 200);

  assert.equal(body.order.id, order.id);
  assert.equal(body.order.family, "RENTAL");
  assert.equal(body.order.serviceStartAt, serviceStartAt);
  assert.equal(body.order.serviceEndAt, serviceEndAt);
  assert.equal(body.order.contactPhone, "13800138001");
  assert.equal(body.order.registrants[0]?.name, "历史用户");
  assert.equal(body.bill?.id, bill.billId);
  assert.equal(body.bill?.lines[0]?.amountFen, 1200);
  assert.equal(body.fulfillment?.bookingStatus, "PENDING_BOOKING");
  ctx.record("historicalOrderId", order.id);
});
