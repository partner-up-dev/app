import type {
  RideHailingDriverSnapshot,
  RideHailingExecutionPhase,
  RideHailingVehicleSnapshot,
} from "../../trade/model";
import type { RideHailingProviderOrderDetail } from "../model";

export type RideHailingProviderOrderObservation = {
  executionPhase: RideHailingExecutionPhase | null;
  driverSnapshot: RideHailingDriverSnapshot | null;
  vehicleSnapshot: RideHailingVehicleSnapshot | null;
};

const normalizePhase = (phase: string): string => phase.trim().toUpperCase();

const providerFinishedPhases = new Set(["FINISHED", "5", "6", "7", "8"]);
const providerInTripPhases = new Set(["IN_TRIP", "3"]);
const providerArrivedAtPickupPhases = new Set(["ARRIVED_AT_PICKUP", "12"]);
const providerAcceptedPhases = new Set(["ACCEPTED", "2", "9"]);
const providerDispatchingPhases = new Set(["DISPATCHING", "1", "11"]);
const providerCancelledPhases = new Set([
  "CANCELLED",
  "4",
  "10",
  "13",
  "14",
  "20",
  "21",
  "26",
  "27",
]);
const providerFailedPhases = new Set(["FAILED", "FAIL", "FAILURE"]);

export function mapProviderDetailPhaseToExecutionPhase(
  detail: Pick<RideHailingProviderOrderDetail, "phase">,
): RideHailingExecutionPhase | null {
  const phase = normalizePhase(detail.phase);
  if (providerFinishedPhases.has(phase)) return "FINISHED";
  if (providerInTripPhases.has(phase)) return "IN_TRIP";
  if (providerArrivedAtPickupPhases.has(phase)) return "ARRIVED_AT_PICKUP";
  if (providerAcceptedPhases.has(phase)) return "ACCEPTED";
  if (providerDispatchingPhases.has(phase)) return "DISPATCHING";
  if (providerCancelledPhases.has(phase)) return "CANCELLED";
  if (providerFailedPhases.has(phase)) return "FAILED";
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
}): RideHailingProviderOrderObservation {
  return {
    executionPhase: mapProviderDetailPhaseToExecutionPhase(input.detail),
    driverSnapshot: normalizeDriverSnapshot(input.detail.driver),
    vehicleSnapshot: normalizeVehicleSnapshot(input.detail.vehicle),
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
