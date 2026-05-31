import { randomUUID } from "node:crypto";
import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import type { BillId } from "../../../entities/bill";
import type { Offer, OfferId } from "../../../entities/offer";
import type { PRId, PRRoute } from "../../../entities/partner-request";
import type { ProductSku } from "../../../entities/product-sku";
import type { ProductSpu } from "../../../entities/product-spu";
import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import type { TradeOrder, TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { PartnerRepository, type ActiveParticipantSummary } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { ProductSkuRepository } from "../../../repositories/ProductSkuRepository";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
import { RideHailingFulfillmentRepository } from "../../../repositories/RideHailingFulfillmentRepository";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import {
  buildPrPlacementRuleContextData,
  type PriceExplanation,
  type RideHailingSkuFacts,
  type SpuSalesPolicy,
} from "../../merchandising";
import {
  createRideHailingProviderPort,
  resolveCaocaoOrderStatusCallbackUrl,
} from "../../ride-hailing";
import { attachOrderToPr } from "../../pr-core";
import type {
  OrderItemSnapshot,
  RideHailingPlaceSnapshot,
  RideHailingRouteSnapshot,
} from "../model";
import {
  buildOrderParticipantsFromContext,
  PricingApplication,
} from "../services";
import { createRideHailingOrderFoundation } from "./create-ride-hailing-order-foundation";

const offerRepo = new OfferRepository();
const partnerRepo = new PartnerRepository();
const partnerRequestRepo = new PartnerRequestRepository();
const productSpuRepo = new ProductSpuRepository();
const productSkuRepo = new ProductSkuRepository();
const providerRepo = new RideHailingProviderInstanceRepository();
const fulfillmentRepo = new RideHailingFulfillmentRepository();
const rideOrderRepo = new RideHailingOrderRepository();
const tradeOrderRepo = new TradeOrderRepository();
const billRepo = new BillRepository();
const billLineRepo = new BillLineRepository();
const pricingApplication = new PricingApplication();

type ResolvedRidePlacementOffer = {
  placementId: number;
  offer: Offer;
};

type ResolvedRidePrContext = {
  prId: PRId;
  createdBy: UserId | null;
  status: string;
  route: RideHailingRouteSnapshot;
  departureAt: string | null;
  activeParticipants: ActiveParticipantSummary[];
};

type RideSku = ProductSku & { facts: RideHailingSkuFacts };

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
};

export type RideHailingOrderingReadModel = {
  productType: "RIDE_HAILING";
  source: {
    placementInstanceId: number;
    offerId: number;
    context: {
      kind: "PR";
      prId: number;
    };
  };
  route: RideHailingRouteSnapshot;
  departureAt: string | null;
  riders: Array<{
    userId: string;
    displayName: string;
    phoneMasked: string | null;
  }>;
  contactPhone: string | null;
  spus: Array<{
    spuId: number;
    name: string;
    salesPolicy: SpuSalesPolicy;
    sellingPoints: string[];
    skuOptions: RideQuoteOption[];
  }>;
};

export type RideHailingOrderingItemInput = {
  spuId?: number | null;
  skuId: number;
  quantity?: number | null;
};

export type RideHailingOrderingExtraProperties = {
  route: RideHailingRouteSnapshot;
  departureAt?: string | null;
  riders: string[];
  contactPhone: string;
};

export type RideHailingOrderingEvaluationInput = {
  offerId: number;
  prId?: number | null;
  items: RideHailingOrderingItemInput[];
  productTypedExtraProperties: RideHailingOrderingExtraProperties;
};

