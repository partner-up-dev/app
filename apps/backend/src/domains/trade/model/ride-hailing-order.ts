import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import type { TradeOrder } from "./order";

export type RideHailingCoordinateSnapshot = {
  latitude: number;
  longitude: number;
};

export type RideHailingPlaceSnapshot = RideHailingCoordinateSnapshot & {
  name: string;
  address?: string | null;
  providerPlaceId?: string | null;
};

export type RideHailingRouteSnapshot = {
  origin: RideHailingPlaceSnapshot;
  waypoints: RideHailingPlaceSnapshot[];
  destination: RideHailingPlaceSnapshot;
  drivingPlan?: {
    distanceMeters?: number | null;
    durationSeconds?: number | null;
    polyline?: RideHailingCoordinateSnapshot[] | null;
  } | null;
};

export type RideHailingRiderSnapshot = {
  userId: string;
  displayName: string;
  phoneMasked?: string | null;
};

export type RideHailingExecutionPhase =
  | "INITIATING"
  | "DISPATCHING"
  | "ACCEPTED"
  | "IN_TRIP"
  | "FINISHED"
  | "CANCELLED"
  | "FAILED";

export type RideHailingDriverSnapshot = {
  driverName?: string | null;
  driverPhone?: string | null;
};

export type RideHailingVehicleSnapshot = {
  plate?: string | null;
  brand?: string | null;
  color?: string | null;
};

export type RideHailingFinalSettlementInput = {
  amountFen: number;
  currency: "CNY";
  providerOrderId: string;
  committedAt: string;
  providerSnapshot?: unknown;
};

export type RideHailingOrder = Omit<TradeOrder, "family"> & {
  family: "RIDE_HAILING";
  routeSnapshot: RideHailingRouteSnapshot;
  departureAt?: string | null;
  riders: RideHailingRiderSnapshot[];
  contactPhone: string;
  providerInstanceId: RideHailingProviderInstanceId;
  providerOrderId?: string | null;
  executionPhase: RideHailingExecutionPhase;
  driverSnapshot?: RideHailingDriverSnapshot | null;
  vehicleSnapshot?: RideHailingVehicleSnapshot | null;
  finalSettlementInput?: RideHailingFinalSettlementInput | null;
};
