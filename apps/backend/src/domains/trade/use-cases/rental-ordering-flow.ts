import { randomUUID } from "node:crypto";
import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import type { BillLineId } from "../../../entities/bill";
import type { Offer, OfferId } from "../../../entities/offer";
import type { PRId } from "../../../entities/partner-request";
import type { ProductSku } from "../../../entities/product-sku";
import type { ProductSpu } from "../../../entities/product-spu";
import type { TradeOrder, TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { OfferRepository } from "../../../repositories/OfferRepository";
import {
  PartnerRepository,
  type ActiveParticipantSummary,
} from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { ProductSkuRepository } from "../../../repositories/ProductSkuRepository";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
import { RentalOrderRepository } from "../../../repositories/RentalOrderRepository";
import { PaymentTxRepository } from "../../../repositories/PaymentTxRepository";
import { SkuCancellationPolicyRepository } from "../../../repositories/SkuCancellationPolicyRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { confirmRentalBooking } from "../../fulfillment/use-cases/confirm-rental-booking";
import { requestRentalCancellationHandling } from "../../fulfillment";
import { attachOrderToPr } from "../../pr-core";
import { finalizeRentalOrderTermination } from "./finalize-rental-order-termination";
import type {
  FixedTotalPricingModel,
  PlacementBindingRule,
  PriceExplanation,
  ProductPresentation,
  RentalSkuFacts,
  SpuSalesPolicy,
} from "../../merchandising";
import {
  buildPrPlacementRuleContextData,
  resolvePlacementBindings,
} from "../../merchandising";
import { createRentalOrder } from "./create-rental-order";
import { buildRideHailingDetailProjection } from "./ride-hailing-ordering-flow";
import { requestRentalOrderTermination } from "./request-rental-order-termination";
import { deriveBillPaymentState } from "../../payment";
import {
  canRequestOrderTermination,
  buildOrderParticipantsFromContext,
  getOrderItemSkuName,
  PricingApplication,
  resolveRentalTerminationPolicy,
  toRentalOrderModel,
} from "../services";
import { validateRentalServicePolicyAvailability } from "../services/rental-service-policy";
import type {
  OrderItemSnapshot,
  OrderTerminationAttempt,
  RentalRegistrant,
} from "../model";
import type { RideHailingOrderDetailProjection } from "./ride-hailing-ordering-flow";

const offerRepo = new OfferRepository();
const partnerRepo = new PartnerRepository();
const partnerRequestRepo = new PartnerRequestRepository();
const productSpuRepo = new ProductSpuRepository();
const productSkuRepo = new ProductSkuRepository();
const skuCancellationPolicyRepo = new SkuCancellationPolicyRepository();
const tradeOrderRepo = new TradeOrderRepository();
const rentalOrderRepo = new RentalOrderRepository();
const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();
const paymentTxRepo = new PaymentTxRepository();
const pricingApplication = new PricingApplication();

type RentalOrderingFieldKind =
  | "POSITIVE_INT"
  | "PHONE"
  | "PLAIN_STRING"
  | "DATETIME";

type RentalOrderingInputField = {
  key: string;
  label: string;
  valueKind: RentalOrderingFieldKind;
  required: boolean;
  value: unknown | null;
  editable: boolean;
};

type RentalOrderingSkuProjection = {
  skuId: number;
  name: string;
  facts: RentalSkuFacts;
  pricingModel: FixedTotalPricingModel;
  cancellationPolicySummary: Array<{
    visibleLabel: string;
    refundPercent: number;
    requiresOperatorHandling: boolean;
  }>;
  selected: boolean;
  selectable: boolean;
};

type RentalOrderingSpuProjection = {
  spuId: number;
  name: string;
  salesPolicy: SpuSalesPolicy;
  servicePolicy: ProductSpu["servicePolicy"];
  sellingPoints: string[];
  noticeBlocks: ProductPresentation["noticeBlocks"];
  skuOptions: RentalOrderingSkuProjection[];
};

export type RentalOrderingReadModel = {
  productType: "RENTAL";
  source: {
    placementInstanceId: number;
    offerId: number;
    context: {
      kind: "PR";
      prId: number;
    };
  };
  spus: RentalOrderingSpuProjection[];
  participants: Array<{
    userId: string;
    displayName: string;
  }>;
  input: {
    fields: RentalOrderingInputField[];
  };
};

export type RentalOrderingItemInput = {
  skuId: number;
  quantity?: number | null;
};

export type RentalOrderingRegistrantInput = {
  fullName: string;
  nationalId?: string | null;
};

export type RentalOrderingRequestInput = {
  serviceStartAt: string;
  serviceEndAt: string;
  contactPhone: string;
  registrants: RentalOrderingRegistrantInput[];
};

export type RentalOrderingEvaluationInput = {
  offerId: number;
  prId?: number | null;
  participants: Array<{ userId: string }>;
  items: RentalOrderingItemInput[];
  extraProperties: RentalOrderingRequestInput;
};

export type RentalOrderingEvaluation = {
  availability: {
    createOrderEnabled: boolean;
    disabledReason?: string | null;
  };
  pricePreview: {
    amountFen: number | null;
    explanations: PriceExplanation[];
  };
};

export type CommerceOrderDetailProjection = {
  order: {
    id: string;
    family: TradeOrder["family"];
    status: TradeOrder["status"];
    createdBy: string;
    offerId: number;
    items: OrderItemSnapshot[];
    terminationAttempts: OrderTerminationAttempt[];
    serviceStartAt: string | null;
    serviceEndAt: string | null;
    participantCount: number;
    contactPhone: string | null;
    registrants: RentalRegistrant[];
  };
  rideHailing: RideHailingOrderDetailProjection | null;
  bill: {
    id: string;
    status: string;
    currency: "CNY";
    lines: Array<{
      id: string;
      userId: string;
      kind: "CHARGE" | "REFUND";
      amountFen: number;
      label: string;
      description: string | null;
    }>;
  } | null;
  cancellation: {
    canRequest: boolean;
    latestAttempt: OrderTerminationAttempt | null;
  };
  payment: {
    status: "PAID" | "PARTIALLY_PAID" | "UNPAID";
  };
  fulfillment: {
    id: string;
    bookingStatus: string;
    entryGuidance: unknown;
    bookingNote: string | null;
  } | null;
};

type ResolvedPlacementOffer = {
  offer: Offer;
  bindingRules: PlacementBindingRule[];
};

type ResolvedPrContext = {
  prId: PRId;
  createdBy: UserId | null;
  status: string;
  serviceStartAt: string;
  serviceEndAt: string;
  participantCount: number;
  activeParticipants: ActiveParticipantSummary[];
};

type RentalPlacementBindingValues = {
  participantCount: number;
  serviceStartAt: string;
  serviceEndAt: string;
};

type ResolvedOrderingSelection = {
  placement: ResolvedPlacementOffer;
  pr: ResolvedPrContext;
  spu: ProductSpu;
  sku: ProductSku & { facts: RentalSkuFacts; pricingModel: FixedTotalPricingModel };
  quantity: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isActiveNow = (offer: Offer, now = new Date()): boolean => {
  if (offer.status !== "ACTIVE") return false;
  if (offer.startsAt && offer.startsAt > now) return false;
  if (offer.endsAt && offer.endsAt < now) return false;
  return true;
};

const isRentalSkuFacts = (value: unknown): value is RentalSkuFacts =>
  isRecord(value) &&
  value.type === "RENTAL" &&
  typeof value.zoneCode === "string" &&
  typeof value.participantCount === "number" &&
  typeof value.durationMinutes === "number";

const isFixedTotalPricingModel = (
  value: unknown,
): value is FixedTotalPricingModel =>
  isRecord(value) &&
  value.type === "FIXED_TOTAL" &&
  typeof value.amountFen === "number";

const toServiceTime = (
  value: string | null | undefined,
  fallback: string,
): string => {
  if (!value) return fallback;
  return new Date(value).toISOString();
};

function resolveRentalPlacementBindingValues(
  bindings: Record<string, unknown>,
): RentalPlacementBindingValues {
  const participantCount = bindings.participantCount;
  const serviceStartAt = bindings.serviceStartAt;
  const serviceEndAt = bindings.serviceEndAt;

  if (typeof participantCount !== "number") {
    throw new Error("Rental ordering binding participantCount must resolve to a number");
  }
  if (typeof serviceStartAt !== "string") {
    throw new Error("Rental ordering binding serviceStartAt must resolve to a string");
  }
  if (typeof serviceEndAt !== "string") {
    throw new Error("Rental ordering binding serviceEndAt must resolve to a string");
  }

  return {
    participantCount,
    serviceStartAt: new Date(serviceStartAt).toISOString(),
    serviceEndAt: new Date(serviceEndAt).toISOString(),
  };
}

async function resolvePrContext(input: {
  prId: number;
  bindingRules: PlacementBindingRule[];
}): Promise<ResolvedPrContext> {
  const pr = await partnerRequestRepo.findById(input.prId as PRId);
  if (!pr) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(
    pr.id,
  );
  const prContext = buildPrPlacementRuleContextData({
    activeParticipantCount: activeParticipants.length,
    pr,
  });
  let boundValues: RentalPlacementBindingValues;
  try {
    boundValues =
      input.bindingRules.length === 0
        ? {
            participantCount: activeParticipants.length,
            serviceStartAt: toServiceTime(pr.time[0], "2031-01-01T10:00:00.000Z"),
            serviceEndAt: toServiceTime(pr.time[1], "2031-01-01T12:00:00.000Z"),
          }
        : resolveRentalPlacementBindingValues(
            resolvePlacementBindings({
              context: prContext,
              rules: input.bindingRules,
            }),
          );
  } catch (error) {
    return throwHttpProblem({
      status: 409,
      detail: error instanceof Error ? error.message : "Placement binding failed",
    });
  }

  return {
    prId: pr.id,
    createdBy: pr.createdBy,
    status: pr.status,
    serviceStartAt: toServiceTime(
      boundValues.serviceStartAt,
      "2031-01-01T10:00:00.000Z",
    ),
    serviceEndAt: toServiceTime(
      boundValues.serviceEndAt,
      "2031-01-01T12:00:00.000Z",
    ),
    participantCount: boundValues.participantCount,
    activeParticipants,
  };
}

async function resolvePlacementOffer(
  offerId: number,
): Promise<ResolvedPlacementOffer> {
  const offer = await offerRepo.findById(offerId as OfferId);
  if (!offer) {
    return throwHttpProblem({ status: 404, detail: "Offer not found" });
  }
  if (offer.productType !== "RENTAL" || !isActiveNow(offer)) {
    return throwHttpProblem({
      status: 409,
      detail: "Offer is not available for Rental ordering",
    });
  }

  return {
    offer,
    bindingRules: [],
  };
}

async function listOfferRentalSpus(
  offer: Offer,
  participantCount: number,
): Promise<RentalOrderingSpuProjection[]> {
  const spus = await Promise.all(
    offer.spuIds.map((spuId) => productSpuRepo.findById(spuId)),
  );

  const result: RentalOrderingSpuProjection[] = [];
  for (const maybeSpu of spus) {
    if (!maybeSpu || maybeSpu.status !== "ACTIVE") continue;
    if (maybeSpu.productType !== "RENTAL") continue;

    const skus = await productSkuRepo.listBySpuId(maybeSpu.id);
    const skuOptions: RentalOrderingSkuProjection[] = [];
    for (const sku of skus) {
      if (sku.status !== "ACTIVE") continue;
      if (!isRentalSkuFacts(sku.facts) || !isFixedTotalPricingModel(sku.pricingModel)) {
        continue;
      }

      const selectable = sku.facts.participantCount === participantCount;
      const cancellationPolicySnapshot = await buildCancellationPolicySnapshot(sku);
      skuOptions.push({
        skuId: sku.id,
        name: sku.name,
        facts: sku.facts,
        pricingModel: sku.pricingModel,
        cancellationPolicySummary:
          cancellationPolicySnapshot?.tiers.map((tier) => ({
            visibleLabel: tier.visibleLabel,
            refundPercent: tier.refundPercent,
            requiresOperatorHandling: tier.requiresOperatorHandling,
          })) ?? [],
        selected: selectable,
        selectable,
      });
    }

    result.push({
      spuId: maybeSpu.id,
      name: maybeSpu.name,
      salesPolicy: maybeSpu.salesPolicy,
      servicePolicy: maybeSpu.servicePolicy,
      sellingPoints: maybeSpu.presentation.sellingPoints,
      noticeBlocks: maybeSpu.presentation.noticeBlocks,
      skuOptions,
    });
  }

  return result;
}

async function resolveSelection(
  input: RentalOrderingEvaluationInput,
): Promise<ResolvedOrderingSelection> {
  const placement = await resolvePlacementOffer(input.offerId);
  if (!input.prId) {
    return throwHttpProblem({ status: 400, detail: "PR order requires prId" });
  }
  const pr = await resolvePrContext({
    prId: input.prId,
    bindingRules: placement.bindingRules,
  });
  const firstItem = input.items[0];
  if (!firstItem) {
    return throwHttpProblem({ status: 400, detail: "Rental order requires one selected SKU" });
  }

  const sku = await productSkuRepo.findById(firstItem.skuId);
  if (!sku || sku.status !== "ACTIVE") {
    return throwHttpProblem({ status: 404, detail: "Rental SKU not found" });
  }
  const spu = await productSpuRepo.findById(sku.spuId);
  if (!spu || spu.status !== "ACTIVE" || spu.productType !== "RENTAL") {
    return throwHttpProblem({ status: 404, detail: "Rental SPU not found" });
  }
  if (!placement.offer.spuIds.includes(spu.id)) {
    return throwHttpProblem({
      status: 409,
      detail: "Selected SPU is not part of the active Offer",
    });
  }

  if (!isRentalSkuFacts(sku.facts) || !isFixedTotalPricingModel(sku.pricingModel)) {
    return throwHttpProblem({
      status: 409,
      detail: "Selected SKU is not a fixed-price Rental SKU",
    });
  }
  if (sku.facts.participantCount !== pr.participantCount) {
    return throwHttpProblem({
      status: 409,
      detail: "Selected SKU does not match current PR participant count",
    });
  }

  const quantity = firstItem.quantity ?? 1;
  if (quantity !== 1) {
    return throwHttpProblem({
      status: 409,
      detail: "Rental MVP supports quantity 1 only",
    });
  }

  return {
    placement,
    pr,
    spu,
    sku: {
      ...sku,
      facts: sku.facts,
      pricingModel: sku.pricingModel,
    },
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

function validateRentalRequest(input: {
  request: RentalOrderingRequestInput;
  pr: ResolvedPrContext;
  servicePolicy: ProductSpu["servicePolicy"];
}): string | null {
  if (input.request.contactPhone.trim().length === 0) {
    return "请填写联系人电话";
  }
  if (input.request.registrants.length !== input.pr.participantCount) {
    return "实名登记人数需要匹配当前 PR 参与人数";
  }
  if (
    new Date(input.request.serviceStartAt).toISOString() !== input.pr.serviceStartAt ||
    new Date(input.request.serviceEndAt).toISOString() !== input.pr.serviceEndAt
  ) {
    return "预约时间需要匹配当前 PR 时间";
  }
  if (input.servicePolicy.type === "RENTAL") {
    const servicePolicyError = validateRentalServicePolicyAvailability({
      servicePolicy: input.servicePolicy,
      serviceStartAt: input.pr.serviceStartAt,
      serviceEndAt: input.pr.serviceEndAt,
    });
    if (servicePolicyError) return servicePolicyError;
  }
  if (
    input.request.registrants.some(
      (registrant) => registrant.fullName.trim().length === 0,
    )
  ) {
    return "请填写所有参与者姓名";
  }

  return null;
}

export async function getRentalOrderingFromPlacement(input: {
  offerId: number;
  prId: number;
}): Promise<RentalOrderingReadModel> {
  const placement = await resolvePlacementOffer(input.offerId);
  const pr = await resolvePrContext({
    prId: input.prId,
    bindingRules: placement.bindingRules,
  });
  const spus = await listOfferRentalSpus(placement.offer, pr.participantCount);

  return {
    productType: "RENTAL",
    source: {
      placementInstanceId: 0,
      offerId: placement.offer.id,
      context: {
        kind: "PR",
        prId: pr.prId,
      },
    },
    spus,
    participants: pr.activeParticipants.map((participant) => ({
      userId: participant.userId,
      displayName: participant.nickname ?? "参与者",
    })),
    input: {
      fields: [
        {
          key: "participantCount",
          label: "参与人数",
          valueKind: "POSITIVE_INT",
          required: true,
          value: pr.participantCount,
          editable: false,
        },
        {
          key: "serviceStartAt",
          label: "开始时间",
          valueKind: "DATETIME",
          required: true,
          value: pr.serviceStartAt,
          editable: false,
        },
        {
          key: "serviceEndAt",
          label: "结束时间",
          valueKind: "DATETIME",
          required: true,
          value: pr.serviceEndAt,
          editable: false,
        },
        {
          key: "contactPhone",
          label: "联系人电话",
          valueKind: "PHONE",
          required: true,
          value: null,
          editable: true,
        },
        {
          key: "registrants",
          label: "实名登记",
          valueKind: "PLAIN_STRING",
          required: true,
          value: null,
          editable: true,
        },
      ],
    },
  };
}

export async function evaluateRentalOrdering(
  input: RentalOrderingEvaluationInput & {
    viewerUserId?: string | null;
  },
): Promise<RentalOrderingEvaluation> {
  const selection = await resolveSelection(input);
  const prAttachPrecheckError =
    selection.pr.status !== "READY"
      ? "订单创建需要 PR 处于 READY 状态"
      : !input.viewerUserId || selection.pr.createdBy !== input.viewerUserId
        ? "仅 PR 创建者可以创建订单"
        : null;
  const validationError = validateRentalRequest({
    request: input.extraProperties,
    pr: selection.pr,
    servicePolicy: selection.spu.servicePolicy,
  });
  const pricingSnapshot = pricingApplication.resolve({
    offer: selection.placement.offer,
    items: [
      {
        itemId: "preview",
        spu: selection.spu,
        sku: selection.sku,
        quantity: selection.quantity,
      },
    ],
    orderContext: {
      serviceTime: input.extraProperties.serviceStartAt,
    },
  });

  return {
    availability: {
      createOrderEnabled: prAttachPrecheckError === null && validationError === null,
      disabledReason: prAttachPrecheckError ?? validationError,
    },
    pricePreview: {
      amountFen: pricingSnapshot.totalFen,
      explanations: [
        ...pricingSnapshot.itemBreakdowns.flatMap((item) => item.explanations),
        ...pricingSnapshot.orderLevelExplanations,
      ],
    },
  };
}

export async function createRentalOrderCommand(
  input: RentalOrderingEvaluationInput & {
    createdBy: string;
  },
) {
  const selection = await resolveSelection(input);
  const validationError = validateRentalRequest({
    request: input.extraProperties,
    pr: selection.pr,
    servicePolicy: selection.spu.servicePolicy,
  });
  if (validationError) {
    return throwHttpProblem({ status: 409, detail: validationError });
  }

  const itemId = randomUUID();
  const cancellationPolicySnapshot = await buildCancellationPolicySnapshot(
    selection.sku,
  );
  const pricingSnapshot = pricingApplication.resolve({
    offer: selection.placement.offer,
    items: [
      {
        itemId,
        spu: selection.spu,
        sku: selection.sku,
        quantity: selection.quantity,
      },
    ],
    orderContext: {
      serviceTime: input.extraProperties.serviceStartAt,
    },
  });

  const participants = buildOrderParticipantsFromContext({
    participants: input.participants.map((participant) => ({
      participantId: participant.userId,
      userId: participant.userId,
      joinedVia: "API",
    })),
    createdBy: input.createdBy,
  });

  return db.transaction(async (tx) => {
    const result = await createRentalOrder(
      {
        createdBy: input.createdBy,
        participants,
        offerId: selection.placement.offer.id as OfferId,
        items: [
          {
            itemId,
            sku: {
              id: selection.sku.id,
              version: selection.sku.version,
              name: selection.sku.name,
              factsSnapshot: selection.sku.facts,
              pricingModelSnapshot: selection.sku.pricingModel,
              cancellationPolicySnapshot,
            },
            quantity: selection.quantity,
          },
        ],
        pricingSnapshot,
        serviceStartAt: selection.pr.serviceStartAt,
        serviceEndAt: selection.pr.serviceEndAt,
        contactPhone: input.extraProperties.contactPhone,
        registrants: input.extraProperties.registrants.map((registrant) => ({
          name: registrant.fullName,
          phone: input.extraProperties.contactPhone,
          nationalIdMasked: registrant.nationalId ? "已填写" : null,
        })),
      },
      tx,
    );

    await attachOrderToPr(
      {
        orderId: result.orderId as TradeOrderId,
        prId: selection.pr.prId,
        offerId: selection.placement.offer.id as OfferId,
        orderCreatedBy: input.createdBy as UserId,
      },
      tx,
    );

    return result;
  });
}

export async function getCommerceOrderDetail(input: {
  orderId: string;
  viewerUserId: string | null;
}): Promise<CommerceOrderDetailProjection> {
  if (!input.viewerUserId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }

  const order = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }
  const canView =
    order.createdBy === input.viewerUserId ||
    order.participants.some((participant) => participant.userId === input.viewerUserId);
  if (!canView) {
    return throwHttpProblem({ status: 403, detail: "Order is not accessible" });
  }

  const rideHailingDetail =
    order.family === "RIDE_HAILING"
      ? await buildRideHailingDetailProjection({ order })
      : null;
  const bill = await billRepo.findBySourceOrderId(order.id);
  const billLines = bill ? await billLineRepo.listByBillId(bill.id) : [];
  const paymentTxs = bill
    ? await paymentTxRepo.listByBillLineIds(
        billLines.map((line) => line.id as BillLineId),
      )
    : [];
  const paymentState = bill
    ? deriveBillPaymentState({ lines: billLines, txs: paymentTxs })
    : null;
  const rentalOrder =
    order.family === "RENTAL"
      ? await rentalOrderRepo.findByOrderId(order.id)
      : null;
  if (order.family === "RENTAL" && !rentalOrder) {
    return throwHttpProblem({
      status: 500,
      detail: "Rental order facts are missing",
    });
  }

  return {
    order: {
      id: order.id,
      family: order.family,
      status: order.status,
      createdBy: order.createdBy,
      offerId: order.offerId,
      items: order.items,
      terminationAttempts: order.terminationAttempts,
      serviceStartAt: rentalOrder?.serviceStartAt.toISOString() ?? null,
      serviceEndAt: rentalOrder?.serviceEndAt.toISOString() ?? null,
      participantCount: order.participants.length,
      contactPhone: rentalOrder?.contactPhone ?? null,
      registrants: rentalOrder?.registrants ?? [],
    },
    rideHailing: rideHailingDetail,
    bill: bill
      ? {
          id: bill.id,
          status: bill.status,
          currency: bill.currency,
          lines: billLines.map((line) => ({
            id: line.id,
            userId: line.userId,
            kind: line.kind,
            amountFen: line.amountFen,
            label: line.label,
            description: line.description,
          })),
      }
      : null,
    cancellation: {
      canRequest: canRequestOrderTermination({
        status: order.status,
        terminationAttempts: order.terminationAttempts,
      }),
      latestAttempt: order.terminationAttempts.at(-1) ?? null,
    },
    payment: {
      status: paymentState?.allChargesPaid
        ? "PAID"
        : paymentState && paymentState.paidChargeFen > 0
          ? "PARTIALLY_PAID"
          : "UNPAID",
    },
    fulfillment: rentalOrder
      ? {
          id: rentalOrder.orderId,
          bookingStatus: rentalOrder.bookingStatus,
          entryGuidance: rentalOrder.entryGuidance,
          bookingNote: rentalOrder.bookingNote,
        }
      : null,
  };
}

export async function cancelRentalOrderFromOrderDetail(input: {
  orderId: string;
  actorUserId: string;
}) {
  const order = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }
  if (order.family !== "RENTAL") {
    return throwHttpProblem({
      status: 409,
      detail: "Only Rental orders can use this cancellation flow",
    });
  }
  if (order.createdBy !== input.actorUserId) {
    return throwHttpProblem({
      status: 403,
      detail: "Only order creator can cancel this order",
    });
  }
  if (order.status !== "OPEN") {
    return throwHttpProblem({
      status: 409,
      detail: "Order cannot be cancelled from its current status",
    });
  }

  const rentalOrderRecord = await rentalOrderRepo.findByOrderId(order.id);
  if (!rentalOrderRecord) {
    return throwHttpProblem({
      status: 500,
      detail: "Rental order facts are missing",
    });
  }
  const rentalOrder = toRentalOrderModel(order, rentalOrderRecord);
  const requestedAt = new Date().toISOString();
  const policyResolution = resolveRentalTerminationPolicy(rentalOrder, {
    attemptId: "preview",
    requestedAt,
  });
  const bill = await billRepo.findBySourceOrderId(order.id);
  const billLines = bill ? await billLineRepo.listByBillId(bill.id) : [];
  const paymentTxs = await paymentTxRepo.listByBillLineIds(
    billLines.map((line) => line.id as BillLineId),
  );
  const paymentState = deriveBillPaymentState({
    lines: billLines,
    txs: paymentTxs,
  });
  const requiresFulfillmentGate =
    policyResolution.requiresOperatorHandling && paymentState.paidChargeFen > 0;

  const requested = await requestRentalOrderTermination({
    orderId: input.orderId,
    requestedBy: input.actorUserId,
    requestedAt,
    resolutionPath: requiresFulfillmentGate
      ? "RENTAL_FULFILLMENT"
      : "TRADE_LOCAL",
  });

  if (requiresFulfillmentGate) {
    await requestRentalCancellationHandling({
      fulfillmentId: rentalOrderRecord.orderId,
      cancellationNote: "用户取消订单，等待履约处理",
    });

    return {
      orderId: input.orderId,
      attemptId: requested.attemptId,
      status: order.status,
      effectKind: "NONE" as const,
      effectAmountFen: 0,
      refunds: [],
    };
  }

  return finalizeRentalOrderTermination({
    orderId: input.orderId,
    attemptId: requested.attemptId,
    decision: {
      outcome: "APPROVED",
      reason: "用户取消订单",
    },
  });
}

export async function simulateRentalBookingConfirmation(input: {
  orderId: string;
  actorUserId: string;
}) {
  const order = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }
  if (order.createdBy !== input.actorUserId) {
    return throwHttpProblem({
      status: 403,
      detail: "Only order creator can progress fake fulfillment",
    });
  }

  const rentalOrder = await rentalOrderRepo.findByOrderId(order.id);
  if (!rentalOrder) {
    return throwHttpProblem({
      status: 409,
      detail: "Rental order facts are missing",
    });
  }

  return confirmRentalBooking({
    fulfillmentId: rentalOrder.orderId,
    bookingNote: "Phase 3 fake rental booking confirmation",
  });
}
