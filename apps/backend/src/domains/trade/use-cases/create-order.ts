import { randomUUID } from "node:crypto";
import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import type {
  CommerceQuote,
  RentalQuoteListingContextSnapshot,
  RideHailingFulfillmentQuoteSnapshot,
  RideHailingQuoteListingContextSnapshot,
} from "../../../entities/commerce-quote";
import type { Offer, OfferId } from "../../../entities/offer";
import type { PRId } from "../../../entities/partner-request";
import type { ProductSku } from "../../../entities/product-sku";
import type { ProductSpu } from "../../../entities/product-spu";
import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { RentalOrderRepository } from "../../../repositories/RentalOrderRepository";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import { SkuCancellationPolicyRepository } from "../../../repositories/SkuCancellationPolicyRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import type { RepositoryExecutor } from "../../../repositories/_executor";
import { createBillFromSeed } from "../../bill";
import { materializeChargeLinesFromSplitRule } from "../../bill/services";
import {
  isRentalSkuFacts,
  isRideHailingSkuFacts,
  type PriceExplanation,
  type RentalSkuFacts,
  type RideHailingSkuFacts,
} from "../../merchandising";
import {
  buildCaocaoCallbackInfo,
  createRideHailingProviderPort,
  resolveCaocaoOrderStatusCallbackUrl,
} from "../../ride-hailing";
import { attachOrderToPr } from "../../pr-core";
import type {
  ChoiceSetOrderItemSnapshot,
  FixedOrderItemSnapshot,
  OrderItemSnapshot,
  OrderParticipantSnapshot,
  OrderPricingSnapshot,
  OrderStatus,
  OrderTimeout,
  RentalRegistrant,
  RideHailingChoiceSetCandidateSnapshot,
  RideHailingChoiceSetResolutionSnapshot,
  RideHailingProviderBindingSnapshot,
  RideHailingRiderSnapshot,
  RideHailingQuoteSnapshot,
  RideHailingRouteSnapshot,
  SkuSnapshot,
} from "../model";
import { buildEqualRelativeSplitRule, validateOrderParticipants } from "../services";
import {
  resolveQuoteBoundOrderItems,
  type QuoteBoundOrderItemInput,
  type ValidatedOfferQuote,
  type ValidatedQuoteItem,
} from "./offer-quote";

const offerRepo = new OfferRepository();
const partnerRequestRepo = new PartnerRequestRepository();
const skuCancellationPolicyRepo = new SkuCancellationPolicyRepository();
const providerRepo = new RideHailingProviderInstanceRepository();

const DEFAULT_UNPAID_WINDOW_MINUTES = 30;
const NON_EXPIRING_UNPAID_EXPIRES_AT = "9999-12-31T23:59:59.999Z";

export type OrderItemInput = QuoteBoundOrderItemInput;

export type CreateOrderCommandInput = {
  prId?: number | null;
  items: OrderItemInput[];
};

export type CreateRentalOrderInput = {
  createdBy: string;
  offerId: number;
  participants: OrderParticipantSnapshot[];
  items: OrderItemSnapshot[];
  pricingSnapshot: OrderPricingSnapshot;
  serviceStartAt: string;
  serviceEndAt: string;
  contactPhone: string;
  registrants: RentalRegistrant[];
};

export type CreateRideHailingOrderFoundationInput = {
  createdBy: string;
  offerId: number;
  participants: OrderParticipantSnapshot[];
  items: OrderItemSnapshot[];
  pricingSnapshot: OrderPricingSnapshot;
  routeSnapshot: RideHailingRouteSnapshot;
  departureAt?: string | null;
  riders: RideHailingRiderSnapshot[];
  contactPhone: string;
};

export type OrderingActionProblem = {
  type: string;
  code: string;
  title: string;
  detail: string;
};

export type CreateOrderCommandResult =
  | {
    outcome: "CREATED";
    orderId: string;
    billId?: string | null;
  }
  | {
    outcome: "CANCELLED";
    orderId: string;
    reason: OrderingActionProblem;
  };

