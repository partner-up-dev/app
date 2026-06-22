import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import type { TradeOrder, TradeOrderId } from "../../../entities/trade-order";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { throwHttpProblem } from "../../../lib/problem-details";
import { createRideHailingProviderPort } from "../../ride-hailing";
import type {
  RideHailingDriverSnapshot,
  RideHailingExecutionPhase,
  RideHailingRiderSnapshot,
  RideHailingRouteSnapshot,
  RideHailingVehicleSnapshot,
} from "../model";
import {
  getOrderItemSkuName,
  getRideHailingChoiceSetItem,
  getRideHailingProviderBinding,
} from "../services";

const providerRepo = new RideHailingProviderInstanceRepository();
const rideOrderRepo = new RideHailingOrderRepository();
const tradeOrderRepo = new TradeOrderRepository();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

  const choiceSetItem = getRideHailingChoiceSetItem(input.order.items);
  const providerBinding = choiceSetItem ? getRideHailingProviderBinding(choiceSetItem) : null;
  let providerDetail: ProviderDetailProjection | null = null;
  if (providerBinding?.providerOrderId) {
    const provider = await providerRepo.findById(
      providerBinding.providerInstanceId as RideHailingProviderInstanceId,
    );
    if (provider) {
      const port = createRideHailingProviderPort({ providerInstance: provider });
      providerDetail = parseProviderDetail(
        await port.queryOrderDetail({
          providerOrderId: providerBinding.providerOrderId,
        }),
      );
    }
  }

  return {
    route: rideOrder.routeSnapshot,
    departureAt: rideOrder.departureAt?.toISOString() ?? null,
    riders: rideOrder.riders,
    contactPhone: rideOrder.contactPhone,
    selectedVehicleName: choiceSetItem
      ? getOrderItemSkuName(choiceSetItem)
      : input.order.items[0]
        ? getOrderItemSkuName(input.order.items[0])
        : "曹操出行",
    provider: {
      providerOrderId: providerBinding?.providerOrderId ?? null,
    },
    executionPhase: rideOrder.executionPhase,
    driver: rideOrder.driverSnapshot ?? providerDetail?.driver ?? null,
    vehicle: rideOrder.vehicleSnapshot ?? providerDetail?.vehicle ?? null,
    live: providerDetail,
  };
}

export async function confirmRideHailingProviderFeeAfterPayment(input: { orderId: string }) {
  const rideOrder = await rideOrderRepo.findByOrderId(input.orderId as TradeOrderId);
  if (!rideOrder) {
    return { applied: false, reason: "RideHailing order facts are missing" };
  }
  const order = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  const choiceSetItem = order ? getRideHailingChoiceSetItem(order.items) : null;
  const providerBinding = choiceSetItem ? getRideHailingProviderBinding(choiceSetItem) : null;
  if (!providerBinding?.providerOrderId) {
    return { applied: false, reason: "RideHailing provider order is missing" };
  }
  const provider = await providerRepo.findById(
    providerBinding.providerInstanceId as RideHailingProviderInstanceId,
  );
  if (!provider) {
    return { applied: false, reason: "RideHailing provider instance is missing" };
  }
  const port = createRideHailingProviderPort({ providerInstance: provider });
  await port.confirmFee({
    providerOrderId: providerBinding.providerOrderId,
  });
  return {
    applied: true,
    reason: "RideHailing provider fee confirmed",
    orderId: input.orderId,
  };
}
