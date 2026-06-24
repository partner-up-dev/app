export type FakeCaocaoVehicleEstimate = {
  carType: string;
  carTypeName: string;
  estimateAmountFen: number;
  distanceMeters: number;
  durationSeconds: number;
};

export type FakeCaocaoCoordinate = {
  latitude: number;
  longitude: number;
};

export type FakeCaocaoCachedRouteKind = "PICKUP" | "DROPOFF";

export type FakeCaocaoDriverSnapshot = {
  driverName: string;
  driverPhone: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleColor: string;
  latitude: number;
  longitude: number;
  direction: number;
  speedKph: number;
};

export type FakeCaocaoOrderPhase =
  | "CREATED"
  | "ACCEPTED"
  | "ARRIVED_AT_PICKUP"
  | "IN_TRIP"
  | "FINISHED"
  | "CANCELLED";

export type FakeCaocaoOrderState = {
  providerOrderId: string;
  externalOrderId: string;
  callbackUrl: string | null;
  carType: string;
  phase: FakeCaocaoOrderPhase;
  origin: FakeCaocaoCoordinate;
  destination: FakeCaocaoCoordinate;
  queryCount: number;
  finalAmountFen: number;
  cancelFeeFen: number;
  createdAt: string;
  updatedAt: string;
};

export type FakeCaocaoFeeConfirmState = {
  providerOrderId: string;
  allowanceAmountFen: number | null;
  caocaoAllowanceAmountFen: number | null;
  confirmedAt: string;
};

export type FakeCaocaoStateSnapshot = {
  readonly failNextCreate: boolean;
  readonly estimates: readonly FakeCaocaoVehicleEstimate[];
  readonly unavailableEstimateCarTypes: readonly string[];
  readonly orders: readonly FakeCaocaoOrderState[];
  readonly feeConfirms: readonly FakeCaocaoFeeConfirmState[];
};

const nowIso = (): string => new Date().toISOString();

const sanitizeProviderId = (value: string): string =>
  value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 48);

const defaultEstimates = (): FakeCaocaoVehicleEstimate[] => [
  {
    carType: "EXPRESS",
    carTypeName: "快车",
    distanceMeters: 8200,
    durationSeconds: 1500,
    estimateAmountFen: 3600,
  },
  {
    carType: "PREMIER",
    carTypeName: "专车",
    distanceMeters: 8200,
    durationSeconds: 1500,
    estimateAmountFen: 5200,
  },
];

const defaultOrigin = (): FakeCaocaoCoordinate => ({
  latitude: 30.2688,
  longitude: 120.1608,
});

const defaultDestination = (): FakeCaocaoCoordinate => ({
  latitude: 30.2872,
  longitude: 120.1766,
});

const terminalOrderPhases = new Set<FakeCaocaoOrderPhase>(["FINISHED", "CANCELLED"]);
const nonRetreatableOrderPhases = new Set<FakeCaocaoOrderPhase>(["CREATED", "CANCELLED"]);

const nextOrderPhase = (phase: FakeCaocaoOrderPhase): FakeCaocaoOrderPhase => {
  if (phase === "CREATED") return "ACCEPTED";
  if (phase === "ACCEPTED") return "ARRIVED_AT_PICKUP";
  if (phase === "ARRIVED_AT_PICKUP") return "IN_TRIP";
  if (phase === "IN_TRIP") return "FINISHED";
  return phase;
};

const previousOrderPhase = (phase: FakeCaocaoOrderPhase): FakeCaocaoOrderPhase => {
  if (phase === "ACCEPTED") return "CREATED";
  if (phase === "ARRIVED_AT_PICKUP") return "ACCEPTED";
  if (phase === "IN_TRIP") return "ARRIVED_AT_PICKUP";
  if (phase === "FINISHED") return "IN_TRIP";
  return phase;
};

export class FakeCaocaoState {
  private failNextCreate = false;
  private readonly estimates = new Map<string, FakeCaocaoVehicleEstimate>();
  private readonly unavailableEstimateCarTypes = new Set<string>();
  private readonly orders = new Map<string, FakeCaocaoOrderState>();
  private readonly routePlans = new Map<
    string,
    Partial<Record<FakeCaocaoCachedRouteKind, FakeCaocaoCoordinate[]>>
  >();
  private readonly feeConfirms: FakeCaocaoFeeConfirmState[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.failNextCreate = false;
    this.estimates.clear();
    this.unavailableEstimateCarTypes.clear();
    for (const estimate of defaultEstimates()) {
      this.estimates.set(estimate.carType, estimate);
    }
    this.orders.clear();
    this.routePlans.clear();
    this.feeConfirms.length = 0;
  }