type RideQuoteOption = {
  skuId: number;
  spuId: number;
  name: string;
  providerName: string;
  carTypeName: string;
  displayName: string;
  providerVehicleTypeCode: string;
  providerInstanceId: string;
  selected: boolean;
  selectable: boolean;
  disabledReason: string | null;
  estimateAmountFen: number | null;
  quoteAmountFen: number | null;
  priceExplanations: PriceExplanation[];
};

type SelectedProductContext = {
  offer: Offer;
  spu: ProductSpu;
  sku: ProductSku;
  quantity: number;
};

type SelectedRentalContext = Omit<SelectedProductContext, "sku"> & {
  sku: ProductSku & { facts: RentalSkuFacts };
  itemId: string;
  pricingSnapshot: OrderPricingSnapshot;
  cancellationPolicySnapshot: FixedOrderItemSnapshot["sku"]["cancellationPolicySnapshot"];
  listingContext: RentalQuoteListingContextSnapshot;
};

type RideCandidateContext = Omit<SelectedProductContext, "sku"> & {
  sku: ProductSku & { facts: RideHailingSkuFacts };
  quote: RideQuoteOption;
  offerQuote?: CommerceQuote;
  fulfillmentQuote: RideHailingFulfillmentQuoteSnapshot;
};

type SelectedRideContext = {
  offer: Offer;
  itemId: string;
  candidates: RideCandidateContext[];
  dispatchCandidate: RideCandidateContext;
  pricingSnapshot: OrderPricingSnapshot;
  listingContext: RideHailingQuoteListingContextSnapshot;
};

const isActiveNow = (offer: Offer, now = new Date()): boolean => {
  if (offer.status !== "ACTIVE") return false;
  if (offer.startsAt && offer.startsAt > now) return false;
  if (offer.endsAt && offer.endsAt <= now) return false;
  return true;
};

const actionProblem = (input: {
  code: string;
  title: string;
  detail: string;
  type?: string;
}): OrderingActionProblem => ({
  type: input.type ?? "https://partner-up.local/problems/commerce/create-order",
  code: input.code,
  title: input.title,
  detail: input.detail,
});

async function resolveOffer(offerId: number): Promise<Offer> {
  const offer = await offerRepo.findById(offerId as OfferId);
  if (!offer) {
    return throwHttpProblem({ status: 404, detail: "Offer not found" });
  }
  if (!isActiveNow(offer)) {
    return throwHttpProblem({ status: 409, detail: "Offer is not active" });
  }
  return offer;
}

async function buildCancellationPolicySnapshot(sku: ProductSku) {
  const ref = sku.cancellationPolicyRef;
  const policy = ref
    ? await skuCancellationPolicyRepo.findByRef(ref.policyId, ref.policyVersion)
    : await skuCancellationPolicyRepo.findLatestBySkuId(sku.id);

  if (!policy) return null;

  return {
    source: {
      skuPolicyId: policy.policyId,
      skuPolicyVersion: policy.policyVersion,
      skuId: policy.skuId,
    },
    basis: policy.basis,
    operatorBufferMinutes: policy.operatorBufferMinutes,
    tiers: policy.tiers,
  };
}

function validateCommonCommand(input: {
  command: CreateOrderCommandInput;
  createdBy?: string | null;
}): OrderingActionProblem | null {
  if (input.command.items.length === 0) {
    return actionProblem({
      code: "ORDER_ITEMS_REQUIRED",
      title: "无法创建订单",
      detail: "订单至少需要一个商品项。",
    });
  }
  return null;
}

async function validatePrAttachmentForEvaluation(input: {
  prId?: number | null;
  offerId: number;
  viewerUserId?: string | null;
}): Promise<OrderingActionProblem | null> {
  if (!input.prId) return null;
  const pr = await partnerRequestRepo.findById(input.prId as PRId);
  if (!pr) {
    return actionProblem({
      code: "PR_NOT_FOUND",
      title: "无法创建订单",
      detail: "关联的 PR 不存在。",
    });
  }
  if (pr.status !== "READY") {
    return actionProblem({
      code: "PR_NOT_READY",
      title: "暂不能创建订单",
      detail: "创建订单需要搭子请求「已成团」",
    });
  }
  if (!input.viewerUserId || pr.createdBy !== input.viewerUserId) {
    return actionProblem({
      code: "PR_ORDER_CREATOR_REQUIRED",
      title: "暂不能创建订单",
      detail: "仅 PR 创建者可以创建订单。",
    });
  }
  return null;
}

