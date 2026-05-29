import { randomUUID } from "node:crypto";
import { throwHttpProblem } from "../../../lib/problem-details";
import type { BillLineId } from "../../../entities/bill";
import type { Offer, OfferId } from "../../../entities/offer";
import type { PRId } from "../../../entities/partner-request";
import type { ProductSku } from "../../../entities/product-sku";
import type { ProductSpu } from "../../../entities/product-spu";
import type { RentalFulfillmentId } from "../../../entities/rental-fulfillment";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PlacementRepository } from "../../../repositories/PlacementRepository";
import { PRAttachedOrderRepository } from "../../../repositories/PRAttachedOrderRepository";
import { ProductSkuRepository } from "../../../repositories/ProductSkuRepository";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
import { RentalFulfillmentRepository } from "../../../repositories/RentalFulfillmentRepository";
import { PaymentTxRepository } from "../../../repositories/PaymentTxRepository";
import { SkuCancellationPolicyRepository } from "../../../repositories/SkuCancellationPolicyRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { confirmRentalBooking } from "../../fulfillment/use-cases/confirm-rental-booking";
import { finalizeRentalOrderTermination } from "./finalize-rental-order-termination";
import type {
  FixedTotalPricingModel,
  PriceExplanation,
  ProductPresentation,
  RentalSkuFacts,
  SpuSalesPolicy,
} from "../../merchandising";
import { createRentalOrder } from "./create-rental-order";
import { requestRentalOrderTermination } from "./request-rental-order-termination";
import { deriveBillPaymentState } from "../../payment";

const offerRepo = new OfferRepository();
const placementRepo = new PlacementRepository();
const partnerRepo = new PartnerRepository();
const partnerRequestRepo = new PartnerRequestRepository();
const productSpuRepo = new ProductSpuRepository();
const productSkuRepo = new ProductSkuRepository();
const skuCancellationPolicyRepo = new SkuCancellationPolicyRepository();
const attachedOrderRepo = new PRAttachedOrderRepository();
const tradeOrderRepo = new TradeOrderRepository();
const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();
const rentalFulfillmentRepo = new RentalFulfillmentRepository();
const paymentTxRepo = new PaymentTxRepository();

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
    context: {
      kind: "PR";
      prId: number;
    };
  };
  spus: RentalOrderingSpuProjection[];
  input: {
    fields: RentalOrderingInputField[];
  };
};

