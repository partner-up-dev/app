import type { RideHailingQuoteSnapshot, TradeOrder } from "./order";

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
  | "ARRIVED_AT_PICKUP"
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

export type RideHailingDispatchSubmittedCandidateSnapshot = {
  skuId: number;
  spuId: number;
  displayName: string;
  providerVehicleTypeCode: string;
  providerVehicleTypeName: string;
  quoteSnapshot: RideHailingQuoteSnapshot;
};

export type RideHailingDispatchBindingSnapshot = {
  providerInstanceId: string;
  providerType?: string | null;
  providerOrderId: string;
  externalOrderId?: string | null;
  submittedAt: string;
  submissionMode: "SINGLE_CANDIDATE" | "MULTI_CANDIDATE";
  submittedCandidates: RideHailingDispatchSubmittedCandidateSnapshot[];
  providerSnapshot?: unknown;
};

export type RideHailingOrder = Omit<TradeOrder, "family"> & {
  family: "RIDE_HAILING";
  routeSnapshot: RideHailingRouteSnapshot;
  departureAt?: string | null;
  riders: RideHailingRiderSnapshot[];
  contactPhone: string;
  executionPhase: RideHailingExecutionPhase;
  driverSnapshot?: RideHailingDriverSnapshot | null;
  vehicleSnapshot?: RideHailingVehicleSnapshot | null;
  dispatchBinding?: RideHailingDispatchBindingSnapshot | null;
  finalSettlementInput?: RideHailingFinalSettlementInput | null;
};