function validateRentalQuoteContext(input: {
  listingContext: RentalQuoteListingContextSnapshot;
  selectedParticipantCount: number;
}): OrderingActionProblem | null {
  const participantCount = input.listingContext.participants.length;
  if (input.selectedParticipantCount !== participantCount) {
    return actionProblem({
      code: "RENTAL_SKU_PARTICIPANT_COUNT_MISMATCH",
      title: "规格与人数不一致",
      detail: "选择的租赁规格需要匹配订单参与人数。",
    });
  }
  if (input.listingContext.contactPhone.trim().length === 0) {
    return actionProblem({
      code: "ORDER_CONTACT_PHONE_REQUIRED",
      title: "缺少联系方式",
      detail: "请填写联系人电话。",
    });
  }
  if (input.listingContext.registrants.length !== participantCount) {
    return actionProblem({
      code: "RENTAL_REGISTRANT_COUNT_MISMATCH",
      title: "实名登记人数不一致",
      detail: "实名登记人数需要匹配订单参与者人数。",
    });
  }
  if (input.listingContext.registrants.some((registrant) => registrant.name.trim().length === 0)) {
    return actionProblem({
      code: "RENTAL_REGISTRANT_NAME_REQUIRED",
      title: "缺少实名信息",
      detail: "请填写所有入场人的姓名。",
    });
  }
  if (
    Number.isNaN(new Date(input.listingContext.serviceStartAt).getTime()) ||
    Number.isNaN(new Date(input.listingContext.serviceEndAt).getTime())
  ) {
    return actionProblem({
      code: "RENTAL_SERVICE_TIME_INVALID",
      title: "服务时间无效",
      detail: "请确认租赁服务开始和结束时间。",
    });
  }
  return null;
}

const pricingSnapshotFromQuote = (input: {
  itemId: string;
  price: CommerceQuote["pricingSnapshot"];
}): OrderPricingSnapshot => {
  const totalFen = input.price.totalFen;
  if (typeof totalFen !== "number") {
    return throwHttpProblem({
      status: 409,
      detail: "报价金额缺失。",
      code: "ORDERING_QUOTE_PRICE_MISSING",
    });
  }
  return {
    currency: input.price.currency,
    itemBreakdowns: [
      {
        itemId: input.itemId,
        resolvedAmountFen: totalFen,
        explanations: input.price.explanations,
      },
    ],
    orderLevelExplanations: [],
    subtotalFen: totalFen,
    totalFen,
  };
};

async function resolveRentalSelectionFromQuote(input: {
  item: ValidatedQuoteItem;
  itemId: string;
}): Promise<SelectedRentalContext> {
  if (input.item.kind !== "FIXED") {
    return throwHttpProblem({
      status: 409,
      detail: "Rental create-order requires a fixed quote item",
    });
  }
  const quote = input.item.quote;
  if (
    quote.offer.productType !== "RENTAL" ||
    quote.quote.listingContextSnapshot.productType !== "RENTAL" ||
    !isRentalSkuFacts(quote.sku.facts)
  ) {
    return throwHttpProblem({
      status: 409,
      detail: "Selected quote is not a Rental quote",
    });
  }
  return {
    offer: quote.offer,
    spu: quote.spu,
    sku: {
      ...quote.sku,
      facts: quote.sku.facts,
    },
    quantity: quote.quote.quantity,
    itemId: input.itemId,
    pricingSnapshot: pricingSnapshotFromQuote({
      itemId: input.itemId,
      price: quote.quote.pricingSnapshot,
    }),
    cancellationPolicySnapshot: await buildCancellationPolicySnapshot(quote.sku),
    listingContext: quote.quote.listingContextSnapshot,
  };
}

