import type { Offer } from "../../../entities/offer";
import type { ProductSku } from "../../../entities/product-sku";
import type { ProductSpu } from "../../../entities/product-spu";
import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import type { TradeOrder, TradeOrderId } from "../../../entities/trade-order";
import { ProductSkuRepository } from "../../../repositories/ProductSkuRepository";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import { throwHttpProblem } from "../../../lib/problem-details";
import type { PriceExplanation, RideHailingSkuFacts } from "../../merchandising";
import { createRideHailingProviderPort } from "../../ride-hailing";
import type {
  RideHailingDriverSnapshot,
  RideHailingExecutionPhase,
  RideHailingRiderSnapshot,
  RideHailingRouteSnapshot,
  RideHailingVehicleSnapshot,
} from "../model";
import { getOrderItemSkuName, PricingApplication } from "../services";

const productSpuRepo = new ProductSpuRepository();
const productSkuRepo = new ProductSkuRepository();
const providerRepo = new RideHailingProviderInstanceRepository();
const rideOrderRepo = new RideHailingOrderRepository();
const pricingApplication = new PricingApplication();

type RideSku = ProductSku & { facts: RideHailingSkuFacts };

export type RideQuoteOption = {
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isRideHailingSkuFacts = (value: unknown): value is RideHailingSkuFacts =>
  isRecord(value) &&
  typeof value.rideHailingProviderInstanceId === "string" &&
  typeof value.providerVehicleTypeCode === "string";

async function listRideSkus(
  offer: Offer,
): Promise<Array<{ spu: ProductSpu; sku: RideSku }>> {
  const result: Array<{ spu: ProductSpu; sku: RideSku }> = [];
  for (const spuId of offer.spuIds) {
    const spu = await productSpuRepo.findById(spuId);
    if (!spu || spu.status !== "ACTIVE" || spu.productType !== "RIDE_HAILING") {
      continue;
    }
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
      priceExplanations: [],
    };
  }

  const port = createRideHailingProviderPort({ providerInstance: provider });
  let rawEstimate: unknown;
  try {
    rawEstimate = await port.estimate({
      params: {
        car_type: input.sku.facts.providerVehicleTypeCode,
        flat: input.route.origin.latitude,
        flng: input.route.origin.longitude,
        tlat: input.route.destination.latitude,
        tlng: input.route.destination.longitude,
      },
    });
  } catch (error) {
    return {
      skuId: input.sku.id,
      spuId: input.spu.id,
      name: input.sku.name,
      providerName: provider.displayName,
      carTypeName: input.sku.name,
      displayName: `${provider.displayName}${input.sku.name}`,
      providerVehicleTypeCode: input.sku.facts.providerVehicleTypeCode,
      providerInstanceId: provider.id,
      selected: false,
      selectable: false,
      disabledReason:
        error instanceof Error ? error.message : "Provider quote failed",
      estimateAmountFen: null,
      quoteAmountFen: null,
      priceExplanations: [],
    };
  }
  const estimateAmountFen =
    readNumber(rawEstimate, [
      "estimateAmountFen",
      "estimatePriceFen",
      "estimate_price",
      "price",
    ]) ?? 0;
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
    priceExplanations: [
      ...pricingSnapshot.itemBreakdowns.flatMap(
        (breakdown) => breakdown.explanations,
      ),
      ...pricingSnapshot.orderLevelExplanations,
    ],
  };
}

export async function evaluateRideOptions(input: {
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
      .sort(
        (left, right) => (left.quoteAmountFen ?? 0) - (right.quoteAmountFen ?? 0),
      )[0]?.skuId ??
    null;
  return options.map((option) => ({
    ...option,
    selected: option.skuId === selectedSkuId,
  }));
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
    return throwHttpProblem({
      status: 500,
      detail: "RideHailing order facts are missing",
    });
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
