import {
  type RideHailingProviderInstance,
  type RideHailingProviderInstanceId,
} from "../../../entities/ride-hailing-provider";
import type { BillId } from "../../../entities/bill";
import { throwHttpProblem } from "../../../lib/problem-details";
import { db } from "../../../lib/db";
import { BillLineRepository } from "../../../repositories/BillLineRepository";
import { BillRepository } from "../../../repositories/BillRepository";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { createRideHailingProviderPort } from "../services";
import type { CaocaoOrderStatusCallback } from "../model/provider";
import { getRideHailingChoiceSetItem, getRideHailingProviderBinding } from "../../trade/services";
import type { RideHailingExecutionPhase } from "../../trade/model";

const providerRepo = new RideHailingProviderInstanceRepository();
const rideOrderRepo = new RideHailingOrderRepository();
const tradeOrderRepo = new TradeOrderRepository();

const readString = (value: Record<string, string>, keys: string[]): string | null => {
  for (const key of keys) {
    const candidate = value[key];
    if (candidate && candidate.trim().length > 0) return candidate;
  }
  return null;
};

const readNumber = (value: Record<string, string>, keys: string[]): number | null => {
  for (const key of keys) {
    const candidate = value[key];
    if (!candidate || candidate.trim().length === 0) continue;
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const mapCaocaoEventToExecutionPhase = (
  event: number,
  currentPhase: RideHailingExecutionPhase,
): RideHailingExecutionPhase => {
  if ([20, 21, 22, 26, 27, 40, 41, 44, 45].includes(event)) return "CANCELLED";
  if ([5, 6, 11, 12, 13].includes(event)) return "FINISHED";
  if ([4, 48].includes(event)) return "IN_TRIP";
  if (event === 3) return "ARRIVED_AT_PICKUP";
  if ([1, 2, 42].includes(event)) return "ACCEPTED";
  if (event === 14) return "DISPATCHING";
  return currentPhase;
};

const emptyToNull = <T extends Record<string, string | null>>(value: T): T | null =>
  Object.values(value).some((entry) => entry !== null) ? value : null;

async function ensureRideFinalBill(input: {
  orderId: TradeOrderId;
  finalAmountFen: number;
}): Promise<void> {
  const order = await tradeOrderRepo.findById(input.orderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found for RideHailing bill" });
  }
  const existing = await new BillRepository().findBySourceOrderId(input.orderId);
  if (existing) return;

  await db.transaction(async (tx) => {
    const billRepo = new BillRepository(tx);
    const billLineRepo = new BillLineRepository(tx);
    const bill = await billRepo.create({
      sourceOrderId: input.orderId,
      status: "ACTIVE",
      currency: "CNY",
    });
    const baseShare = Math.floor(input.finalAmountFen / order.participants.length);
    let remainder = input.finalAmountFen - baseShare * order.participants.length;
    await billLineRepo.createMany(
      order.participants.map((participant) => {
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

async function loadActiveCaocaoProviderInstance(
  providerInstanceId: string,
): Promise<RideHailingProviderInstance> {
  const providerInstance = await providerRepo.findById(
    providerInstanceId as RideHailingProviderInstanceId,
  );
  if (
    !providerInstance ||
    providerInstance.status !== "ACTIVE" ||
    providerInstance.providerType !== "CAOCAO"
  ) {
    return throwHttpProblem({
      status: 404,
      detail: "Caocao provider instance not found",
    });
  }

  return providerInstance;
}

async function loadFirstActiveCaocaoProviderInstance(): Promise<RideHailingProviderInstance> {
  const providerInstance = await providerRepo.findFirstActiveByProviderType({
    providerType: "CAOCAO",
  });
  if (!providerInstance) {
    return throwHttpProblem({
      status: 404,
      detail: "Caocao provider instance not found",
    });
  }

  return providerInstance;
}

async function applyCaocaoCallbackWithProviderInstance(input: {
  providerInstance: RideHailingProviderInstance;
  form: Record<string, string>;
}): Promise<{ code: "SUCCESS"; message: string }> {
  const port = createRideHailingProviderPort({
    providerInstance: input.providerInstance,
  });

  let parsed: CaocaoOrderStatusCallback;
  try {
    parsed = port.parseOrderStatusCallback(input.form);
    if (!parsed.localOrderId) {
      return throwHttpProblem({
        status: 400,
        detail: "Caocao callback ext_order_id is not a ride-hailing order id",
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      return throwHttpProblem({
        status: 400,
        detail: error.message,
      });
    }
    throw error;
  }

  const orderId = parsed.localOrderId as TradeOrderId;
  const rideOrder = await rideOrderRepo.findByOrderId(orderId);
  const order = await tradeOrderRepo.findById(orderId);
  const choiceSetItem = order ? getRideHailingChoiceSetItem(order.items) : null;
  const providerBinding = choiceSetItem ? getRideHailingProviderBinding(choiceSetItem) : null;
  if (
    !rideOrder ||
    !providerBinding ||
    providerBinding.providerInstanceId !== input.providerInstance.id
  ) {
    return throwHttpProblem({
      status: 404,
      detail: "RideHailing order not found for Caocao callback",
    });
  }
  if (providerBinding.providerOrderId !== parsed.providerOrderId) {
    return throwHttpProblem({
      status: 409,
      detail: "Caocao callback provider order does not match local order",
    });
  }

  const driverSnapshot = emptyToNull({
    driverName: readString(parsed.raw, ["driver_name", "driverName", "driver"]),
    driverPhone: readString(parsed.raw, ["driver_phone", "driverPhone", "driver_mobile"]),
  });
  const vehicleSnapshot = emptyToNull({
    plate: readString(parsed.raw, ["plate", "car_no", "vehicle_plate"]),
    brand: readString(parsed.raw, ["brand", "vehicle_brand"]),
    color: readString(parsed.raw, ["color", "vehicle_color"]),
  });

  await rideOrderRepo.updateByOrderId(orderId, {
    executionPhase: mapCaocaoEventToExecutionPhase(parsed.event, rideOrder.executionPhase),
    driverSnapshot,
    vehicleSnapshot,
  });

  if (order?.status === "INITIATING") {
    await tradeOrderRepo.updateStatus(orderId, "OPEN");
  }

  const finalAmountFen = readNumber(parsed.raw, [
    "final_amount_fen",
    "finalAmountFen",
    "actual_price_fen",
    "actualPriceFen",
  ]);
  if (finalAmountFen !== null) {
    await rideOrderRepo.updateByOrderId(orderId, {
      finalSettlementInput: {
        amountFen: finalAmountFen,
        currency: "CNY",
        providerOrderId: parsed.providerOrderId,
        committedAt: new Date(parsed.timestampMs).toISOString(),
        providerSnapshot: parsed.raw,
      },
      executionPhase: "FINISHED",
    });
    await ensureRideFinalBill({
      orderId,
      finalAmountFen,
    });
  }

  return {
    code: "SUCCESS",
    message: "成功",
  };
}

export async function handleCaocaoOrderStatusCallback(input: {
  providerInstanceId: string;
  form: Record<string, string>;
}): Promise<{ code: "SUCCESS"; message: string }> {
  return applyCaocaoCallbackWithProviderInstance({
    providerInstance: await loadActiveCaocaoProviderInstance(input.providerInstanceId),
    form: input.form,
  });
}

export async function handleLegacyCaocaoOrderStatusCallback(input: {
  form: Record<string, string>;
}): Promise<{ code: "SUCCESS"; message: string }> {
  return applyCaocaoCallbackWithProviderInstance({
    providerInstance: await loadFirstActiveCaocaoProviderInstance(),
    form: input.form,
  });
}