const rideQuoteOptionFromOfferQuote = (quote: ValidatedOfferQuote): RideQuoteOption => {
  const fulfillment = quote.quote.fulfillmentQuoteSnapshot;
  if (fulfillment.productType !== "RIDE_HAILING") {
    return throwHttpProblem({
      status: 409,
      detail: "Selected quote is not a RideHailing quote",
    });
  }
  return {
    skuId: quote.sku.id,
    spuId: quote.spu.id,
    name: quote.sku.name,
    providerName: fulfillment.providerName,
    carTypeName: fulfillment.providerVehicleTypeName,
    displayName: fulfillment.displayName,
    providerVehicleTypeCode: fulfillment.providerVehicleTypeCode,
    providerInstanceId: fulfillment.providerInstanceId,
    selected: false,
    selectable: true,
    disabledReason: null,
    estimateAmountFen: fulfillment.estimateAmountFen,
    quoteAmountFen: quote.quote.pricingSnapshot.totalFen,
    priceExplanations: quote.quote.pricingSnapshot.explanations,
  };
};

async function resolveRideSelectionFromQuote(input: {
  item: ValidatedQuoteItem;
  itemId: string;
}): Promise<SelectedRideContext> {
  if (input.item.kind !== "CHOICE_SET") {
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing create-order requires a choice-set quote item",
    });
  }
  const candidates = await Promise.all(
    input.item.candidateQuotes.map(async (quote): Promise<RideCandidateContext> => {
      if (
        quote.offer.productType !== "RIDE_HAILING" ||
        quote.quote.listingContextSnapshot.productType !== "RIDE_HAILING" ||
        quote.quote.fulfillmentQuoteSnapshot.productType !== "RIDE_HAILING" ||
        !isRideHailingSkuFacts(quote.sku.facts)
      ) {
        return throwHttpProblem({
          status: 409,
          detail: "Selected quote is not a RideHailing quote",
        });
      }
      return {
        offer: quote.offer,
        spu: quote.spu,
        sku: {
          ...quote.sku,
          facts: quote.sku.facts,
        },
        quantity: quote.quote.quantity,
        quote: rideQuoteOptionFromOfferQuote(quote),
        offerQuote: quote.quote,
        fulfillmentQuote: quote.quote.fulfillmentQuoteSnapshot,
      };
    }),
  );
  const dispatchCandidate = [...candidates].sort(
    (left, right) =>
      (left.quote.quoteAmountFen ?? Number.POSITIVE_INFINITY) -
      (right.quote.quoteAmountFen ?? Number.POSITIVE_INFINITY),
  )[0];
  if (!dispatchCandidate) {
    return throwHttpProblem({ status: 409, detail: "请选择可用车型" });
  }
  if (
    !dispatchCandidate.offerQuote ||
    dispatchCandidate.offerQuote.listingContextSnapshot.productType !== "RIDE_HAILING"
  ) {
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing quote context is missing",
      code: "ORDERING_QUOTE_CONTEXT_INVALID",
    });
  }
  return {
    offer: dispatchCandidate.offer,
    itemId: input.itemId,
    candidates,
    dispatchCandidate,
    pricingSnapshot: pricingSnapshotFromQuote({
      itemId: input.itemId,
      price: dispatchCandidate.offerQuote.pricingSnapshot,
    }),
    listingContext: dispatchCandidate.offerQuote.listingContextSnapshot,
  };
}

function buildItemSnapshot(input: {
  itemId: string;
  sku: ProductSku;
  quantity: number;
  name?: string;
  cancellationPolicySnapshot?: FixedOrderItemSnapshot["sku"]["cancellationPolicySnapshot"];
}): FixedOrderItemSnapshot {
  return {
    kind: "FIXED",
    itemId: input.itemId,
    sku: {
      id: input.sku.id,
      version: input.sku.version,
      name: input.name ?? input.sku.name,
      presentationSnapshot: input.sku.presentation,
      factsSnapshot: input.sku.facts,
      pricingModelSnapshot: input.sku.pricingModel,
      cancellationPolicySnapshot: input.cancellationPolicySnapshot ?? null,
    },
    quantity: input.quantity,
  };
}

function buildSkuSnapshot(input: {
  sku: ProductSku;
  name?: string;
  cancellationPolicySnapshot?: SkuSnapshot["cancellationPolicySnapshot"];
}): SkuSnapshot {
  return {
    id: input.sku.id,
    version: input.sku.version,
    name: input.name ?? input.sku.name,
    presentationSnapshot: input.sku.presentation,
    factsSnapshot: input.sku.facts,
    pricingModelSnapshot: input.sku.pricingModel,
    cancellationPolicySnapshot: input.cancellationPolicySnapshot ?? null,
  };
}