  snapshot(): FakeCaocaoStateSnapshot {
    return {
      estimates: [...this.estimates.values()],
      failNextCreate: this.failNextCreate,
      feeConfirms: [...this.feeConfirms],
      orders: [...this.orders.values()],
      unavailableEstimateCarTypes: [...this.unavailableEstimateCarTypes],
    };
  }

  configureNextCreateFailure(): void {
    this.failNextCreate = true;
  }

  consumeNextCreateFailure(): boolean {
    if (!this.failNextCreate) return false;
    this.failNextCreate = false;
    return true;
  }

  findEstimate(carType: string): FakeCaocaoVehicleEstimate {
    return this.estimates.get(carType) ?? this.estimates.get("EXPRESS") ?? defaultEstimates()[0]!;
  }

  findAvailableEstimate(carType: string): FakeCaocaoVehicleEstimate | null {
    const estimate = this.findEstimate(carType);
    return this.unavailableEstimateCarTypes.has(estimate.carType) ? null : estimate;
  }

  setEstimateAvailability(input: {
    carType: string;
    available: boolean;
  }): FakeCaocaoVehicleEstimate {
    const carType = input.carType.trim();
    if (!carType) {
      throw new Error("Missing fake Caocao car type");
    }
    const current = this.estimates.get(carType);
    if (!current) {
      throw new Error(`Unknown fake Caocao car type: ${carType}`);
    }
    if (input.available) {
      this.unavailableEstimateCarTypes.delete(carType);
    } else {
      this.unavailableEstimateCarTypes.add(carType);
    }
    return current;
  }

  updateEstimate(input: {
    carType: string;
    estimateAmountFen: number;
    carTypeName?: string;
    distanceMeters?: number;
    durationSeconds?: number;
  }): FakeCaocaoVehicleEstimate {
    const carType = input.carType.trim();
    if (!carType) {
      throw new Error("Missing fake Caocao car type");
    }
    const current = this.estimates.get(carType);
    if (!current) {
      throw new Error(`Unknown fake Caocao car type: ${carType}`);
    }
    if (!Number.isFinite(input.estimateAmountFen) || input.estimateAmountFen < 0) {
      throw new Error("Fake Caocao estimate amount must be a non-negative number");
    }
    const updated: FakeCaocaoVehicleEstimate = {
      ...current,
      carTypeName: input.carTypeName?.trim() || current.carTypeName,
      distanceMeters:
        typeof input.distanceMeters === "number" ? input.distanceMeters : current.distanceMeters,
      durationSeconds:
        typeof input.durationSeconds === "number" ? input.durationSeconds : current.durationSeconds,
      estimateAmountFen: Math.round(input.estimateAmountFen),
    };
    this.estimates.set(carType, updated);
    return updated;
  }

  createOrder(input: {
    externalOrderId: string;
    carType: string;
    callbackUrl?: string | null;
    origin?: FakeCaocaoCoordinate | null;
    destination?: FakeCaocaoCoordinate | null;
  }): FakeCaocaoOrderState {
    const existing = [...this.orders.values()].find(
      (order) => order.externalOrderId === input.externalOrderId,
    );
    if (existing) return existing;

    const estimate = this.findEstimate(input.carType);
    const timestamp = nowIso();
    const order: FakeCaocaoOrderState = {
      cancelFeeFen: 0,
      callbackUrl: input.callbackUrl ?? null,
      carType: estimate.carType,
      createdAt: timestamp,
      destination: input.destination ?? defaultDestination(),
      externalOrderId: input.externalOrderId,
      finalAmountFen: estimate.estimateAmountFen + 400,
      origin: input.origin ?? defaultOrigin(),
      phase: "CREATED",
      providerOrderId: `CC${sanitizeProviderId(input.externalOrderId)}`,
      queryCount: 0,
      updatedAt: timestamp,
    };
    this.orders.set(order.providerOrderId, order);
    return order;
  }

