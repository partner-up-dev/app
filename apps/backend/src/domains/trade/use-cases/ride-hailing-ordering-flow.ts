import { randomUUID } from "node:crypto";
import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import type { Offer, OfferId } from "../../../entities/offer";
import type { PRId, PRRoute } from "../../../entities/partner-request";
import type { ProductSku } from "../../../entities/product-sku";
import type { ProductSpu } from "../../../entities/product-spu";
import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import type { TradeOrder, TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { PartnerRepository, type ActiveParticipantSummary } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { ProductSkuRepository } from "../../../repositories/ProductSkuRepository";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
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
  RideHailingDriverSnapshot,
  RideHailingExecutionPhase,
  RideHailingPlaceSnapshot,
  RideHailingRiderSnapshot,
  RideHailingRouteSnapshot,
  RideHailingVehicleSnapshot,
} from "../model";
import {
  buildOrderParticipantsFromContext,
  getOrderItemSkuName,
  PricingApplication,
} from "../services";
import { createRideHailingOrderFoundation } from "./create-ride-hailing-order-foundation";

const offerRepo = new OfferRepository();
const partnerRepo = new PartnerRepository();
const partnerRequestRepo = new PartnerRequestRepository();
const productSpuRepo = new ProductSpuRepository();
const productSkuRepo = new ProductSkuRepository();
const providerRepo = new RideHailingProviderInstanceRepository();
const rideOrderRepo = new RideHailingOrderRepository();
const tradeOrderRepo = new TradeOrderRepository();
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
  participants: Array<{ userId: string }>;
  items: RideHailingOrderingItemInput[];
  extraProperties: RideHailingOrderingExtraProperties;
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

const validateRideHailingRequest = (
  input: RideHailingOrderingEvaluationInput,
): string | null => {
  if (input.extraProperties.riders.length === 0) {
    return "至少需要一名同乘人";
  }
  if (input.extraProperties.contactPhone.trim().length === 0) {
    return "请填写联系方式";
  }
  return null;
};

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
    route: input.extraProperties.route,
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
        : validateRideHailingRequest(input) ??
          (options.some((option) => option.selected && option.selectable)
            ? null
            : "请选择可用车型");

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
    route: input.extraProperties.route,
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

export async function createRideHailingOrderCommand(
  input: RideHailingOrderingEvaluationInput & { createdBy: string },
) {
  const validationError = validateRideHailingRequest(input);
  if (validationError) {
    return throwHttpProblem({
      status: 409,
      detail: validationError,
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
    sku: {
      id: selected.sku.id,
      version: selected.sku.version,
      name: selected.quote.displayName,
      factsSnapshot: selected.sku.facts,
      pricingModelSnapshot: selected.sku.pricingModel,
      cancellationPolicySnapshot: null,
    },
    quantity: 1,
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
    participants: input.participants.map((participant) => ({
      participantId: participant.userId,
      userId: participant.userId,
      joinedVia: "API",
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
        routeSnapshot: input.extraProperties.route,
        departureAt: input.extraProperties.departureAt ?? null,
        riders: selected.pr.activeParticipants
          .filter((participant) =>
            input.extraProperties.riders.includes(participant.userId),
          )
          .map(toRider),
        contactPhone: input.extraProperties.contactPhone,
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
        flat: input.extraProperties.route.origin.latitude,
        flng: input.extraProperties.route.origin.longitude,
        tlat: input.extraProperties.route.destination.latitude,
        tlng: input.extraProperties.route.destination.longitude,
      },
    });
    await rideOrderRepo.updateByOrderId(local.orderId as TradeOrderId, {
      providerOrderId: created.providerOrderId,
      executionPhase: "DISPATCHING",
    });
    await tradeOrderRepo.updateStatus(local.orderId as TradeOrderId, "OPEN");
    return local;
  } catch (error) {
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

export type RideHailingOrderDetailProjection = {
  route: RideHailingRouteSnapshot;
  departureAt: string | null;
  riders: RideHailingRiderSnapshot[];
  contactPhone: string;
  selectedVehicleName: string;
  provider: {
    providerOrderId: string | null;
  };
  executionPhase: RideHailingExecutionPhase;
  driver: RideHailingDriverSnapshot | null;
  vehicle: RideHailingVehicleSnapshot | null;
  live: ProviderDetailProjection | null;
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

export async function buildRideHailingDetailProjection(input: {
  order: TradeOrder;
}): Promise<RideHailingOrderDetailProjection> {
  const rideOrder = await rideOrderRepo.findByOrderId(input.order.id);
  if (!rideOrder) {
    return throwHttpProblem({ status: 500, detail: "RideHailing order facts are missing" });
  }

  let providerDetail: ProviderDetailProjection | null = null;
  if (rideOrder.providerOrderId) {
    const provider = await providerRepo.findById(rideOrder.providerInstanceId);
    if (provider) {
      const port = createRideHailingProviderPort({ providerInstance: provider });
      providerDetail = parseProviderDetail(
        await port.queryOrderDetail({
          providerOrderId: rideOrder.providerOrderId,
        }),
      );
    }
  }

  return {
    route: rideOrder.routeSnapshot,
    departureAt: rideOrder.departureAt?.toISOString() ?? null,
    riders: rideOrder.riders,
    contactPhone: rideOrder.contactPhone,
    selectedVehicleName: input.order.items[0]
      ? getOrderItemSkuName(input.order.items[0])
      : "曹操出行",
    provider: {
      providerOrderId: rideOrder.providerOrderId,
    },
    executionPhase: rideOrder.executionPhase,
    driver: rideOrder.driverSnapshot ?? providerDetail?.driver ?? null,
    vehicle: rideOrder.vehicleSnapshot ?? providerDetail?.vehicle ?? null,
    live: providerDetail,
  };
}

export async function confirmRideHailingProviderFeeAfterPayment(input: {
  orderId: string;
}) {
  const rideOrder = await rideOrderRepo.findByOrderId(input.orderId as TradeOrderId);
  if (!rideOrder?.providerOrderId) {
    return { applied: false, reason: "RideHailing provider order is missing" };
  }
  const provider = await providerRepo.findById(rideOrder.providerInstanceId);
  if (!provider) {
    return { applied: false, reason: "RideHailing provider instance is missing" };
  }
  const port = createRideHailingProviderPort({ providerInstance: provider });
  await port.confirmFee({
    providerOrderId: rideOrder.providerOrderId,
  });
  return {
    applied: true,
    reason: "RideHailing provider fee confirmed",
    orderId: input.orderId,
  };
}