function buildRideQuoteSnapshot(quote: RideQuoteOption): RideHailingQuoteSnapshot {
  if (typeof quote.quoteAmountFen !== "number") {
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing quote amount is missing",
    });
  }
  return {
    amountFen: quote.quoteAmountFen,
    currency: "CNY",
    displayName: quote.displayName,
    estimateAmountFen: quote.estimateAmountFen,
    quotedAt: new Date().toISOString(),
    explanations: quote.priceExplanations,
  };
}

async function buildRideCandidateSnapshot(
  candidate: RideCandidateContext,
): Promise<RideHailingChoiceSetCandidateSnapshot> {
  return {
    sku: buildSkuSnapshot({
      sku: candidate.sku,
      name: candidate.quote.displayName,
      cancellationPolicySnapshot: await buildCancellationPolicySnapshot(candidate.sku),
    }),
    quoteSnapshot: buildRideQuoteSnapshot(candidate.quote),
  };
}

async function buildRideChoiceSetItemSnapshot(input: {
  selected: SelectedRideContext;
  resolution: RideHailingChoiceSetResolutionSnapshot | null;
}): Promise<ChoiceSetOrderItemSnapshot> {
  return {
    kind: "CHOICE_SET",
    itemId: input.selected.itemId,
    productType: "RIDE_HAILING",
    candidates: await Promise.all(
      input.selected.candidates.map((candidate) => buildRideCandidateSnapshot(candidate)),
    ),
    resolution: input.resolution,
    quantity: 1,
  };
}

function buildTimeout(minutes: number): OrderTimeout {
  const now = new Date();
  return {
    unpaidExpiresAt: new Date(now.getTime() + minutes * 60 * 1000).toISOString(),
    defaultWindowMinutes: minutes,
  };
}

function buildNonExpiringTimeout(): OrderTimeout {
  return {
    unpaidExpiresAt: NON_EXPIRING_UNPAID_EXPIRES_AT,
    defaultWindowMinutes: 0,
  };
}

async function createBaseOrder(input: {
  executor: RepositoryExecutor;
  offer: Offer;
  status?: OrderStatus;
  createdBy: string;
  participants: OrderParticipantSnapshot[];
  items: OrderItemSnapshot[];
  timeout: OrderTimeout;
}) {
  const participantError = validateOrderParticipants({
    participants: input.participants,
    createdBy: input.createdBy,
  });
  if (participantError) {
    return throwHttpProblem({ status: 409, detail: participantError });
  }

  const splitRuleSnapshot = buildEqualRelativeSplitRule(
    input.participants.map((participant) => participant.userId),
  );
  const repo = new TradeOrderRepository(input.executor);
  const order = await repo.create({
    family: input.offer.productType,
    offerId: input.offer.id as OfferId,
    createdBy: input.createdBy as UserId,
    ...(input.status ? { status: input.status } : {}),
    participants: input.participants,
    splitRuleSnapshot,
    items: input.items,
    timeout: input.timeout,
  });

  return {
    order,
    splitRuleSnapshot,
  };
}

async function attachPrIfPresent(input: {
  executor: RepositoryExecutor;
  orderId: TradeOrderId;
  prId?: number | null;
  offerId: OfferId;
  createdBy: string;
}) {
  if (!input.prId) return;
  await attachOrderToPr(
    {
      orderId: input.orderId,
      prId: input.prId as PRId,
      offerId: input.offerId,
      orderCreatedBy: input.createdBy as UserId,
    },
    input.executor,
  );
}