export type RentalOrderingItemInput = {
  spuId: number;
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
  placementInstanceId: number;
  context: {
    kind: "PR";
    prId: number;
  };
  items: RentalOrderingItemInput[];
  request: RentalOrderingRequestInput;
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

export type CommercePlacementProjection =
  | {
      placement: {
        id: number;
        slotKey: "PR_UTILITY_ACTIONS_BUTTON";
        type: "BUTTON";
        creative: {
          title: string;
          subtitle?: string | null;
          ctaLabel: string;
        };
        target:
          | {
              kind: "ORDER";
              orderId: string;
              href: string;
            }
          | {
              kind: "ORDERING";
              placementInstanceId: number;
              context: {
                kind: "PR";
                prId: number;
              };
              href: string;
            };
      };
    }
  | {
      placement: null;
    };

type ResolvedPlacementOffer = {
  placementId: number;
  offer: Offer;
};

type ResolvedPrContext = {
  prId: PRId;
  createdBy: UserId | null;
  status: string;
  serviceStartAt: string;
  serviceEndAt: string;
  participantCount: number;
};

type ResolvedOrderingSelection = {
  placement: ResolvedPlacementOffer;
  pr: ResolvedPrContext;
  spu: ProductSpu;
  sku: ProductSku & { facts: RentalSkuFacts; pricingModel: FixedTotalPricingModel };
  quantity: number;
  amountFen: number;
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

async function resolvePrContext(prId: number): Promise<ResolvedPrContext> {
  const pr = await partnerRequestRepo.findById(prId as PRId);
  if (!pr) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(
    pr.id,
  );
  const [startAt, endAt] = pr.time;

  return {
    prId: pr.id,
    createdBy: pr.createdBy,
    status: pr.status,
    serviceStartAt: toServiceTime(startAt, "2031-01-01T10:00:00.000Z"),
    serviceEndAt: toServiceTime(endAt, "2031-01-01T12:00:00.000Z"),
    participantCount: activeParticipants.length,
  };
}

async function resolvePlacementOffer(
  placementInstanceId: number,
): Promise<ResolvedPlacementOffer> {
  const placement = await placementRepo.findById(placementInstanceId);
  if (!placement) {
    return throwHttpProblem({ status: 404, detail: "Placement not found" });
  }
  if (placement.status !== "ACTIVE") {
    return throwHttpProblem({ status: 409, detail: "Placement is not active" });
  }
  if (placement.target.kind !== "OFFER") {
    return throwHttpProblem({
      status: 409,
      detail: "Placement does not target ordering",
    });
  }

  const offer = await offerRepo.findById(placement.target.offerId as OfferId);
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
    placementId: placement.id,
    offer,
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
  const placement = await resolvePlacementOffer(input.placementInstanceId);
  const pr = await resolvePrContext(input.context.prId);
  const firstItem = input.items[0];
  if (!firstItem) {
    return throwHttpProblem({ status: 400, detail: "Rental order requires one selected SKU" });
  }

  const spu = await productSpuRepo.findById(firstItem.spuId);
  if (!spu || spu.status !== "ACTIVE" || spu.productType !== "RENTAL") {
    return throwHttpProblem({ status: 404, detail: "Rental SPU not found" });
  }
  if (!placement.offer.spuIds.includes(spu.id)) {
    return throwHttpProblem({
      status: 409,
      detail: "Selected SPU is not part of the active Offer",
    });
  }

  const sku = await productSkuRepo.findById(firstItem.skuId);
  if (!sku || sku.status !== "ACTIVE" || sku.spuId !== spu.id) {
    return throwHttpProblem({ status: 404, detail: "Rental SKU not found" });
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
    amountFen: sku.pricingModel.amountFen,
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

function buildBasePriceExplanation(input: {
  skuId: number;
  skuName: string;
  amountFen: number;
}): PriceExplanation {
  return {
    phase: "SKU_BASE",
    sourceType: "PRICING_MODEL",
    sourceId: `sku:${input.skuId}`,
    label: input.skuName,
    description: "固定总价",
    deltaFen: input.amountFen,
    resultAmountFen: input.amountFen,
  };
}

function validateRentalRequest(input: {
  request: RentalOrderingRequestInput;
  pr: ResolvedPrContext;
  viewerUserId?: string | null;
}): string | null {
  if (input.pr.status !== "READY") {
    return "订单创建需要 PR 处于 READY 状态";
  }
  if (!input.viewerUserId || input.pr.createdBy !== input.viewerUserId) {
    return "仅 PR 创建者可以创建订单";
  }
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
  if (
    input.request.registrants.some(
      (registrant) => registrant.fullName.trim().length === 0,
    )
  ) {
    return "请填写所有参与者姓名";
  }

  return null;
}

export async function resolveCommercePlacementForPr(input: {
  prId: number;
  viewerUserId: string | null;
}): Promise<CommercePlacementProjection> {
  if (!input.viewerUserId) return { placement: null };

  const pr = await partnerRequestRepo.findById(input.prId as PRId);
  if (!pr) return { placement: null };

  const participant = await partnerRepo.findActiveByPrIdAndUserId(
    pr.id,
    input.viewerUserId as UserId,
  );
  if (!participant) return { placement: null };

  const placements = await placementRepo.listAll();
  for (const placement of placements) {
    if (
      placement.status !== "ACTIVE" ||
      placement.slotKey !== "PR_UTILITY_ACTIONS_BUTTON" ||
      placement.placementType !== "BUTTON" ||
      placement.target.kind !== "OFFER"
    ) {
      continue;
    }

    const offer = await offerRepo.findById(placement.target.offerId as OfferId);
    if (!offer || offer.productType !== "RENTAL" || !isActiveNow(offer)) {
      continue;
    }

    const existing = await attachedOrderRepo.findActiveByPrAndOffer(
      pr.id,
      offer.id,
    );
    if (existing) {
      return {
        placement: {
          id: placement.id,
          slotKey: placement.slotKey,
          type: placement.placementType,
          creative: placement.creative,
          target: {
            kind: "ORDER",
            orderId: existing.orderId,
            href: `/orders/${existing.orderId}`,
          },
        },
      };
    }

    return {
      placement: {
        id: placement.id,
        slotKey: placement.slotKey,
        type: placement.placementType,
        creative: placement.creative,
        target: {
          kind: "ORDERING",
          placementInstanceId: placement.id,
          context: {
            kind: "PR",
            prId: pr.id,
          },
          href: `/ordering/from-placement?placementInstanceId=${placement.id}&context=pr&contextId=${pr.id}`,
        },
      },
    };
  }

  return { placement: null };
}

export async function getRentalOrderingFromPlacement(input: {
  placementInstanceId: number;
  prId: number;
}): Promise<RentalOrderingReadModel> {
  const placement = await resolvePlacementOffer(input.placementInstanceId);
  const pr = await resolvePrContext(input.prId);
  const spus = await listOfferRentalSpus(placement.offer, pr.participantCount);

  return {
    productType: "RENTAL",
    source: {
      placementInstanceId: placement.placementId,
      context: {
        kind: "PR",
        prId: pr.prId,
      },
    },
    spus,
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
  const validationError = validateRentalRequest({
    request: input.request,
    pr: selection.pr,
    viewerUserId: input.viewerUserId ?? null,
  });
  const explanation = buildBasePriceExplanation({
    skuId: selection.sku.id,
    skuName: selection.sku.name,
    amountFen: selection.amountFen,
  });

  return {
    availability: {
      createOrderEnabled: validationError === null,
      disabledReason: validationError,
    },
    pricePreview: {
      amountFen: selection.amountFen,
      explanations: [explanation],
    },
  };
}

export async function createRentalOrderFromPlacement(
  input: RentalOrderingEvaluationInput & {
    createdBy: string;
  },
) {
  const selection = await resolveSelection(input);
  const validationError = validateRentalRequest({
    request: input.request,
    pr: selection.pr,
    viewerUserId: input.createdBy,
  });
  if (validationError) {
    return throwHttpProblem({ status: 409, detail: validationError });
  }

  const itemId = randomUUID();
  const cancellationPolicySnapshot = await buildCancellationPolicySnapshot(
    selection.sku,
  );
  const explanation = buildBasePriceExplanation({
    skuId: selection.sku.id,
    skuName: selection.sku.name,
    amountFen: selection.amountFen,
  });

  return createRentalOrder({
    prId: selection.pr.prId,
    createdBy: input.createdBy,
    offerSnapshot: {
      offerId: selection.placement.offer.id,
      termsVersion: selection.placement.offer.termsVersion,
      productType: "RENTAL",
    },
    items: [
      {
        itemId,
        spuId: selection.spu.id,
        spuVersion: selection.spu.version,
        spuName: selection.spu.name,
        skuId: selection.sku.id,
        skuVersion: selection.sku.version,
        skuName: selection.sku.name,
        quantity: selection.quantity,
        skuFactsSnapshot: selection.sku.facts,
        pricingModelSnapshot: selection.sku.pricingModel,
        cancellationPolicySnapshot,
      },
    ],
    pricingSnapshot: {
      currency: "CNY",
      itemBreakdowns: [
        {
          itemId,
          resolvedAmountFen: selection.amountFen,
          explanations: [explanation],
        },
      ],
      orderLevelExplanations: [],
      subtotalFen: selection.amountFen,
      totalFen: selection.amountFen,
    },
    selectedZoneCodes: [selection.sku.facts.zoneCode],
    serviceStartAt: selection.pr.serviceStartAt,
    serviceEndAt: selection.pr.serviceEndAt,
    participantCount: selection.pr.participantCount,
    contactPhone: input.request.contactPhone,
    registrants: input.request.registrants.map((registrant) => ({
      name: registrant.fullName,
      phone: input.request.contactPhone,
      nationalIdMasked: registrant.nationalId ? "已填写" : null,
    })),
  });
}

export async function getCommerceOrderDetail(input: {
  orderId: string;
  viewerUserId: string | null;
}) {
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
  const fulfillment = await rentalFulfillmentRepo.findByOrderId(order.id);

  return {
    order: {
      id: order.id,
      family: order.family,
      status: order.status,
      createdBy: order.createdBy,
      offerSnapshot: order.offerSnapshot,
      items: order.items,
      pricingSnapshot: order.pricingSnapshot,
      terminationAttempts: order.terminationAttempts,
      serviceStartAt: order.serviceStartAt?.toISOString() ?? null,
      serviceEndAt: order.serviceEndAt?.toISOString() ?? null,
      participantCount: order.participantCount,
      contactPhone: order.contactPhone,
      registrants: order.registrants,
    },
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
      canRequest: order.status === "OPEN",
      latestAttempt: order.terminationAttempts.at(-1) ?? null,
    },
    payment: {
      status: paymentState?.allChargesPaid
        ? "PAID"
        : paymentState && paymentState.paidChargeFen > 0
          ? "PARTIALLY_PAID"
          : "UNPAID",
    },
    fulfillment: fulfillment
      ? {
          id: fulfillment.id,
          lifecycleStatus: fulfillment.lifecycleStatus,
          bookingStatus: fulfillment.bookingStatus,
          entryGuidance: fulfillment.entryGuidance,
          bookingNote: fulfillment.bookingNote,
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

  const requested = await requestRentalOrderTermination({
    orderId: input.orderId,
    requestedBy: input.actorUserId,
  });

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

  const fulfillment = await rentalFulfillmentRepo.findByOrderId(order.id);
  if (!fulfillment) {
    return throwHttpProblem({
      status: 409,
      detail: "Rental fulfillment has not been created",
    });
  }

  return confirmRentalBooking({
    fulfillmentId: fulfillment.id as RentalFulfillmentId,
    bookingNote: "Phase 3 fake rental booking confirmation",
  });
}
