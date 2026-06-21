import { randomUUID } from "node:crypto";
import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import type { Offer, OfferId } from "../../../entities/offer";
import type { PRId } from "../../../entities/partner-request";
import type { ProductSku } from "../../../entities/product-sku";
import type { ProductSpu } from "../../../entities/product-spu";
import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { ProductSkuRepository } from "../../../repositories/ProductSkuRepository";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
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
  createRideHailingProviderPort,
  resolveCaocaoOrderStatusCallbackUrl,
} from "../../ride-hailing";
import { attachOrderToPr } from "../../pr-core";
import type {
  OrderItemSnapshot,
  OrderParticipantSnapshot,
  OrderPricingSnapshot,
  OrderStatus,
  RentalRegistrant,
  RideHailingRiderSnapshot,
  RideHailingRouteSnapshot,
} from "../model";
import {
  buildEqualRelativeSplitRule,
  buildOrderParticipantsFromContext,
  PricingApplication,
  validateOrderParticipants,
} from "../services";
import { evaluateRideOptions, type RideQuoteOption } from "./ride-hailing-ordering-flow";

const offerRepo = new OfferRepository();
const partnerRequestRepo = new PartnerRequestRepository();
const productSpuRepo = new ProductSpuRepository();
const productSkuRepo = new ProductSkuRepository();
const skuCancellationPolicyRepo = new SkuCancellationPolicyRepository();
const providerRepo = new RideHailingProviderInstanceRepository();
const pricingApplication = new PricingApplication();

const DEFAULT_UNPAID_WINDOW_MINUTES = 30;
const DEFAULT_INITIATING_WINDOW_MINUTES = 30;

export type OrderParticipantInput = {
  userId: string;
};

export type OrderItemInput = {
  skuId: number;
  quantity?: number | null;
};

export type RentalProductTypedExtraProperties = {
  serviceStartAt: string;
  serviceEndAt: string;
  contactPhone: string;
  registrants: Array<{
    fullName: string;
    nationalId?: string | null;
  }>;
};

export type RideHailingProductTypedExtraProperties = {
  route: RideHailingRouteSnapshot;
  departureAt?: string | null;
  riders: string[];
  contactPhone: string;
};

export type ProductTypedExtraProperties =
  | RentalProductTypedExtraProperties
  | RideHailingProductTypedExtraProperties;

export type CreateOrderCommandInput = {
  source: {
    offerId: number;
  };
  prId?: number | null;
  participants: OrderParticipantInput[];
  items: OrderItemInput[];
  productTypedExtraProperties: ProductTypedExtraProperties;
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
  providerInstanceId: RideHailingProviderInstanceId;
};

export type OrderingActionProblem = {
  type: string;
  code: string;
  title: string;
  detail: string;
};

export type OrderingActionDecision =
  | {
      allowed: true;
      problem: null;
      nextRelevantAt: string | null;
    }
  | {
      allowed: false;
      problem: OrderingActionProblem;
      nextRelevantAt: string | null;
    };

export type OrderingEvaluation = {
  evaluatedAt: string;
  actions: {
    create_order: OrderingActionDecision;
  };
  price: {
    currency: "CNY";
    totalFen: number | null;
    range?: {
      minFen: number | null;
      maxFen: number | null;
    } | null;
    explanations: PriceExplanation[];
  };
};

type SelectedSkuContext = {
  offer: Offer;
  spu: ProductSpu;
  sku: ProductSku;
  quantity: number;
};

type SelectedRentalContext = Omit<SelectedSkuContext, "sku"> & {
  sku: ProductSku & { facts: RentalSkuFacts };
  itemId: string;
  pricingSnapshot: OrderPricingSnapshot;
  cancellationPolicySnapshot: OrderItemSnapshot["sku"]["cancellationPolicySnapshot"];
  extraProperties: RentalProductTypedExtraProperties;
};

