import { z } from "zod";

export type RideHailingProviderType = "CAOCAO";

export type RideHailingProviderInstanceStatus = "ACTIVE" | "DISABLED";

export const caocaoProviderInstanceConfigSchema = z.object({
  adapterMode: z.literal("CAOCAO_OPEN_API"),
  caocaoClientId: z.string().min(1),
  signKey: z.string().min(1),
  endpointBaseUrl: z.string().url(),
  callbackBaseUrl: z.string().url().nullable().optional(),
  requestTimeoutMs: z.number().int().positive().nullable().optional(),
});

export type CaocaoProviderInstanceConfig = z.infer<typeof caocaoProviderInstanceConfigSchema>;

export type RideHailingProviderInstanceConfig = CaocaoProviderInstanceConfig;

export type RideHailingProviderRegisterInput = {
  providerType: RideHailingProviderType;
  instanceKey: string;
  displayName: string;
  config: RideHailingProviderInstanceConfig;
};

export type CaocaoSignedParams = Record<string, string>;

export type CaocaoRawResponse<TData = unknown> = {
  code: number;
  success?: boolean | null;
  msg?: string | null;
  data?: TData | null;
};

export type CaocaoOrderStatusCallbackEvent =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 9
  | 11
  | 12
  | 13
  | 14
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 40
  | 41
  | 42
  | 43
  | 44
  | 45
  | 46
  | 47
  | 48
  | 49
  | 50;

export type CaocaoOrderStatusCallback = {
  providerType: "CAOCAO";
  providerOrderId: string;
  externalOrderId: string;
  localOrderId: string | null;
  event: CaocaoOrderStatusCallbackEvent;
  timestampMs: number;
  raw: Record<string, string>;
};

export type RideHailingProviderEstimateInput = {
  params: Record<string, string | number | boolean | null | undefined>;
};

export type RideHailingProviderVehicleQuote = {
  providerVehicleTypeCode: string;
  providerVehicleTypeName: string;
  estimateAmountFen: number;
  distanceMeters: number | null;
  durationSeconds: number | null;
  providerQuoteId: string | null;
  providerQuoteExpiresAt: string | null;
  providerSnapshot: unknown;
};

export type RideHailingProviderCoordinate = {
  latitude: number;
  longitude: number;
};

export type RideHailingProviderVehicleLocation = RideHailingProviderCoordinate & {
  capturedAt: string | null;
  headingDegrees: number | null;
  speedKph: number | null;
  providerSnapshot: unknown;
};

export type RideHailingProviderNavigationRouteKind =
  | "PICKUP"
  | "DROPOFF"
  | "WAITING"
  | "RELAY_PREVIOUS_DROPOFF"
  | "UNKNOWN";

export type RideHailingProviderNavigationRoute = {
  routeKind: RideHailingProviderNavigationRouteKind;
  polyline: RideHailingProviderCoordinate[];
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  trafficLightCount: number | null;
  vehicleLocation: RideHailingProviderVehicleLocation | null;
  providerSnapshot: unknown;
};

export type RideHailingProviderOrderDetail = {
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
  vehicleLocation: RideHailingProviderVehicleLocation | null;
  providerSnapshot: unknown;
};

export type RideHailingProviderCreateRideInput = {
  orderId: string;
  params: Record<string, string | number | boolean | null | undefined>;
};

export type RideHailingProviderCancelInput = {
  providerOrderId: string;
  cancelCode: string | number;
  cancelReason: string;
  whoCancel?: string | number | null;
};

export type RideHailingProviderConfirmFeeInput = {
  providerOrderId: string;
  allowanceAmountFen?: number | null;
  caocaoAllowanceAmountFen?: number | null;
};

export type RideHailingProviderPort = {
  buildExternalOrderId(orderId: string): string;
  parseExternalOrderId(externalOrderId: string): string | null;
  estimate(input: RideHailingProviderEstimateInput): Promise<RideHailingProviderVehicleQuote>;
  createRide(input: RideHailingProviderCreateRideInput): Promise<{
    providerOrderId: string;
    externalOrderId: string;
    providerSnapshot: unknown;
  }>;
  queryOrderDetail(input: { providerOrderId: string }): Promise<RideHailingProviderOrderDetail>;
  queryDriverLocation(input: {
    providerOrderId: string;
  }): Promise<RideHailingProviderVehicleLocation | null>;
  queryDriverRoute(input: {
    providerOrderId: string;
  }): Promise<RideHailingProviderNavigationRoute | null>;
  cancelRide(input: RideHailingProviderCancelInput): Promise<{
    providerOrderId: string;
    cancelFeeFen: number;
    providerSnapshot: unknown;
  }>;
  queryCancelFee(input: { providerOrderId: string }): Promise<{
    providerOrderId: string;
    cancelFeeFen: number;
    providerSnapshot: unknown;
  }>;
  confirmFee(input: RideHailingProviderConfirmFeeInput): Promise<void>;
  parseOrderStatusCallback(form: Record<string, string>): CaocaoOrderStatusCallback;
};
