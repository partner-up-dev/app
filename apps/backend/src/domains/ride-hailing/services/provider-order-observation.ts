import type {
  RideHailingDriverSnapshot,
  RideHailingExecutionPhase,
  RideHailingFinalSettlementInput,
  RideHailingVehicleSnapshot,
} from "../../trade/model";
import type { RideHailingProviderOrderDetail } from "../model";

export type RideHailingProviderOrderObservation = {
  executionPhase: RideHailingExecutionPhase | null;
  driverSnapshot: RideHailingDriverSnapshot | null;
  vehicleSnapshot: RideHailingVehicleSnapshot | null;
  finalSettlementInput: Omit<RideHailingFinalSettlementInput, "committedAt"> | null;
};

const normalizePhase = (phase: string): string => phase.trim().toUpperCase();

export function mapProviderDetailPhaseToExecutionPhase(
  detail: Pick<RideHailingProviderOrderDetail, "phase" | "finalAmountFen">,
): RideHailingExecutionPhase | null {
  const phase = normalizePhase(detail.phase);
  if (phase === "FINISHED" || ["5", "6", "7", "8"].includes(phase)) {
    return "FINISHED";
  }
  if (phase === "IN_TRIP" || phase === "3") return "IN_TRIP";
  if (phase === "ARRIVED_AT_PICKUP" || phase === "12") return "ARRIVED_AT_PICKUP";
  if (phase === "ACCEPTED" || phase === "9") return "ACCEPTED";
  if (phase === "DISPATCHING" || phase === "2") return "DISPATCHING";
  if (phase === "CANCELLED" || ["4", "10", "13", "14", "20", "21", "26", "27"].includes(phase)) {
    return "CANCELLED";
  }
  if (phase === "FAILED" || phase === "FAIL" || phase === "FAILURE") {
    return "FAILED";
  }
  if (detail.finalAmountFen !== null) return "FINISHED";
  return null;
}

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const normalizeDriverSnapshot = (
  driver: RideHailingProviderOrderDetail["driver"],
): RideHailingDriverSnapshot | null => {
  if (!driver) return null;
  const driverName = normalizeOptionalString(driver.driverName);
  const driverPhone = normalizeOptionalString(driver.driverPhone);
  if (!driverName && !driverPhone) return null;
  return {
    driverName,
    driverPhone,
  };
};

const normalizeVehicleSnapshot = (
  vehicle: RideHailingProviderOrderDetail["vehicle"],
): RideHailingVehicleSnapshot | null => {
  if (!vehicle) return null;
  const plate = normalizeOptionalString(vehicle.plate);
  const brand = normalizeOptionalString(vehicle.brand);
  const color = normalizeOptionalString(vehicle.color);
  if (!plate && !brand && !color) return null;
  return {
    plate,
    brand,
    color,
  };
};

export function observeProviderOrderDetail(input: {
  detail: RideHailingProviderOrderDetail;
  providerOrderId: string;
}): RideHailingProviderOrderObservation {
  return {
    executionPhase: mapProviderDetailPhaseToExecutionPhase(input.detail),
    driverSnapshot: normalizeDriverSnapshot(input.detail.driver),
    vehicleSnapshot: normalizeVehicleSnapshot(input.detail.vehicle),
    finalSettlementInput:
      input.detail.finalAmountFen !== null
        ? {
            amountFen: input.detail.finalAmountFen,
            currency: "CNY",
            providerOrderId: input.providerOrderId,
            providerSnapshot: input.detail.providerSnapshot,
          }
        : null,
  };
}

export function mergeDriverSnapshot(input: {
  current: RideHailingDriverSnapshot | null;
  observed: RideHailingDriverSnapshot | null;
}): RideHailingDriverSnapshot | null {
  if (!input.observed) return input.current;
  return {
    driverName: input.observed.driverName ?? input.current?.driverName ?? null,
    driverPhone: input.observed.driverPhone ?? input.current?.driverPhone ?? null,
  };
}

export function mergeVehicleSnapshot(input: {
  current: RideHailingVehicleSnapshot | null;
  observed: RideHailingVehicleSnapshot | null;
}): RideHailingVehicleSnapshot | null {
  if (!input.observed) return input.current;
  return {
    plate: input.observed.plate ?? input.current?.plate ?? null,
    brand: input.observed.brand ?? input.current?.brand ?? null,
    color: input.observed.color ?? input.current?.color ?? null,
  };
}