type SelectedRideContext = Omit<SelectedSkuContext, "sku"> & {
  sku: ProductSku & { facts: RideHailingSkuFacts };
  itemId: string;
  pricingSnapshot: OrderPricingSnapshot;
  quote: RideQuoteOption;
  extraProperties: RideHailingProductTypedExtraProperties;
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

const allowed = (): OrderingActionDecision => ({
  allowed: true,
  problem: null,
  nextRelevantAt: null,
});

const blocked = (problem: OrderingActionProblem): OrderingActionDecision => ({
  allowed: false,
  problem,
  nextRelevantAt: null,
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

async function resolveSelectedSku(input: {
  offer: Offer;
  items: OrderItemInput[];
}): Promise<SelectedSkuContext> {
  const firstItem = input.items[0];
  if (!firstItem) {
    return throwHttpProblem({
      status: 400,
      detail: "CreateOrder requires at least one selected item",
    });
  }

  const sku = await productSkuRepo.findById(firstItem.skuId);
  if (!sku || sku.status !== "ACTIVE") {
    return throwHttpProblem({ status: 404, detail: "Selected SKU not found" });
  }
  const spu = await productSpuRepo.findById(sku.spuId);
  if (!spu || spu.status !== "ACTIVE") {
    return throwHttpProblem({ status: 404, detail: "Selected SPU not found" });
  }
  if (spu.productType !== input.offer.productType) {
    return throwHttpProblem({
      status: 409,
      detail: "Selected SKU product type does not match Offer",
    });
  }
  if (!input.offer.spuIds.includes(spu.id)) {
    return throwHttpProblem({
      status: 409,
      detail: "Selected SPU is not part of the active Offer",
    });
  }

  const quantity = firstItem.quantity ?? 1;
  if (quantity !== 1) {
    return throwHttpProblem({
      status: 409,
      detail: "Commerce MVP supports quantity 1 only",
    });
  }

  return {
    offer: input.offer,
    spu,
    sku,
    quantity,
  };
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

function readRentalExtras(
  input: ProductTypedExtraProperties,
): RentalProductTypedExtraProperties {
  if (
    "serviceStartAt" in input &&
    "serviceEndAt" in input &&
    "registrants" in input
  ) {
    return input;
  }
  return throwHttpProblem({
    status: 400,
    detail: "Rental CreateOrder requires Rental extra properties",
  });
}

function readRideExtras(
  input: ProductTypedExtraProperties,
): RideHailingProductTypedExtraProperties {
  if ("route" in input && "riders" in input) {
    return input;
  }
  return throwHttpProblem({
    status: 400,
    detail: "RideHailing CreateOrder requires RideHailing extra properties",
  });
}

function validateCommonCommand(input: {
  command: CreateOrderCommandInput;
  createdBy?: string | null;
}): OrderingActionProblem | null {
  if (input.command.participants.length === 0) {
    return actionProblem({
      code: "ORDER_PARTICIPANTS_REQUIRED",
      title: "无法创建订单",
      detail: "订单至少需要一名参与者。",
    });
  }
  if (input.command.items.length === 0) {
    return actionProblem({
      code: "ORDER_ITEMS_REQUIRED",
      title: "无法创建订单",
      detail: "订单至少需要一个商品项。",
    });
  }
  if (
    input.createdBy &&
    !input.command.participants.some(
      (participant) => participant.userId === input.createdBy,
    )
  ) {
    return actionProblem({
      code: "ORDER_CREATOR_NOT_PARTICIPANT",
      title: "无法创建订单",
      detail: "下单人必须包含在订单参与者中。",
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
      detail: "订单创建需要 PR 处于 READY 状态。",
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

function validateRentalExtras(input: {
  extras: RentalProductTypedExtraProperties;
  participantCount: number;
  selectedParticipantCount: number;
}): OrderingActionProblem | null {
  if (input.selectedParticipantCount !== input.participantCount) {
    return actionProblem({
      code: "RENTAL_SKU_PARTICIPANT_COUNT_MISMATCH",
      title: "规格与人数不一致",
      detail: "选择的租赁规格需要匹配订单参与人数。",
    });
  }
  if (input.extras.contactPhone.trim().length === 0) {
    return actionProblem({
      code: "ORDER_CONTACT_PHONE_REQUIRED",
      title: "缺少联系方式",
      detail: "请填写联系人电话。",
    });
  }
  if (input.extras.registrants.length !== input.participantCount) {
    return actionProblem({
      code: "RENTAL_REGISTRANT_COUNT_MISMATCH",
      title: "实名登记人数不一致",
      detail: "实名登记人数需要匹配订单参与者人数。",
    });
  }
  if (
    input.extras.registrants.some(
      (registrant) => registrant.fullName.trim().length === 0,
    )
  ) {
    return actionProblem({
      code: "RENTAL_REGISTRANT_NAME_REQUIRED",
      title: "缺少实名信息",
      detail: "请填写所有入场人的姓名。",
    });
  }
  if (
    Number.isNaN(new Date(input.extras.serviceStartAt).getTime()) ||
    Number.isNaN(new Date(input.extras.serviceEndAt).getTime())
  ) {
    return actionProblem({
      code: "RENTAL_SERVICE_TIME_INVALID",
      title: "服务时间无效",
      detail: "请确认租赁服务开始和结束时间。",
    });
  }
  return null;
}

function validateRideExtras(
  extras: RideHailingProductTypedExtraProperties,
): OrderingActionProblem | null {
  if (extras.riders.length === 0) {
    return actionProblem({
      code: "RIDE_HAILING_RIDERS_REQUIRED",
      title: "缺少同乘人",
      detail: "至少需要一名同乘人。",
    });
  }
  if (extras.contactPhone.trim().length === 0) {
    return actionProblem({
      code: "ORDER_CONTACT_PHONE_REQUIRED",
      title: "缺少联系方式",
      detail: "请填写联系方式。",
    });
  }
  return null;
}

const rideQuoteBaseAmountFen = (quote: RideQuoteOption): number => {
  if (typeof quote.estimateAmountFen === "number") return quote.estimateAmountFen;
  if (typeof quote.quoteAmountFen === "number") return quote.quoteAmountFen;
  return throwHttpProblem({
    status: 409,
    detail: "RideHailing quote amount is missing",
  });
};

async function resolveRentalSelection(input: {
  command: CreateOrderCommandInput;
  offer: Offer;
  itemId: string;
}): Promise<SelectedRentalContext> {
  const selected = await resolveSelectedSku({
    offer: input.offer,
    items: input.command.items,
  });
  if (!isRentalSkuFacts(selected.sku.facts)) {
    return throwHttpProblem({
      status: 409,
      detail: "Selected SKU is not a Rental SKU",
    });
  }
  const extras = readRentalExtras(input.command.productTypedExtraProperties);
  const pricingSnapshot = pricingApplication.resolve({
    offer: input.offer,
    items: [
      {
        itemId: input.itemId,
        spu: selected.spu,
        sku: selected.sku,
        quantity: selected.quantity,
      },
    ],
    orderContext: {
      serviceTime: extras.serviceStartAt,
    },
  });

  return {
    ...selected,
    sku: {
      ...selected.sku,
      facts: selected.sku.facts,
    },
    itemId: input.itemId,
    pricingSnapshot,
    cancellationPolicySnapshot: await buildCancellationPolicySnapshot(selected.sku),
    extraProperties: extras,
  };
}

async function resolveRideSelection(input: {
  command: CreateOrderCommandInput;
  offer: Offer;
  itemId: string;
}): Promise<SelectedRideContext> {
  const extras = readRideExtras(input.command.productTypedExtraProperties);
  const selected = await resolveSelectedSku({
    offer: input.offer,
    items: input.command.items,
  });
  if (!isRideHailingSkuFacts(selected.sku.facts)) {
    return throwHttpProblem({
      status: 409,
      detail: "Selected SKU is not a RideHailing SKU",
    });
  }

  const options = await evaluateRideOptions({
    offer: input.offer,
    route: extras.route,
    selectedSkuId: selected.sku.id,
  });
  const quote = options.find((option) => option.selected && option.selectable);
  if (!quote || quote.quoteAmountFen === null) {
    return throwHttpProblem({ status: 409, detail: "请选择可用车型" });
  }
  const pricingSnapshot = pricingApplication.resolve({
    offer: input.offer,
    items: [
      {
        itemId: input.itemId,
        spu: selected.spu,
        sku: selected.sku,
        quantity: selected.quantity,
      },
    ],
    orderContext: {
      quoteTotalFen: rideQuoteBaseAmountFen(quote),
    },
  });

  return {
    ...selected,
    sku: {
      ...selected.sku,
      facts: selected.sku.facts,
    },
    itemId: input.itemId,
    pricingSnapshot,
    quote,
    extraProperties: extras,
  };
}

function buildItemSnapshot(input: {
  itemId: string;
  sku: ProductSku;
  quantity: number;
  name?: string;
  cancellationPolicySnapshot?: OrderItemSnapshot["sku"]["cancellationPolicySnapshot"];
}): OrderItemSnapshot {
  return {
    itemId: input.itemId,
    sku: {
      id: input.sku.id,
      version: input.sku.version,
      name: input.name ?? input.sku.name,
      factsSnapshot: input.sku.facts,
      pricingModelSnapshot: input.sku.pricingModel,
      cancellationPolicySnapshot: input.cancellationPolicySnapshot ?? null,
    },
    quantity: input.quantity,
  };
}

function buildParticipantSnapshots(input: {
  command: CreateOrderCommandInput;
  createdBy: string;
}) {
  return buildOrderParticipantsFromContext({
    participants: input.command.participants.map((participant) => ({
      participantId: participant.userId,
      userId: participant.userId,
      joinedVia: "API",
    })),
    createdBy: input.createdBy,
  });
}

function buildTimeout(minutes: number) {
  const now = new Date();
  return {
    unpaidExpiresAt: new Date(now.getTime() + minutes * 60 * 1000).toISOString(),
    defaultWindowMinutes: minutes,
  };
}

async function createBaseOrder(input: {
  executor: RepositoryExecutor;
  offer: Offer;
  status?: OrderStatus;
  createdBy: string;
  participants: ReturnType<typeof buildParticipantSnapshots>;
  items: OrderItemSnapshot[];
  unpaidWindowMinutes: number;
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
    timeout: buildTimeout(input.unpaidWindowMinutes),
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
    unpaidWindowMinutes: DEFAULT_UNPAID_WINDOW_MINUTES,
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
    unpaidWindowMinutes: DEFAULT_INITIATING_WINDOW_MINUTES,
  });

  const rideRepo = new RideHailingOrderRepository(executor);
  await rideRepo.create({
    orderId: base.order.id,
    routeSnapshot: input.routeSnapshot,
    departureAt: input.departureAt ? new Date(input.departureAt) : null,
    riders: input.riders,
    contactPhone: input.contactPhone,
    providerInstanceId: input.providerInstanceId,
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

  return db.transaction(async (tx) =>
    createRideHailingOrderFoundationInExecutor(input, tx),
  );
}

async function createRentalOrderBranch(input: {
  command: CreateOrderCommandInput;
  selected: SelectedRentalContext;
  createdBy: string;
}) {
  return db.transaction(async (tx) => {
    const participants = buildParticipantSnapshots({
      command: input.command,
      createdBy: input.createdBy,
    });
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
      unpaidWindowMinutes: DEFAULT_UNPAID_WINDOW_MINUTES,
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
      serviceStartAt: new Date(input.selected.extraProperties.serviceStartAt),
      serviceEndAt: new Date(input.selected.extraProperties.serviceEndAt),
      contactPhone: input.selected.extraProperties.contactPhone,
      registrants: input.selected.extraProperties.registrants.map((registrant) => ({
        name: registrant.fullName,
        phone: input.selected.extraProperties.contactPhone,
        nationalIdMasked: registrant.nationalId ? "已填写" : null,
      })),
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

const buildRideRiderSnapshots = (
  extras: RideHailingProductTypedExtraProperties,
): RideHailingRiderSnapshot[] =>
  extras.riders.map((userId) => ({
    userId,
    displayName: "同乘人",
    phoneMasked: null,
  }));

async function createRideHailingOrderBranch(input: {
  command: CreateOrderCommandInput;
  selected: SelectedRideContext;
  createdBy: string;
}) {
  const provider = await providerRepo.findById(
    input.selected.sku.facts
      .rideHailingProviderInstanceId as RideHailingProviderInstanceId,
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
      const participants = buildParticipantSnapshots({
        command: input.command,
        createdBy: input.createdBy,
      });
      const item = buildItemSnapshot({
        itemId: input.selected.itemId,
        sku: input.selected.sku,
        quantity: input.selected.quantity,
        name: input.selected.quote.displayName,
      });
      const base = await createBaseOrder({
        executor: tx,
        offer: input.selected.offer,
        status: "INITIATING",
        createdBy: input.createdBy,
        participants,
        items: [item],
        unpaidWindowMinutes: DEFAULT_INITIATING_WINDOW_MINUTES,
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
        routeSnapshot: input.selected.extraProperties.route,
        departureAt: input.selected.extraProperties.departureAt
          ? new Date(input.selected.extraProperties.departureAt)
          : null,
        riders: buildRideRiderSnapshots(input.selected.extraProperties),
        contactPhone: input.selected.extraProperties.contactPhone,
        providerInstanceId: provider.id,
        executionPhase: "INITIATING",
      });

      const created = await port.createRide({
        orderId: base.order.id,
        params: {
          callback_url: resolveCaocaoOrderStatusCallbackUrl(provider),
          car_type: input.selected.sku.facts.providerVehicleTypeCode,
          flat: input.selected.extraProperties.route.origin.latitude,
          flng: input.selected.extraProperties.route.origin.longitude,
          tlat: input.selected.extraProperties.route.destination.latitude,
          tlng: input.selected.extraProperties.route.destination.longitude,
        },
      });
      providerOrderIdToCompensate = created.providerOrderId;
      await rideRepo.updateByOrderId(base.order.id, {
        providerOrderId: created.providerOrderId,
        executionPhase: "DISPATCHING",
      });
      const orderRepo = new TradeOrderRepository(tx);
      await orderRepo.updateStatus(base.order.id, "OPEN");

      return {
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
      detail:
        error instanceof Error
          ? error.message
          : "RideHailing provider order creation failed",
    });
  }
}

export async function evaluateOrdering(
  input: CreateOrderCommandInput & {
    viewerUserId?: string | null;
  },
): Promise<OrderingEvaluation> {
  const commonProblem = validateCommonCommand({
    command: input,
    createdBy: input.viewerUserId,
  });
  const offer = await resolveOffer(input.source.offerId);
  const prProblem = await validatePrAttachmentForEvaluation({
    prId: input.prId,
    offerId: offer.id,
    viewerUserId: input.viewerUserId,
  });
  const itemId = "preview";

  if (offer.productType === "RENTAL") {
    const selected = await resolveRentalSelection({
      command: input,
      offer,
      itemId,
    });
    const rentalProblem = validateRentalExtras({
      extras: selected.extraProperties,
      participantCount: input.participants.length,
      selectedParticipantCount: selected.sku.facts.participantCount,
    });
    return {
      evaluatedAt: new Date().toISOString(),
      actions: {
        create_order: commonProblem
          ? blocked(commonProblem)
          : prProblem
            ? blocked(prProblem)
            : rentalProblem
              ? blocked(rentalProblem)
              : allowed(),
      },
      price: {
        currency: "CNY",
        totalFen: selected.pricingSnapshot.totalFen,
        range: null,
        explanations: [
          ...selected.pricingSnapshot.itemBreakdowns.flatMap(
            (breakdown) => breakdown.explanations,
          ),
          ...selected.pricingSnapshot.orderLevelExplanations,
        ],
      },
    };
  }

  const extras = readRideExtras(input.productTypedExtraProperties);
  const rideProblem = validateRideExtras(extras);
  const options = await evaluateRideOptions({
    offer,
    route: extras.route,
    selectedSkuId: input.items[0]?.skuId ?? null,
  });
  const selectedQuote = options.find(
    (option) => option.selected && option.selectable && option.quoteAmountFen !== null,
  );
  const quoteProblem =
    selectedQuote === undefined
      ? actionProblem({
          code: "RIDE_HAILING_VEHICLE_REQUIRED",
          title: "请选择可用车型",
          detail: "请选择一个可用的网约车车型。",
        })
      : null;
  const selected =
    selectedQuote === undefined
      ? null
      : await resolveSelectedSku({
          offer,
          items: input.items,
        });
  if (selected && !isRideHailingSkuFacts(selected.sku.facts)) {
    return throwHttpProblem({
      status: 409,
      detail: "Selected SKU is not a RideHailing SKU",
    });
  }
  const pricingSnapshot =
    selected && selectedQuote
      ? pricingApplication.resolve({
          offer,
          items: [
            {
              itemId,
              spu: selected.spu,
              sku: selected.sku,
              quantity: selected.quantity,
            },
          ],
          orderContext: {
            quoteTotalFen: rideQuoteBaseAmountFen(selectedQuote),
          },
        })
      : null;
  const selectablePrices = options
    .map((option) => option.quoteAmountFen)
    .filter((value): value is number => typeof value === "number");

  return {
    evaluatedAt: new Date().toISOString(),
    actions: {
      create_order: commonProblem
        ? blocked(commonProblem)
        : prProblem
          ? blocked(prProblem)
          : rideProblem
            ? blocked(rideProblem)
            : quoteProblem
              ? blocked(quoteProblem)
              : allowed(),
    },
    price: {
      currency: "CNY",
      totalFen: pricingSnapshot?.totalFen ?? null,
      range: {
        minFen: selectablePrices.length ? Math.min(...selectablePrices) : null,
        maxFen: selectablePrices.length ? Math.max(...selectablePrices) : null,
      },
      explanations: [
        ...(pricingSnapshot?.itemBreakdowns.flatMap(
          (breakdown) => breakdown.explanations,
        ) ?? []),
        ...(pricingSnapshot?.orderLevelExplanations ?? []),
      ],
    },
  };
}

export async function quoteRideHailingOrderingOptions(input: {
  offerId: number;
  route: RideHailingRouteSnapshot;
}) {
  const offer = await resolveOffer(input.offerId);
  if (offer.productType !== "RIDE_HAILING") {
    return throwHttpProblem({
      status: 409,
      detail: "Offer is not a RideHailing offer",
    });
  }

  return {
    quoteExpiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    options: await evaluateRideOptions({
      offer,
      route: input.route,
    }),
  };
}

export async function createOrderCommand(
  input: CreateOrderCommandInput & {
    createdBy: string;
  },
) {
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

  const offer = await resolveOffer(input.source.offerId);
  const itemId = randomUUID();

  if (offer.productType === "RENTAL") {
    const selected = await resolveRentalSelection({
      command: input,
      offer,
      itemId,
    });
    const rentalProblem = validateRentalExtras({
      extras: selected.extraProperties,
      participantCount: input.participants.length,
      selectedParticipantCount: selected.sku.facts.participantCount,
    });
    if (rentalProblem) {
      return throwHttpProblem({
        status: 409,
        detail: rentalProblem.detail,
        code: rentalProblem.code,
      });
    }
    return createRentalOrderBranch({
      command: input,
      selected,
      createdBy: input.createdBy,
    });
  }

  const selected = await resolveRideSelection({
    command: input,
    offer,
    itemId,
  });
  const rideProblem = validateRideExtras(selected.extraProperties);
  if (rideProblem) {
    return throwHttpProblem({
      status: 409,
      detail: rideProblem.detail,
      code: rideProblem.code,
    });
  }
  return createRideHailingOrderBranch({
    command: input,
    selected,
    createdBy: input.createdBy,
  });
}