async function createRentalOrderInExecutor(
  input: CreateRentalOrderInput,
  executor: RepositoryExecutor,
) {
  const offer = await resolveOffer(input.offerId);
  if (offer.productType !== "RENTAL") {
    return throwHttpProblem({
      status: 409,
      detail: "Offer is not a Rental offer",
    });
  }

  const base = await createBaseOrder({
    executor,
    offer,
    createdBy: input.createdBy,
    participants: input.participants,
    items: input.items,
    timeout: buildTimeout(DEFAULT_UNPAID_WINDOW_MINUTES),
  });

  const rentalOrderRepo = new RentalOrderRepository(executor);
  await rentalOrderRepo.create({
    orderId: base.order.id,
    serviceStartAt: new Date(input.serviceStartAt),
    serviceEndAt: new Date(input.serviceEndAt),
    contactPhone: input.contactPhone,
    registrants: input.registrants,
  });

  const chargeLines = materializeChargeLinesFromSplitRule({
    totalFen: input.pricingSnapshot.totalFen,
    splitRule: base.splitRuleSnapshot,
  });
  const billResult = await createBillFromSeed(
    {
      sourceOrderId: base.order.id,
      currency: input.pricingSnapshot.currency,
      chargeLines: chargeLines.map((line) => ({
        userId: line.userId,
        amountFen: line.amountFen,
        label: "Rental order charge",
        description: "Rental order share",
      })),
    },
    executor,
  );

  return {
    orderId: base.order.id,
    billId: billResult.billId,
  };
}

export async function createRentalOrder(
  input: CreateRentalOrderInput,
  executor?: RepositoryExecutor,
) {
  if (executor) {
    return createRentalOrderInExecutor(input, executor);
  }

  return db.transaction(async (tx) => createRentalOrderInExecutor(input, tx));
}

async function createRideHailingOrderFoundationInExecutor(
  input: CreateRideHailingOrderFoundationInput,
  executor: RepositoryExecutor,
) {
  const offer = await resolveOffer(input.offerId);
  if (offer.productType !== "RIDE_HAILING") {
    return throwHttpProblem({
      status: 409,
      detail: "Offer is not a RideHailing offer",
    });
  }

  const base = await createBaseOrder({
    executor,
    offer,
    status: "INITIATING",
    createdBy: input.createdBy,
    participants: input.participants,
    items: input.items,
    timeout: buildNonExpiringTimeout(),
  });

  const rideRepo = new RideHailingOrderRepository(executor);
  await rideRepo.create({
    orderId: base.order.id,
    routeSnapshot: input.routeSnapshot,
    departureAt: input.departureAt ? new Date(input.departureAt) : null,
    riders: input.riders,
    contactPhone: input.contactPhone,
    executionPhase: "INITIATING",
  });

  return {
    orderId: base.order.id,
  };
}

export async function createRideHailingOrderFoundation(
  input: CreateRideHailingOrderFoundationInput,
  executor?: RepositoryExecutor,
) {
  if (executor) {
    return createRideHailingOrderFoundationInExecutor(input, executor);
  }

  return db.transaction(async (tx) => createRideHailingOrderFoundationInExecutor(input, tx));
}

async function createRentalOrderBranch(input: {
  command: CreateOrderCommandInput;
  selected: SelectedRentalContext;
  createdBy: string;
}) {
  return db.transaction(async (tx) => {
    const participants = input.selected.listingContext.participants;
    const item = buildItemSnapshot({
      itemId: input.selected.itemId,
      sku: input.selected.sku,
      quantity: input.selected.quantity,
      cancellationPolicySnapshot: input.selected.cancellationPolicySnapshot,
    });
    const base = await createBaseOrder({
      executor: tx,
      offer: input.selected.offer,
      createdBy: input.createdBy,
      participants,
      items: [item],
      timeout: buildTimeout(DEFAULT_UNPAID_WINDOW_MINUTES),
    });

    await attachPrIfPresent({
      executor: tx,
      orderId: base.order.id,
      prId: input.command.prId,
      offerId: input.selected.offer.id as OfferId,
      createdBy: input.createdBy,
    });

    const rentalOrderRepo = new RentalOrderRepository(tx);
    await rentalOrderRepo.create({
      orderId: base.order.id,
      serviceStartAt: new Date(input.selected.listingContext.serviceStartAt),
      serviceEndAt: new Date(input.selected.listingContext.serviceEndAt),
      contactPhone: input.selected.listingContext.contactPhone,
      registrants: input.selected.listingContext.registrants,
    });

    const chargeLines = materializeChargeLinesFromSplitRule({
      totalFen: input.selected.pricingSnapshot.totalFen,
      splitRule: base.splitRuleSnapshot,
    });
    const billResult = await createBillFromSeed(
      {
        sourceOrderId: base.order.id,
        currency: input.selected.pricingSnapshot.currency,
        chargeLines: chargeLines.map((line) => ({
          userId: line.userId,
          amountFen: line.amountFen,
          label: "Rental order charge",
          description: "Rental order share",
        })),
      },
      tx,
    );

    return {
      orderId: base.order.id,
      billId: billResult.billId,
    };
  });
}

