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

export type RideHailingProviderCreationStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "UNKNOWN";

export type RideHailingOrder = Omit<TradeOrder, "family"> & {
  family: "RIDE_HAILING";
  routeSnapshot: RideHailingRouteSnapshot;
  departureAt?: string | null;
  riders: RideHailingRiderSnapshot[];
  contactPhone: string;
  providerCreationStatus: RideHailingProviderCreationStatus;
};