export type RideHailingOrderingEvaluation = {
  quoteExpiresAt: string;
  options: RideQuoteOption[];
  priceRange: {
    minFen: number | null;
    maxFen: number | null;
  };
  availability: {
    createOrderEnabled: boolean;
    disabledReason: string | null;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isActiveNow = (offer: Offer, now = new Date()): boolean => {
  if (offer.status !== "ACTIVE") return false;
  if (offer.startsAt && offer.startsAt > now) return false;
  if (offer.endsAt && offer.endsAt < now) return false;
  return true;
};

const isRideHailingSkuFacts = (value: unknown): value is RideHailingSkuFacts =>
  isRecord(value) &&
  typeof value.rideHailingProviderInstanceId === "string" &&
  typeof value.providerVehicleTypeCode === "string";

const toPlaceSnapshot = (point: PRRoute[number]): RideHailingPlaceSnapshot => {
  const coordinate = point.gcj02 ?? point.bd09 ?? point.wgs84;
  if (!coordinate) {
    throw new Error("RideHailing route point requires coordinates");
  }
  return {
    name: point.name,
    address: point.full_address,
    latitude: coordinate[0],
    longitude: coordinate[1],
  };
};

const toRouteSnapshot = (route: PRRoute | null): RideHailingRouteSnapshot => {
  if (!route || route.length < 2) {
    throw new Error("RideHailing ordering requires a route PR");
  }
  const origin = toPlaceSnapshot(route[0]!);
  const destination = toPlaceSnapshot(route[route.length - 1]!);
  const waypoints = route.slice(1, -1).map(toPlaceSnapshot);
  const polyline = [origin, ...waypoints, destination].map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
  }));
  return {
    origin,
    waypoints,
    destination,
    drivingPlan: {
      distanceMeters: 8200,
      durationSeconds: 1500,
      polyline,
    },
  };
};

const maskPhone = (phone: string | null): string | null => {
  if (!phone || phone.length < 7) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
};

const toRider = (participant: ActiveParticipantSummary) => ({
  userId: participant.userId,
  displayName: participant.nickname ?? "同乘人",
  phoneMasked: maskPhone(participant.phoneNumber),
});

async function resolveRidePlacementOffer(
  offerId: number,
): Promise<ResolvedRidePlacementOffer> {
  const offer = await offerRepo.findById(offerId as OfferId);
  if (!offer || offer.productType !== "RIDE_HAILING" || !isActiveNow(offer)) {
    return throwHttpProblem({ status: 409, detail: "Offer is not available for RideHailing ordering" });
  }
  return { placementId: 0, offer };
}

async function resolveRidePrContext(prId: number): Promise<ResolvedRidePrContext> {
  const pr = await partnerRequestRepo.findById(prId as PRId);
  if (!pr) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(pr.id);
  const prContext = buildPrPlacementRuleContextData({
    activeParticipantCount: activeParticipants.length,
    pr,
  });
  if (!prContext.hasRoute) {
    return throwHttpProblem({ status: 409, detail: "RideHailing ordering requires a route PR" });
  }
  return {
    prId: pr.id,
    createdBy: pr.createdBy,
    status: pr.status,
    route: toRouteSnapshot(pr.route),
    departureAt: pr.time[0] ? new Date(pr.time[0]).toISOString() : null,
    activeParticipants,
  };
}

async function listRideSkus(offer: Offer): Promise<Array<{ spu: ProductSpu; sku: RideSku }>> {
  const result: Array<{ spu: ProductSpu; sku: RideSku }> = [];
  for (const spuId of offer.spuIds) {
    const spu = await productSpuRepo.findById(spuId);
    if (!spu || spu.status !== "ACTIVE" || spu.productType !== "RIDE_HAILING") continue;
    const skus = await productSkuRepo.listBySpuId(spu.id);
    for (const sku of skus) {
      if (sku.status !== "ACTIVE" || !isRideHailingSkuFacts(sku.facts)) continue;
      result.push({ spu, sku: { ...sku, facts: sku.facts } });
    }
  }
  return result;
}