async function createRideHailingOrderBranch(input: {
  command: CreateOrderCommandInput;
  selected: SelectedRideContext;
  createdBy: string;
}): Promise<CreateOrderCommandResult> {
  const provider = await providerRepo.findById(
    input.selected.dispatchCandidate.fulfillmentQuote
      .providerInstanceId as RideHailingProviderInstanceId,
  );
  if (!provider) {
    return throwHttpProblem({
      status: 404,
      detail: "RideHailing provider not found",
    });
  }

  const port = createRideHailingProviderPort({ providerInstance: provider });
  let providerOrderIdToCompensate: string | null = null;
  try {
    return await db.transaction(async (tx) => {
      const participants = input.selected.listingContext.participants;
      const unresolvedItem = await buildRideChoiceSetItemSnapshot({
        selected: input.selected,
        resolution: null,
      });
      const base = await createBaseOrder({
        executor: tx,
        offer: input.selected.offer,
        status: "INITIATING",
        createdBy: input.createdBy,
        participants,
        items: [unresolvedItem],
        timeout: buildNonExpiringTimeout(),
      });

      await attachPrIfPresent({
        executor: tx,
        orderId: base.order.id,
        prId: input.command.prId,
        offerId: input.selected.offer.id as OfferId,
        createdBy: input.createdBy,
      });

      const rideRepo = new RideHailingOrderRepository(tx);
      await rideRepo.create({
        orderId: base.order.id,
        routeSnapshot: input.selected.listingContext.route,
        departureAt: input.selected.listingContext.departureAt
          ? new Date(input.selected.listingContext.departureAt)
          : null,
        riders: input.selected.listingContext.riders,
        contactPhone: input.selected.listingContext.contactPhone,
        executionPhase: "INITIATING",
      });

      let created: Awaited<ReturnType<typeof port.createRide>>;
      try {
        created = await port.createRide({
          orderId: base.order.id,
          params: {
            callback_info: buildCaocaoCallbackInfo({ providerInstance: provider }),
            callback_url: resolveCaocaoOrderStatusCallbackUrl(provider),
            car_type: input.selected.dispatchCandidate.fulfillmentQuote.providerVehicleTypeCode,
            price_token: input.selected.dispatchCandidate.fulfillmentQuote.providerQuoteId,
            flat: input.selected.listingContext.route.origin.latitude,
            flng: input.selected.listingContext.route.origin.longitude,
            tlat: input.selected.listingContext.route.destination.latitude,
            tlng: input.selected.listingContext.route.destination.longitude,
          },
        });
      } catch (error) {
        await rideRepo.updateByOrderId(base.order.id, {
          executionPhase: "FAILED",
        });
        const orderRepo = new TradeOrderRepository(tx);
        await orderRepo.updateStatus(base.order.id, "CANCELLED", new Date());
        return {
          outcome: "CANCELLED",
          orderId: base.order.id,
          reason: actionProblem({
            code: "RIDE_HAILING_PROVIDER_CREATE_FAILED",
            title: "下单失败",
            detail:
              error instanceof Error ? error.message : "RideHailing provider order creation failed",
          }),
        };
      }
      providerOrderIdToCompensate = created.providerOrderId;
      const providerBinding: RideHailingProviderBindingSnapshot = {
        providerInstanceId: provider.id,
        providerType: provider.providerType,
        providerOrderId: created.providerOrderId,
      };
      const resolution: RideHailingChoiceSetResolutionSnapshot = {
        sku: buildSkuSnapshot({
          sku: input.selected.dispatchCandidate.sku,
          name: input.selected.dispatchCandidate.quote.displayName,
          cancellationPolicySnapshot: await buildCancellationPolicySnapshot(
            input.selected.dispatchCandidate.sku,
          ),
        }),
        providerVehicleTypeCode:
          input.selected.dispatchCandidate.fulfillmentQuote.providerVehicleTypeCode,
        providerVehicleTypeName:
          input.selected.dispatchCandidate.fulfillmentQuote.providerVehicleTypeName,
        quoteSnapshot: buildRideQuoteSnapshot(input.selected.dispatchCandidate.quote),
        providerBinding,
        source: "DISPATCH_POLICY",
        candidateRelation: "IN_CANDIDATES",
        reason: null,
        resolvedAt: new Date().toISOString(),
      };
      const resolvedItem = await buildRideChoiceSetItemSnapshot({
        selected: input.selected,
        resolution,
      });
      await rideRepo.updateByOrderId(base.order.id, {
        executionPhase: "DISPATCHING",
      });
      const orderRepo = new TradeOrderRepository(tx);
      await orderRepo.replaceItems(base.order.id, [resolvedItem]);
      await orderRepo.updateStatus(base.order.id, "OPEN");

      return {
        outcome: "CREATED",
        orderId: base.order.id,
      };
    });
  } catch (error) {
    if (providerOrderIdToCompensate) {
      try {
        await port.cancelRide({
          providerOrderId: providerOrderIdToCompensate,
          cancelCode: "LOCAL_CREATE_ROLLBACK",
          cancelReason: "Local create-order transaction failed after provider creation",
          whoCancel: "SYSTEM",
        });
      } catch {
        // Best-effort compensation. The original create failure remains the
        // client-visible error and should be handled by provider reconciliation.
      }
    }
    return throwHttpProblem({
      status: 502,
      detail: error instanceof Error ? error.message : "RideHailing provider order creation failed",
    });
  }
}