  findRoutePlan(
    providerOrderId: string,
    routeKind: FakeCaocaoCachedRouteKind,
  ): FakeCaocaoCoordinate[] | null {
    return this.routePlans.get(providerOrderId)?.[routeKind] ?? null;
  }

  cacheRoutePlan(input: {
    providerOrderId: string;
    routeKind: FakeCaocaoCachedRouteKind;
    coordinates: readonly FakeCaocaoCoordinate[];
  }): void {
    const coordinates = input.coordinates.filter(
      (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
    );
    if (coordinates.length < 2) return;
    const current = this.routePlans.get(input.providerOrderId) ?? {};
    this.routePlans.set(input.providerOrderId, {
      ...current,
      [input.routeKind]: coordinates.map((point) => ({ ...point })),
    });
  }

  findOrder(providerOrderId: string): FakeCaocaoOrderState | null {
    return this.orders.get(providerOrderId) ?? null;
  }

  findLatestNonTerminalOrder(): FakeCaocaoOrderState | null {
    return (
      [...this.orders.values()].reverse().find((order) => !terminalOrderPhases.has(order.phase)) ??
      null
    );
  }

  findLatestRetreatableOrder(): FakeCaocaoOrderState | null {
    return (
      [...this.orders.values()]
        .reverse()
        .find((order) => !nonRetreatableOrderPhases.has(order.phase)) ?? null
    );
  }

  setOrderPhase(providerOrderId: string, phase: FakeCaocaoOrderPhase): FakeCaocaoOrderState | null {
    const order = this.orders.get(providerOrderId);
    if (!order) return null;

    const updated: FakeCaocaoOrderState = {
      ...order,
      phase,
      queryCount: phase === order.phase ? order.queryCount : 0,
      updatedAt: nowIso(),
    };
    this.orders.set(providerOrderId, updated);
    return updated;
  }

  advanceOrderPhase(providerOrderId: string): FakeCaocaoOrderState | null {
    const order = this.orders.get(providerOrderId);
    if (!order) return null;
    return this.setOrderPhase(providerOrderId, nextOrderPhase(order.phase));
  }

  advanceLatestNonTerminalOrder(): FakeCaocaoOrderState | null {
    const order = this.findLatestNonTerminalOrder();
    if (!order) return null;
    return this.advanceOrderPhase(order.providerOrderId);
  }

  retreatOrderPhase(providerOrderId: string): FakeCaocaoOrderState | null {
    const order = this.orders.get(providerOrderId);
    if (!order || nonRetreatableOrderPhases.has(order.phase)) return null;
    return this.setOrderPhase(providerOrderId, previousOrderPhase(order.phase));
  }

  retreatLatestOrder(): FakeCaocaoOrderState | null {
    const order = this.findLatestRetreatableOrder();
    if (!order) return null;
    return this.retreatOrderPhase(order.providerOrderId);
  }

  advanceOrderMovement(providerOrderId: string): FakeCaocaoOrderState | null {
    const order = this.orders.get(providerOrderId);
    if (!order) return null;
    const updated: FakeCaocaoOrderState = {
      ...order,
      queryCount: order.queryCount + 1,
      updatedAt: nowIso(),
    };
    this.orders.set(providerOrderId, updated);
    return updated;
  }

  cancelOrder(providerOrderId: string): FakeCaocaoOrderState | null {
    const order = this.orders.get(providerOrderId);
    if (!order) return null;

    const updated: FakeCaocaoOrderState = {
      ...order,
      cancelFeeFen: order.phase === "ACCEPTED" || order.phase === "ARRIVED_AT_PICKUP" ? 800 : 0,
      phase: "CANCELLED",
      updatedAt: nowIso(),
    };
    this.orders.set(providerOrderId, updated);
    return updated;
  }

  confirmFee(input: {
    providerOrderId: string;
    allowanceAmountFen: number | null;
    caocaoAllowanceAmountFen: number | null;
  }): FakeCaocaoFeeConfirmState {
    const confirmed: FakeCaocaoFeeConfirmState = {
      ...input,
      confirmedAt: nowIso(),
    };
    this.feeConfirms.push(confirmed);
    return confirmed;
  }
}