const readNumber = (value: unknown, keys: string[]): number | null => {
  if (!isRecord(value)) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

const readString = (value: unknown, keys: string[]): string | null => {
  if (!isRecord(value)) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return null;
};

async function quoteSku(input: {
  sku: RideSku;
  spu: ProductSpu;
  providerNameFallback?: string;
  route: RideHailingRouteSnapshot;
  offer: Offer;
}): Promise<RideQuoteOption> {
  const provider = await providerRepo.findById(
    input.sku.facts.rideHailingProviderInstanceId as RideHailingProviderInstanceId,
  );
  if (!provider || provider.status !== "ACTIVE") {
    return {
      skuId: input.sku.id,
      spuId: input.spu.id,
      name: input.sku.name,
      providerName: input.providerNameFallback ?? "服务商",
      carTypeName: input.sku.name,
      displayName: `${input.providerNameFallback ?? "服务商"}${input.sku.name}`,
      providerVehicleTypeCode: input.sku.facts.providerVehicleTypeCode,
      providerInstanceId: input.sku.facts.rideHailingProviderInstanceId,
      selected: false,
      selectable: false,
      disabledReason: "Provider instance is not active",
      estimateAmountFen: null,
      quoteAmountFen: null,
    };
  }

  const port = createRideHailingProviderPort({ providerInstance: provider });
  const rawEstimate = await port.estimate({
    params: {
      car_type: input.sku.facts.providerVehicleTypeCode,
      flat: input.route.origin.latitude,
      flng: input.route.origin.longitude,
      tlat: input.route.destination.latitude,
      tlng: input.route.destination.longitude,
    },
  });
  const estimateAmountFen =
    readNumber(rawEstimate, ["estimateAmountFen", "estimatePriceFen", "estimate_price", "price"]) ?? 0;
  const carTypeName =
    readString(rawEstimate, ["carTypeName", "car_type_name"]) ?? input.sku.name;
  const pricingSnapshot = pricingApplication.resolve({
    offer: input.offer,
    items: [
      {
        itemId: "preview",
        spu: input.spu,
        sku: input.sku,
        quantity: 1,
      },
    ],
    orderContext: {
      quoteTotalFen: estimateAmountFen,
    },
  });

  return {
    skuId: input.sku.id,
    spuId: input.spu.id,
    name: input.sku.name,
    providerName: provider.displayName,
    carTypeName,
    displayName: `${provider.displayName}${carTypeName}`,
    providerVehicleTypeCode: input.sku.facts.providerVehicleTypeCode,
    providerInstanceId: provider.id,
    selected: false,
    selectable: true,
    disabledReason: null,
    estimateAmountFen,
    quoteAmountFen: pricingSnapshot.totalFen,
  };
}

async function evaluateRideOptions(input: {
  offer: Offer;
  route: RideHailingRouteSnapshot;
  selectedSkuId?: number | null;
}): Promise<RideQuoteOption[]> {
  const skus = await listRideSkus(input.offer);
  const options = await Promise.all(
    skus.map(({ spu, sku }) =>
      quoteSku({
        offer: input.offer,
        route: input.route,
        sku,
        spu,
      }),
    ),
  );
  const selectedSkuId =
    input.selectedSkuId ??
    options
      .filter((option) => option.selectable && option.quoteAmountFen !== null)
      .sort((left, right) => (left.quoteAmountFen ?? 0) - (right.quoteAmountFen ?? 0))[0]
      ?.skuId ??
    null;
  return options.map((option) => ({
    ...option,
    selected: option.skuId === selectedSkuId,
  }));
}

export async function getOrderingFromPlacement(input: {
  offerId: number;
  prId: number;
}) {
  const offer = await offerRepo.findById(input.offerId as OfferId);
  if (!offer) return throwHttpProblem({ status: 404, detail: "Offer not found" });
  if (offer.productType === "RIDE_HAILING") {
    return getRideHailingOrderingFromPlacement(input);
  }
  const { getRentalOrderingFromPlacement } = await import("./rental-ordering-flow");
  return getRentalOrderingFromPlacement(input);
}

export async function getRideHailingOrderingFromPlacement(input: {
  offerId: number;
  prId: number;
}): Promise<RideHailingOrderingReadModel> {
  const placement = await resolveRidePlacementOffer(input.offerId);
  const pr = await resolveRidePrContext(input.prId);
  const options = await evaluateRideOptions({
    offer: placement.offer,
    route: pr.route,
  });
  const spus = await Promise.all(
    placement.offer.spuIds.map((spuId) => productSpuRepo.findById(spuId)),
  );

  return {
    productType: "RIDE_HAILING",
    source: {
      placementInstanceId: 0,
      offerId: placement.offer.id,
      context: {
        kind: "PR",
        prId: pr.prId,
      },
    },
    route: pr.route,
    departureAt: pr.departureAt,
    riders: pr.activeParticipants.map(toRider),
    contactPhone: pr.activeParticipants[0]?.phoneNumber ?? null,
    spus: spus
      .filter((spu): spu is ProductSpu => Boolean(spu && spu.productType === "RIDE_HAILING"))
      .map((spu) => ({
        spuId: spu.id,
        name: spu.name,
        salesPolicy: spu.salesPolicy,
        sellingPoints: spu.presentation.sellingPoints,
        skuOptions: options.filter((option) => option.spuId === spu.id),
      })),
  };
}

export async function evaluateRideHailingOrdering(
  input: RideHailingOrderingEvaluationInput & { viewerUserId?: string | null },
): Promise<RideHailingOrderingEvaluation> {
  const placement = await resolveRidePlacementOffer(input.offerId);
  if (!input.prId) {
    return throwHttpProblem({ status: 400, detail: "PR order requires prId" });
  }
  const pr = await resolveRidePrContext(input.prId);
  const options = await evaluateRideOptions({
    offer: placement.offer,
    route: input.productTypedExtraProperties.route,
    selectedSkuId: input.items[0]?.skuId ?? null,
  });
  const selectablePrices = options
    .map((option) => option.quoteAmountFen)
    .filter((value): value is number => typeof value === "number");
  const disabledReason =
    pr.status !== "READY"
      ? "订单创建需要 PR 处于 READY 状态"
      : !input.viewerUserId || pr.createdBy !== input.viewerUserId
        ? "仅 PR 创建者可以创建订单"
        : input.productTypedExtraProperties.riders.length === 0
          ? "至少需要一名同乘人"
          : input.productTypedExtraProperties.contactPhone.trim().length === 0
            ? "请填写联系方式"
            : options.some((option) => option.selected && option.selectable)
              ? null
              : "请选择可用车型";

  return {
    quoteExpiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    options,
    priceRange: {
      minFen: selectablePrices.length ? Math.min(...selectablePrices) : null,
      maxFen: selectablePrices.length ? Math.max(...selectablePrices) : null,
    },
    availability: {
      createOrderEnabled: disabledReason === null,
      disabledReason,
    },
  };
}

async function resolveSelectedRide(input: RideHailingOrderingEvaluationInput): Promise<{
  placement: ResolvedRidePlacementOffer;
  pr: ResolvedRidePrContext;
  spu: ProductSpu;
  sku: RideSku;
  quote: RideQuoteOption;
}> {
  const placement = await resolveRidePlacementOffer(input.offerId);
  if (!input.prId) {
    return throwHttpProblem({ status: 400, detail: "PR order requires prId" });
  }
  const pr = await resolveRidePrContext(input.prId);
  const options = await evaluateRideOptions({
    offer: placement.offer,
    route: input.productTypedExtraProperties.route,
    selectedSkuId: input.items[0]?.skuId ?? null,
  });
  const quote = options.find((option) => option.selected && option.selectable);
  if (!quote || quote.quoteAmountFen === null) {
    return throwHttpProblem({ status: 409, detail: "请选择可用车型" });
  }
  const spu = await productSpuRepo.findById(quote.spuId);
  const sku = await productSkuRepo.findById(quote.skuId);
  if (!spu || !sku || !isRideHailingSkuFacts(sku.facts)) {
    return throwHttpProblem({ status: 404, detail: "RideHailing SKU not found" });
  }
  return {
    placement,
    pr,
    spu,
    sku: { ...sku, facts: sku.facts },
    quote,
  };
}

export async function createRideHailingOrderFromPlacement(
  input: RideHailingOrderingEvaluationInput & { createdBy: string },
) {
  const evaluation = await evaluateRideHailingOrdering({
    ...input,
    viewerUserId: input.createdBy,
  });
  if (!evaluation.availability.createOrderEnabled) {
    return throwHttpProblem({
      status: 409,
      detail: evaluation.availability.disabledReason ?? "RideHailing order is not available",
    });
  }

  const selected = await resolveSelectedRide(input);
  const provider = await providerRepo.findById(
    selected.sku.facts.rideHailingProviderInstanceId as RideHailingProviderInstanceId,
  );
  if (!provider) {
    return throwHttpProblem({ status: 404, detail: "RideHailing provider not found" });
  }
  const itemId = randomUUID();
  const item: OrderItemSnapshot = {
    itemId,
    spuId: selected.spu.id,
    spuVersion: selected.spu.version,
    spuName: selected.spu.name,
    skuId: selected.sku.id,
    skuVersion: selected.sku.version,
    skuName: selected.quote.displayName,
    quantity: 1,
    skuFactsSnapshot: selected.sku.facts,
    pricingModelSnapshot: selected.sku.pricingModel,
    cancellationPolicySnapshot: null,
  };
  const pricingSnapshot = pricingApplication.resolve({
    offer: selected.placement.offer,
    items: [
      {
        itemId,
        spu: selected.spu,
        sku: selected.sku,
        quantity: 1,
      },
    ],
    orderContext: {
      quoteTotalFen: selected.quote.quoteAmountFen,
    },
  });
  const participants = buildOrderParticipantsFromContext({
    participants: selected.pr.activeParticipants.map((participant) => ({
      participantId: String(participant.partnerId),
      userId: participant.userId,
      joinedVia: "PR_ACTIVE_PARTICIPANT",
    })),
    createdBy: input.createdBy,
  });

  const local = await db.transaction(async (tx) => {
    const result = await createRideHailingOrderFoundation(
      {
        createdBy: input.createdBy,
        participants,
        offerId: selected.placement.offer.id as OfferId,
        items: [item],
        pricingSnapshot,
        routeSnapshot: input.productTypedExtraProperties.route,
        departureAt: input.productTypedExtraProperties.departureAt ?? null,
        riders: selected.pr.activeParticipants
          .filter((participant) =>
            input.productTypedExtraProperties.riders.includes(participant.userId),
          )
          .map(toRider),
        contactPhone: input.productTypedExtraProperties.contactPhone,
        providerInstanceId: provider.id,
      },
      tx,
    );
    await attachOrderToPr(
      {
        orderId: result.orderId as TradeOrderId,
        prId: selected.pr.prId,
        offerId: selected.placement.offer.id as OfferId,
        orderCreatedBy: input.createdBy as UserId,
      },
      tx,
    );
    return result;
  });

  const port = createRideHailingProviderPort({ providerInstance: provider });
  try {
    const created = await port.createRide({
      orderId: local.orderId,
      params: {
        callback_url: resolveCaocaoOrderStatusCallbackUrl(provider),
        car_type: selected.sku.facts.providerVehicleTypeCode,
        flat: input.productTypedExtraProperties.route.origin.latitude,
        flng: input.productTypedExtraProperties.route.origin.longitude,
        tlat: input.productTypedExtraProperties.route.destination.latitude,
        tlng: input.productTypedExtraProperties.route.destination.longitude,
      },
    });
    const fulfillment = await fulfillmentRepo.findByOrderId(local.orderId as TradeOrderId);
    if (fulfillment) {
      await fulfillmentRepo.updateById(fulfillment.id, {
        lifecycleStatus: "ACTIVE",
        externalOrderId: created.externalOrderId,
        providerOrderId: created.providerOrderId,
        providerExecutionRef: {
          providerOrderId: created.providerOrderId,
          providerTripRef: created.providerOrderId,
        },
      });
    }
    await rideOrderRepo.updateByOrderId(local.orderId as TradeOrderId, {
      providerCreationStatus: "SUCCEEDED",
    });
    await tradeOrderRepo.updateStatus(local.orderId as TradeOrderId, "OPEN");
    return local;
  } catch (error) {
    await rideOrderRepo.updateByOrderId(local.orderId as TradeOrderId, {
      providerCreationStatus: "FAILED",
    });
    await tradeOrderRepo.updateStatus(local.orderId as TradeOrderId, "FAILED", new Date());
    return throwHttpProblem({
      status: 502,
      detail:
        error instanceof Error
          ? error.message
          : "RideHailing provider order creation failed",
    });
  }
}

type ProviderDetailProjection = {
  phase: string;
  statusLabel: string;
  finalAmountFen: number | null;
  driver: {
    driverName: string;
    driverPhone: string;
  } | null;
  vehicle: {
    plate: string;
    brand: string;
    color: string;
  } | null;
};

const parseProviderDetail = (raw: unknown): ProviderDetailProjection => {
  const phase = readString(raw, ["phase", "status"]) ?? "CREATED";
  const finalAmountFen = readNumber(raw, ["finalAmountFen", "actual_price"]);
  const driverRaw = isRecord(raw) ? raw.driver : null;
  const vehicleRaw = isRecord(raw) ? raw.vehicle : null;
  const statusLabel =
    phase === "FINISHED"
      ? "待支付"
      : phase === "IN_TRIP"
        ? "行程中"
        : phase === "ACCEPTED"
          ? "已接单"
          : "正在呼叫";
  return {
    phase,
    statusLabel,
    finalAmountFen,
    driver: isRecord(driverRaw)
      ? {
          driverName: readString(driverRaw, ["driverName", "name"]) ?? "司机",
          driverPhone: readString(driverRaw, ["driverPhone", "phone"]) ?? "",
        }
      : null,
    vehicle: isRecord(vehicleRaw)
      ? {
          plate: readString(vehicleRaw, ["plate"]) ?? "",
          brand: readString(vehicleRaw, ["brand"]) ?? "",
          color: readString(vehicleRaw, ["color"]) ?? "",
        }
      : null,
  };
};

async function ensureRideFinalBill(input: {
  order: TradeOrder;
  finalAmountFen: number;
}): Promise<void> {
  const existing = await billRepo.findBySourceOrderId(input.order.id);
  if (existing) return;

  await db.transaction(async (tx) => {
    const txBillRepo = new BillRepository(tx);
    const txLineRepo = new BillLineRepository(tx);
    const bill = await txBillRepo.create({
      sourceOrderId: input.order.id,
      status: "ACTIVE",
      currency: "CNY",
    });
    const participants = input.order.participants;
    const baseShare = Math.floor(input.finalAmountFen / participants.length);
    let remainder = input.finalAmountFen - baseShare * participants.length;
    await txLineRepo.createMany(
      participants.map((participant) => {
        const extra = remainder > 0 ? 1 : 0;
        remainder -= extra;
        return {
          billId: bill.id as BillId,
          userId: participant.userId as UserId,
          kind: "CHARGE",
          amountFen: baseShare + extra,
          currency: "CNY",
          label: "曹操出行费用",
          description: "行程结束后按实际费用结算",
        };
      }),
    );
  });
}

export async function buildRideHailingDetailProjection(input: {
  order: TradeOrder;
}) {
  const rideOrder = await rideOrderRepo.findByOrderId(input.order.id);
  const fulfillment = await fulfillmentRepo.findByOrderId(input.order.id);
  if (!rideOrder || !fulfillment) {
    return throwHttpProblem({ status: 500, detail: "RideHailing order facts are missing" });
  }

  let providerDetail: ProviderDetailProjection | null = null;
  if (fulfillment.providerOrderId) {
    const provider = await providerRepo.findById(fulfillment.providerInstanceId);
    if (provider) {
      const port = createRideHailingProviderPort({ providerInstance: provider });
      providerDetail = parseProviderDetail(
        await port.queryOrderDetail({
          providerOrderId: fulfillment.providerOrderId,
        }),
      );
      if (providerDetail.finalAmountFen !== null) {
        await ensureRideFinalBill({
          order: input.order,
          finalAmountFen: providerDetail.finalAmountFen,
        });
      }
    }
  }

  return {
    route: rideOrder.routeSnapshot,
    departureAt: rideOrder.departureAt?.toISOString() ?? null,
    riders: rideOrder.riders,
    contactPhone: rideOrder.contactPhone,
    providerCreationStatus: rideOrder.providerCreationStatus,
    selectedVehicleName: input.order.items[0]?.skuName ?? "曹操出行",
    provider: {
      providerOrderId: fulfillment.providerOrderId,
      externalOrderId: fulfillment.externalOrderId,
    },
    live: providerDetail,
  };
}

export async function confirmRideHailingProviderFeeAfterPayment(input: {
  orderId: string;
}) {
  const fulfillment = await fulfillmentRepo.findByOrderId(input.orderId as TradeOrderId);
  if (!fulfillment?.providerOrderId) {
    return { applied: false, reason: "RideHailing provider order is missing" };
  }
  const provider = await providerRepo.findById(fulfillment.providerInstanceId);
  if (!provider) {
    return { applied: false, reason: "RideHailing provider instance is missing" };
  }
  const port = createRideHailingProviderPort({ providerInstance: provider });
  await port.confirmFee({
    providerOrderId: fulfillment.providerOrderId,
  });
  return {
    applied: true,
    reason: "RideHailing provider fee confirmed",
    fulfillmentId: fulfillment.id,
  };
}