export async function createOrderCommand(
  input: CreateOrderCommandInput & {
    createdBy: string;
  },
): Promise<CreateOrderCommandResult> {
  const commonProblem = validateCommonCommand({
    command: input,
    createdBy: input.createdBy,
  });
  if (commonProblem) {
    return throwHttpProblem({
      status: 409,
      detail: commonProblem.detail,
      code: commonProblem.code,
    });
  }

  const quoteItems = await resolveQuoteBoundOrderItems(input.items);
  const firstQuoteItem = quoteItems[0];
  if (!firstQuoteItem || quoteItems.length !== 1) {
    return throwHttpProblem({
      status: 400,
      detail: "CreateOrder requires one quote-bound item",
    });
  }
  const firstOffer =
    firstQuoteItem.kind === "FIXED"
      ? firstQuoteItem.quote.offer
      : firstQuoteItem.candidateQuotes[0]?.offer;
  if (!firstOffer) {
    return throwHttpProblem({
      status: 409,
      detail: "报价缺少 Offer 信息。",
      code: "ORDERING_QUOTE_OFFER_INVALID",
    });
  }
  const prProblem = await validatePrAttachmentForEvaluation({
    prId: input.prId,
    offerId: firstOffer.id,
    viewerUserId: input.createdBy,
  });
  if (prProblem) {
    return throwHttpProblem({
      status: prProblem.code === "PR_ORDER_CREATOR_REQUIRED" ? 403 : 409,
      detail: prProblem.detail,
      code: prProblem.code,
    });
  }
  const itemId = randomUUID();

  if (firstQuoteItem.kind === "FIXED") {
    const selected = await resolveRentalSelectionFromQuote({
      item: firstQuoteItem,
      itemId,
    });
    const rentalProblem = validateRentalQuoteContext({
      listingContext: selected.listingContext,
      selectedParticipantCount: selected.sku.facts.participantCount,
    });
    if (rentalProblem) {
      return throwHttpProblem({
        status: 409,
        detail: rentalProblem.detail,
        code: rentalProblem.code,
      });
    }
    const created = await createRentalOrderBranch({
      command: input,
      selected,
      createdBy: input.createdBy,
    });
    return {
      outcome: "CREATED",
      ...created,
    };
  }

  const selected = await resolveRideSelectionFromQuote({
    item: firstQuoteItem,
    itemId,
  });
  return createRideHailingOrderBranch({
    command: input,
    selected,
    createdBy: input.createdBy,
  });
}
