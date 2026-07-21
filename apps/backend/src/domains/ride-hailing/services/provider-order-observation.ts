import type {
  RideHailingDriverSnapshot,
  RideHailingExecutionPhase,
  RideHailingVehicleSnapshot,
} from "../../trade/contracts";
import type { RideHailingProviderOrderDetail } from "../model";

export type RideHailingProviderOrderObservation = {
  executionPhase: RideHailingExecutionPhase | null;
  driverSnapshot: RideHailingDriverSnapshot | null;
  vehicleSnapshot: RideHailingVehicleSnapshot | null;
};

export type RideHailingExecutionPhaseReconciliation = {
  accepted: boolean;
  effectivePhase: RideHailingExecutionPhase;
  reason:
    | "OBSERVATION_UNMAPPED"
    | "SAME_PHASE"
    | "ACTIVE_PHASE_ADVANCED"
    | "ACTIVE_PHASE_REGRESSION"
    | "TERMINAL_PHASE_ACCEPTED"
    | "TERMINAL_PHASE_ALREADY_COMMITTED";
};

type TerminalRideHailingExecutionPhase = Extract<
  RideHailingExecutionPhase,
  "FINISHED" | "CANCELLED" | "FAILED"
>;

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

const activeExecutionPhaseRanks: Record<
  Exclude<RideHailingExecutionPhase, "FINISHED" | "CANCELLED" | "FAILED">,
  number
> = {
  INITIATING: 0,
  DISPATCHING: 1,
  ACCEPTED: 2,
  ARRIVED_AT_PICKUP: 3,
  IN_TRIP: 4,
};

const terminalExecutionPhases = new Set<RideHailingExecutionPhase>([
  "FINISHED",
  "CANCELLED",
  "FAILED",
]);

export function isRideHailingExecutionPhaseTerminal(
  phase: RideHailingExecutionPhase,
): phase is TerminalRideHailingExecutionPhase {
  return terminalExecutionPhases.has(phase);
}

/**
 * Provider callbacks and browser-triggered observations can arrive out of
 * order. A committed terminal projection is immutable in this bounded model;
 * a later correction requires an explicitly designed correction flow rather
 * than a silent state rewrite. Active phases use a single forward-only rank.
 */
export function reconcileRideHailingExecutionPhase(input: {
  current: RideHailingExecutionPhase;
  observed: RideHailingExecutionPhase | null;
}): RideHailingExecutionPhaseReconciliation {
  if (!input.observed) {
    return {
      accepted: false,
      effectivePhase: input.current,
      reason: "OBSERVATION_UNMAPPED",
    };
  }

  if (input.observed === input.current) {
    return {
      accepted: false,
      effectivePhase: input.current,
      reason: "SAME_PHASE",
    };
  }

  if (isRideHailingExecutionPhaseTerminal(input.current)) {
    return {
      accepted: false,
      effectivePhase: input.current,
      reason: "TERMINAL_PHASE_ALREADY_COMMITTED",
    };
  }

  if (isRideHailingExecutionPhaseTerminal(input.observed)) {
    return {
      accepted: true,
      effectivePhase: input.observed,
      reason: "TERMINAL_PHASE_ACCEPTED",
    };
  }

  if (activeExecutionPhaseRanks[input.observed] > activeExecutionPhaseRanks[input.current]) {
    return {
      accepted: true,
      effectivePhase: input.observed,
      reason: "ACTIVE_PHASE_ADVANCED",
    };
  }

  return {
    accepted: false,
    effectivePhase: input.current,
    reason: "ACTIVE_PHASE_REGRESSION",
  };
}

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
  const driverAvatarUrl = normalizeOptionalString(driver.driverAvatarUrl);
  const driverName = normalizeOptionalString(driver.driverName);
  const driverPhone = normalizeOptionalString(driver.driverPhone);
  if (!driverAvatarUrl && !driverName && !driverPhone) return null;
  return {
    driverAvatarUrl,
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
    driverAvatarUrl: input.observed.driverAvatarUrl ?? input.current?.driverAvatarUrl ?? null,
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
