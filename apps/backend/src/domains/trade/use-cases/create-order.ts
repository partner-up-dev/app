import { randomUUID } from "node:crypto";
import type {
  CommerceQuote,
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
import { db } from "../../../lib/db";
import { ProblemDetailsError, throwHttpProblem } from "../../../lib/problem-details";
import { throwRentalRuntimeRetired } from "../../../lib/rental-runtime-retirement";
import type { RepositoryExecutor } from "../../../repositories/_executor";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { CreateOrderAttemptRepository } from "../../../repositories/CreateOrderAttemptRepository";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import { SkuCancellationPolicyRepository } from "../../../repositories/SkuCancellationPolicyRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { areThereAnyUnpaidPayableBillLines } from "../../bill/contracts";
import {
  isRideHailingSkuFacts,
  type PriceExplanation,
  type RideHailingSkuFacts,
} from "../../merchandising/contracts";
import { attachOrderToPr } from "../../pr/commands";
import { PR_ACTIVE_ORDER_EXISTS_CODE } from "../../pr/contracts";
import { getPROrderAttachmentEligibility } from "../../pr/queries";
import {
  RideHailingProviderCreateOutcomeUnknownError,
  RideHailingProviderCreateRejectedError,
} from "../../ride-hailing/contracts";
import { createRideHailingDispatchPort } from "../../ride-hailing/ports";
import type {
  ChoiceSetOrderItemSnapshot,
  CreateOrderCommandResult,
  OrderItemSnapshot,
  OrderParticipantSnapshot,
  OrderPricingExecutionSnapshot,
  OrderPricingSnapshot,
  OrderStatus,
  OrderTimeout,
  OrderingActionProblem,
  RideHailingChoiceSetCandidateSnapshot,
  RideHailingChoiceSetResolutionSnapshot,
  RideHailingCreateDispatchSeed,
  RideHailingDispatchBindingSnapshot,
  RideHailingQuoteSnapshot,
  RideHailingRiderSnapshot,
  RideHailingRouteSnapshot,
  SkuSnapshot,
} from "../model";
import {
  buildCreateOrderCommandFingerprint,
  buildEqualRelativeSplitRule,
  buildOrderPricingExecutionSnapshot,
  replayCreateOrderAttempt,
  validateOrderParticipants,
} from "../services";
import {
  type QuoteBoundOrderItemInput,
  resolveQuoteBoundOrderItems,
  type ValidatedOfferQuote,
  type ValidatedQuoteItem,
} from "./offer-quote";

const offerRepo = new OfferRepository();
const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();
const skuCancellationPolicyRepo = new SkuCancellationPolicyRepository();
const providerRepo = new RideHailingProviderInstanceRepository();
const tradeOrderRepo = new TradeOrderRepository();
const createOrderAttemptRepo = new CreateOrderAttemptRepository();

const NON_EXPIRING_UNPAID_EXPIRES_AT = "9999-12-31T23:59:59.999Z";

export type OrderItemInput = QuoteBoundOrderItemInput;

export type CreateOrderCommandInput = {
  idempotencyKey: string;
  prId?: number | null;
  items: OrderItemInput[];
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
  dispatchProviderCandidates: RideCandidateContext[];
  dispatchProviderInstanceId: string;
  pricingCandidate: RideCandidateContext;
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
  const eligibility = await getPROrderAttachmentEligibility({
    prId: input.prId as PRId,
    actorUserId: (input.viewerUserId as UserId | null | undefined) ?? null,
  });
  if (eligibility.outcome === "PR_NOT_FOUND") {
    return actionProblem({
      code: "PR_NOT_FOUND",
      title: "无法创建订单",
      detail: "关联的 PR 不存在。",
    });
  }
  if (eligibility.outcome === "PR_NOT_READY") {
    return actionProblem({
      code: "PR_NOT_READY",
      title: "暂不能创建订单",
      detail: "创建订单需要搭子请求「已成团」或「进行中」",
    });
  }
  if (eligibility.outcome === "PR_ORDER_CREATOR_REQUIRED") {
    return actionProblem({
      code: "PR_ORDER_CREATOR_REQUIRED",
      title: "暂不能创建订单",
      detail: "仅 PR 创建者可以创建订单。",
    });
  }
  return null;
}

async function validateParticipantUnpaidOrders(input: {
  participants: OrderParticipantSnapshot[];
}): Promise<OrderingActionProblem | null> {
  const unsettledLines = await billLineRepo.listUnsettledChargeLinesByUserIds(
    input.participants.map((participant) => participant.userId as UserId),
  );
  if (unsettledLines.length === 0) {
    return null;
  }
  const bills = await billRepo.findByIds(
    Array.from(new Set(unsettledLines.map((line) => line.billId))),
  );
  const orders = await tradeOrderRepo.listByIds(
    Array.from(new Set(bills.map((bill) => bill.sourceOrderId))),
  );
  const billById = new Map(bills.map((bill) => [bill.id, bill]));
  const orderById = new Map(orders.map((order) => [order.id, order]));

  if (
    !areThereAnyUnpaidPayableBillLines(
      unsettledLines.map((line) => {
        const bill = billById.get(line.billId) ?? null;
        return {
          line,
          bill,
          order: bill ? (orderById.get(bill.sourceOrderId) ?? null) : null,
        };
      }),
    )
  ) {
    return null;
  }

  return actionProblem({
    code: "ORDERING_PARTICIPANT_UNPAID_ORDER_EXISTS",
    title: "参与者有未支付订单",
    detail: "订单参与者中有人存在未支付订单，请先完成相关订单支付后再下单。",
  });
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

const compareRideCandidatesByQuoteAmount = (
  left: RideCandidateContext,
  right: RideCandidateContext,
): number =>
  (left.quote.quoteAmountFen ?? Number.POSITIVE_INFINITY) -
  (right.quote.quoteAmountFen ?? Number.POSITIVE_INFINITY);

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
  const pricingCandidate = [...candidates].sort(compareRideCandidatesByQuoteAmount)[0];
  if (!pricingCandidate) {
    return throwHttpProblem({ status: 409, detail: "请选择可用车型" });
  }
  if (
    !pricingCandidate.offerQuote ||
    pricingCandidate.offerQuote.listingContextSnapshot.productType !== "RIDE_HAILING"
  ) {
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing quote context is missing",
      code: "ORDERING_QUOTE_CONTEXT_INVALID",
    });
  }
  const dispatchProviderInstanceId = pricingCandidate.fulfillmentQuote.providerInstanceId;
  const dispatchProviderCandidates = candidates.filter(
    (candidate) => candidate.fulfillmentQuote.providerInstanceId === dispatchProviderInstanceId,
  );
  return {
    offer: pricingCandidate.offer,
    itemId: input.itemId,
    candidates,
    dispatchProviderCandidates,
    dispatchProviderInstanceId,
    pricingCandidate,
    pricingSnapshot: pricingSnapshotFromQuote({
      itemId: input.itemId,
      price: pricingCandidate.offerQuote.pricingSnapshot,
    }),
    listingContext: pricingCandidate.offerQuote.listingContextSnapshot,
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

const rideProviderCandidateId = (candidate: RideCandidateContext): string =>
  String(candidate.sku.id);

const buildRideDispatchSeed = (input: {
  selected: SelectedRideContext;
  providerInstanceId: string;
  providerType?: string | null;
  externalOrderId: string;
  submittedAt: string;
  dispatchSubmission: Awaited<
    ReturnType<ReturnType<typeof createRideHailingDispatchPort>["prepareCreateRideSubmission"]>
  >;
}): RideHailingCreateDispatchSeed => {
  const submittedCandidateIds = new Set(input.dispatchSubmission.submittedCandidateIds);
  const submittedCandidates = input.selected.dispatchProviderCandidates.flatMap((candidate) => {
    if (!submittedCandidateIds.has(rideProviderCandidateId(candidate))) return [];
    return [
      {
        skuId: candidate.sku.id,
        spuId: candidate.spu.id,
        displayName: candidate.quote.displayName,
        providerVehicleTypeCode: candidate.fulfillmentQuote.providerVehicleTypeCode,
        providerVehicleTypeName: candidate.fulfillmentQuote.providerVehicleTypeName,
        quoteSnapshot: buildRideQuoteSnapshot(candidate.quote),
      },
    ];
  });
  if (submittedCandidates.length === 0) {
    throw new Error("RideHailing provider create returned no recognized submitted candidates");
  }
  return {
    providerInstanceId: input.providerInstanceId,
    providerType: input.providerType ?? null,
    externalOrderId: input.externalOrderId,
    submittedAt: input.submittedAt,
    submissionMode: input.dispatchSubmission.submissionMode,
    submittedCandidates,
  };
};

const buildRideDispatchBindingSnapshot = (input: {
  seed: RideHailingCreateDispatchSeed;
  providerOrderId: string;
  providerSnapshot: unknown;
}): RideHailingDispatchBindingSnapshot => ({
  ...input.seed,
  providerOrderId: input.providerOrderId,
  providerSnapshot: input.providerSnapshot,
});

function buildNonExpiringTimeout(): OrderTimeout {
  return {
    unpaidExpiresAt: NON_EXPIRING_UNPAID_EXPIRES_AT,
    defaultWindowMinutes: 0,
  };
}

async function createBaseOrder(input: {
  executor: RepositoryExecutor;
  id?: TradeOrderId;
  offer: Offer;
  status?: OrderStatus;
  createdBy: string;
  participants: OrderParticipantSnapshot[];
  items: OrderItemSnapshot[];
  pricingExecutionSnapshot?: OrderPricingExecutionSnapshot | null;
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
    ...(input.id ? { id: input.id } : {}),
    family: input.offer.productType,
    offerId: input.offer.id as OfferId,
    createdBy: input.createdBy as UserId,
    ...(input.status ? { status: input.status } : {}),
    participants: input.participants,
    splitRuleSnapshot,
    pricingExecutionSnapshot: input.pricingExecutionSnapshot ?? null,
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

const CREATE_ORDER_REPLAY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const isAttemptKeyUniqueViolation = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;
  const record = error as { code?: unknown; constraint?: unknown; constraint_name?: unknown };
  const constraint = record.constraint ?? record.constraint_name;
  return record.code === "23505" && constraint === "create_order_attempts_actor_key_unique";
};

const isPrOrderAlreadyExistsProblem = (error: unknown): boolean =>
  error instanceof ProblemDetailsError && error.code === PR_ACTIVE_ORDER_EXISTS_CODE;

async function createRideHailingOrderBranch(input: {
  command: CreateOrderCommandInput;
  commandFingerprint: string;
  selected: SelectedRideContext;
  createdBy: string;
}): Promise<CreateOrderCommandResult> {
  if (!input.command.prId) {
    return throwHttpProblem({
      status: 400,
      code: "PR_ID_REQUIRED",
      detail: "Public RideHailing order creation requires a PR",
    });
  }

  const provider = await providerRepo.findById(
    input.selected.dispatchProviderInstanceId as RideHailingProviderInstanceId,
  );
  if (!provider) {
    return throwHttpProblem({ status: 404, detail: "RideHailing provider not found" });
  }

  const port = createRideHailingDispatchPort({ providerInstance: provider });
  const orderId = randomUUID() as TradeOrderId;
  const providerCandidates = input.selected.dispatchProviderCandidates.map((candidate) => ({
    candidateId: rideProviderCandidateId(candidate),
    providerVehicleTypeCode: candidate.fulfillmentQuote.providerVehicleTypeCode,
    providerVehicleTypeName: candidate.fulfillmentQuote.providerVehicleTypeName,
    estimateAmountFen: candidate.fulfillmentQuote.estimateAmountFen,
    providerQuoteId: candidate.fulfillmentQuote.providerQuoteId,
    providerQuoteExpiresAt: candidate.fulfillmentQuote.providerQuoteExpiresAt,
    quoteAmountFen: candidate.quote.quoteAmountFen,
    providerSnapshot: candidate.fulfillmentQuote.providerSnapshot,
  }));
  const externalOrderId = port.buildExternalOrderId(orderId);
  const submittedAt = new Date();
  const dispatchSeed = buildRideDispatchSeed({
    selected: input.selected,
    providerInstanceId: provider.id,
    providerType: provider.providerType,
    externalOrderId,
    submittedAt: submittedAt.toISOString(),
    dispatchSubmission: port.prepareCreateRideSubmission(providerCandidates),
  });

  let attempt;
  try {
    attempt = await db.transaction(async (tx) => {
      const participants = input.selected.listingContext.participants;
      const unresolvedItem = await buildRideChoiceSetItemSnapshot({
        selected: input.selected,
        resolution: null,
      });
      const pricingExecutionSnapshot = buildOrderPricingExecutionSnapshot({
        offer: input.selected.offer,
        items: [
          {
            itemId: input.selected.itemId,
            spu: input.selected.pricingCandidate.spu,
            sku: input.selected.pricingCandidate.sku,
            quantity: input.selected.pricingCandidate.quantity,
          },
        ],
        orderContext: { serviceTime: input.selected.listingContext.departureAt },
      });
      const base = await createBaseOrder({
        executor: tx,
        id: orderId,
        offer: input.selected.offer,
        status: "INITIATING",
        createdBy: input.createdBy,
        participants,
        items: [unresolvedItem],
        pricingExecutionSnapshot,
        timeout: buildNonExpiringTimeout(),
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

      await attachPrIfPresent({
        executor: tx,
        orderId: base.order.id,
        prId: input.command.prId,
        offerId: input.selected.offer.id as OfferId,
        createdBy: input.createdBy,
      });

      // `create_order_attempts.pr_id` takes a parent-row FK lock. Lock and
      // validate the PR before writing that child row so two different keys
      // for one PR/Offer serialize at the PR authority instead of deadlocking.
      const transactionalAttemptRepo = new CreateOrderAttemptRepository(tx);
      const claimed = await transactionalAttemptRepo.create({
        actorUserId: input.createdBy as UserId,
        idempotencyKey: input.command.idempotencyKey,
        commandFingerprint: input.commandFingerprint,
        prId: input.command.prId as PRId,
        offerId: input.selected.offer.id as OfferId,
        orderId: base.order.id,
        providerInstanceId: provider.id,
        externalOrderId,
        dispatchSeed,
        status: "SUBMITTING",
        providerRequestStartedAt: submittedAt,
      });
      return claimed;
    });
  } catch (error) {
    if (!isAttemptKeyUniqueViolation(error) && !isPrOrderAlreadyExistsProblem(error)) throw error;
    const existing = await createOrderAttemptRepo.findByActorAndKey({
      actorUserId: input.createdBy as UserId,
      idempotencyKey: input.command.idempotencyKey,
    });
    if (!existing) throw error;
    return replayCreateOrderAttempt({
      attempt: existing,
      commandFingerprint: input.commandFingerprint,
    });
  }

  let created: Awaited<ReturnType<typeof port.createRide>>;
  try {
    created = await port.createRide({
      orderId,
      candidates: providerCandidates,
      contactPhone: input.selected.listingContext.contactPhone,
      departureAt: input.selected.listingContext.departureAt,
      passenger: {
        name: input.selected.listingContext.riders[0]?.displayName ?? "乘客",
        phone: input.selected.listingContext.contactPhone,
      },
      route: input.selected.listingContext.route,
    });
  } catch (error) {
    if (error instanceof RideHailingProviderCreateOutcomeUnknownError) {
      return { outcome: "PROCESSING", attemptId: attempt.id, orderId };
    }
    if (!(error instanceof RideHailingProviderCreateRejectedError)) throw error;
    const completedAt = new Date();
    const result: CreateOrderCommandResult = {
      outcome: "CANCELLED",
      attemptId: attempt.id,
      orderId,
      reason: actionProblem({
        code: "RIDE_HAILING_PROVIDER_CREATE_FAILED",
        title: "下单失败",
        detail: error.message,
      }),
    };
    return db.transaction(async (tx) => {
      const lockedAttempt = await new CreateOrderAttemptRepository(tx).findByIdForUpdate(
        attempt.id,
      );
      if (!lockedAttempt)
        throw new Error("CreateOrderAttempt disappeared during provider rejection");
      if (lockedAttempt.status !== "SUBMITTING") {
        return replayCreateOrderAttempt({
          attempt: lockedAttempt,
          commandFingerprint: input.commandFingerprint,
        });
      }
      await new RideHailingOrderRepository(tx).updateByOrderId(orderId, {
        executionPhase: "FAILED",
      });
      await new TradeOrderRepository(tx).updateStatus(orderId, "CANCELLED", completedAt);
      await new CreateOrderAttemptRepository(tx).complete({
        id: attempt.id,
        allowedStatuses: ["SUBMITTING"],
        status: "FAILED",
        resultSnapshot: result,
        responseStatus: 201,
        completedAt,
        replayExpiresAt: new Date(completedAt.getTime() + CREATE_ORDER_REPLAY_TTL_MS),
      });
      return result;
    });
  }

  return db.transaction(async (tx) => {
    const transactionalAttemptRepo = new CreateOrderAttemptRepository(tx);
    const lockedAttempt = await transactionalAttemptRepo.findByIdForUpdate(attempt.id);
    if (!lockedAttempt) throw new Error("CreateOrderAttempt disappeared during provider success");
    if (lockedAttempt.status !== "SUBMITTING") {
      if (
        lockedAttempt.providerOrderId &&
        lockedAttempt.providerOrderId !== created.providerOrderId
      ) {
        throw new Error("Provider create response conflicts with the callback-confirmed order");
      }
      return replayCreateOrderAttempt({
        attempt: lockedAttempt,
        commandFingerprint: input.commandFingerprint,
      });
    }

    const result: CreateOrderCommandResult = {
      outcome: "CREATED",
      attemptId: attempt.id,
      orderId,
    };
    await new RideHailingOrderRepository(tx).updateByOrderId(orderId, {
      dispatchBinding: buildRideDispatchBindingSnapshot({
        seed: dispatchSeed,
        providerOrderId: created.providerOrderId,
        providerSnapshot: created.providerSnapshot,
      }),
      executionPhase: "DISPATCHING",
    });
    await new TradeOrderRepository(tx).updateStatus(orderId, "OPEN");
    const completedAt = new Date();
    await transactionalAttemptRepo.complete({
      id: attempt.id,
      allowedStatuses: ["SUBMITTING"],
      status: "SUCCEEDED",
      providerOrderId: created.providerOrderId,
      resultSnapshot: result,
      responseStatus: 201,
      completedAt,
      replayExpiresAt: new Date(completedAt.getTime() + CREATE_ORDER_REPLAY_TTL_MS),
    });
    return result;
  });
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

  const idempotencyKey = input.idempotencyKey.trim();
  if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return throwHttpProblem({
      status: 400,
      code: "IDEMPOTENCY_KEY_INVALID",
      detail: "Idempotency-Key must contain between 8 and 128 characters",
    });
  }
  const commandFingerprint = buildCreateOrderCommandFingerprint(input);
  const existingAttempt = await createOrderAttemptRepo.findByActorAndKey({
    actorUserId: input.createdBy as UserId,
    idempotencyKey,
  });
  if (existingAttempt) {
    return replayCreateOrderAttempt({ attempt: existingAttempt, commandFingerprint });
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
  if (firstOffer.productType === "RENTAL") {
    return throwRentalRuntimeRetired();
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
    return throwRentalRuntimeRetired();
  }

  const selected = await resolveRideSelectionFromQuote({
    item: firstQuoteItem,
    itemId,
  });
  const participantPaymentProblem = await validateParticipantUnpaidOrders({
    participants: selected.listingContext.participants,
  });
  if (participantPaymentProblem) {
    return throwHttpProblem({
      status: 409,
      detail: participantPaymentProblem.detail,
      code: participantPaymentProblem.code,
    });
  }
  return createRideHailingOrderBranch({
    command: { ...input, idempotencyKey },
    commandFingerprint,
    selected,
    createdBy: input.createdBy,
  });
}
