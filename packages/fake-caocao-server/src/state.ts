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
  acceptedAt: string | null;
  arrivedAt: string | null;
  providerOrderId: string;
  externalOrderId: string;
  callbackUrl: string | null;
  callbackInfo: string | null;
  callerPhone: string;
  canceledAt: string | null;
  carType: string;
  cityCode: string;
  departureTime: string | null;
  endAddress: string;
  endName: string;
  estimatePriceFen: number;
  finishedAt: string | null;
  orderType: number;
  phase: FakeCaocaoOrderPhase;
  passengerName: string;
  passengerPhone: string;
  origin: FakeCaocaoCoordinate;
  destination: FakeCaocaoCoordinate;
  queryCount: number;
  finalAmountFen: number;
  cancelFeeFen: number;
  serviceStartedAt: string | null;
  startAddress: string;
  startName: string;
  submittedCarTypes: string[];
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
  readonly createRequestCount: number;
  readonly dropNextCreateResponseAfterAccept: boolean;
  readonly failNextCreate: boolean;
  readonly estimates: readonly FakeCaocaoVehicleEstimate[];
  readonly unavailableEstimateCarTypes: readonly string[];
  readonly orders: readonly FakeCaocaoOrderState[];
  readonly feeConfirms: readonly FakeCaocaoFeeConfirmState[];
};

const nowIso = (): string => new Date().toISOString();

const sanitizeProviderId = (value: string): string =>
  value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 48);

const normalizeSubmittedCarTypes = (
  values: string[] | null | undefined,
  fallback: string,
): string[] => {
  const normalized =
    values?.map((carType) => carType.trim()).filter((carType) => carType.length > 0) ?? [];
  return normalized.length > 0 ? normalized : [fallback];
};

const defaultEstimates = (): FakeCaocaoVehicleEstimate[] => [
  {
    carType: "2",
    carTypeName: "新能源",
    distanceMeters: 8200,
    durationSeconds: 1500,
    estimateAmountFen: 3200,
  },
  {
    carType: "3",
    carTypeName: "快车",
    distanceMeters: 8200,
    durationSeconds: 1500,
    estimateAmountFen: 3600,
  },
  {
    carType: "4",
    carTypeName: "豪华型",
    distanceMeters: 8200,
    durationSeconds: 1500,
    estimateAmountFen: 4800,
  },
  {
    carType: "5",
    carTypeName: "专车",
    distanceMeters: 8200,
    durationSeconds: 1500,
    estimateAmountFen: 5200,
  },
  {
    carType: "7",
    carTypeName: "优选",
    distanceMeters: 8200,
    durationSeconds: 1500,
    estimateAmountFen: 4100,
  },
  {
    carType: "12",
    carTypeName: "超惠",
    distanceMeters: 8200,
    durationSeconds: 1500,
    estimateAmountFen: 3000,
  },
  {
    carType: "14",
    carTypeName: "智能大白车",
    distanceMeters: 8200,
    durationSeconds: 1500,
    estimateAmountFen: 3900,
  },
  {
    carType: "15",
    carTypeName: "礼帽专车",
    distanceMeters: 8200,
    durationSeconds: 1500,
    estimateAmountFen: 6800,
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

const calculateCancelFeeFen = (phase: FakeCaocaoOrderPhase): number =>
  phase === "ACCEPTED" || phase === "ARRIVED_AT_PICKUP" ? 800 : 0;
const activeOrderPhases: FakeCaocaoOrderPhase[] = [
  "CREATED",
  "ACCEPTED",
  "ARRIVED_AT_PICKUP",
  "IN_TRIP",
  "FINISHED",
];

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

const phaseRank = (phase: FakeCaocaoOrderPhase): number => {
  if (phase === "CANCELLED") return activeOrderPhases.length;
  return activeOrderPhases.indexOf(phase);
};

const syncPhaseTimestamps = (
  order: FakeCaocaoOrderState,
  phase: FakeCaocaoOrderPhase,
  timestamp: string,
): Pick<
  FakeCaocaoOrderState,
  "acceptedAt" | "arrivedAt" | "canceledAt" | "finishedAt" | "serviceStartedAt"
> => {
  const next: Pick<
    FakeCaocaoOrderState,
    "acceptedAt" | "arrivedAt" | "canceledAt" | "finishedAt" | "serviceStartedAt"
  > = {
    acceptedAt: order.acceptedAt,
    arrivedAt: order.arrivedAt,
    canceledAt: order.canceledAt,
    finishedAt: order.finishedAt,
    serviceStartedAt: order.serviceStartedAt,
  };

  if (phase === "CREATED") {
    return {
      acceptedAt: null,
      arrivedAt: null,
      canceledAt: null,
      finishedAt: null,
      serviceStartedAt: null,
    };
  }

  if (phase === "CANCELLED") {
    if (!next.canceledAt) next.canceledAt = timestamp;
    if (phaseRank(order.phase) >= phaseRank("ACCEPTED") && !next.acceptedAt) {
      next.acceptedAt = timestamp;
    }
    return next;
  }

  next.canceledAt = null;
  if (phaseRank(phase) < phaseRank("FINISHED")) next.finishedAt = null;
  if (phaseRank(phase) < phaseRank("IN_TRIP")) next.serviceStartedAt = null;
  if (phaseRank(phase) < phaseRank("ARRIVED_AT_PICKUP")) next.arrivedAt = null;

  if (phaseRank(phase) >= phaseRank("ACCEPTED") && !next.acceptedAt) next.acceptedAt = timestamp;
  if (phaseRank(phase) >= phaseRank("ARRIVED_AT_PICKUP") && !next.arrivedAt) {
    next.arrivedAt = timestamp;
  }
  if (phaseRank(phase) >= phaseRank("IN_TRIP") && !next.serviceStartedAt) {
    next.serviceStartedAt = timestamp;
  }
  if (phaseRank(phase) >= phaseRank("FINISHED") && !next.finishedAt) next.finishedAt = timestamp;
  return next;
};

export class FakeCaocaoState {
  private createRequestCount = 0;
  private dropNextCreateResponseAfterAccept = false;
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
    this.createRequestCount = 0;
    this.dropNextCreateResponseAfterAccept = false;
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
      createRequestCount: this.createRequestCount,
      dropNextCreateResponseAfterAccept: this.dropNextCreateResponseAfterAccept,
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

  recordCreateRequest(): void {
    this.createRequestCount += 1;
  }

  configureNextCreateResponseLoss(): void {
    this.dropNextCreateResponseAfterAccept = true;
  }

  consumeNextCreateResponseLoss(): boolean {
    if (!this.dropNextCreateResponseAfterAccept) return false;
    this.dropNextCreateResponseAfterAccept = false;
    return true;
  }

  consumeNextCreateFailure(): boolean {
    if (!this.failNextCreate) return false;
    this.failNextCreate = false;
    return true;
  }

  findEstimate(carType: string): FakeCaocaoVehicleEstimate {
    return this.estimates.get(carType) ?? this.estimates.get("3") ?? defaultEstimates()[0]!;
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
    submittedCarTypes?: string[] | null;
    callbackInfo?: string | null;
    callbackUrl?: string | null;
    callerPhone?: string | null;
    cityCode?: string | null;
    departureTime?: string | null;
    endAddress?: string | null;
    endName?: string | null;
    estimatePriceFen?: number | null;
    orderType?: number | null;
    origin?: FakeCaocaoCoordinate | null;
    destination?: FakeCaocaoCoordinate | null;
    passengerName?: string | null;
    passengerPhone?: string | null;
    startAddress?: string | null;
    startName?: string | null;
  }): FakeCaocaoOrderState {
    const existing = [...this.orders.values()].find(
      (order) => order.externalOrderId === input.externalOrderId,
    );
    if (existing) return existing;

    const estimate = this.findEstimate(input.carType);
    const timestamp = nowIso();
    const estimatePriceFen =
      typeof input.estimatePriceFen === "number" && Number.isFinite(input.estimatePriceFen)
        ? Math.round(input.estimatePriceFen)
        : estimate.estimateAmountFen;
    const order: FakeCaocaoOrderState = {
      acceptedAt: null,
      arrivedAt: null,
      cancelFeeFen: 0,
      callbackInfo: input.callbackInfo ?? null,
      callbackUrl: input.callbackUrl ?? null,
      callerPhone: input.callerPhone?.trim() || "13800138000",
      canceledAt: null,
      carType: estimate.carType,
      cityCode: input.cityCode?.trim() || "0571",
      createdAt: timestamp,
      departureTime: input.departureTime?.trim() || null,
      destination: input.destination ?? defaultDestination(),
      endAddress: input.endAddress?.trim() || "Fake Destination Address",
      endName: input.endName?.trim() || "Fake Destination",
      estimatePriceFen,
      externalOrderId: input.externalOrderId,
      finalAmountFen: estimatePriceFen + 400,
      finishedAt: null,
      orderType:
        typeof input.orderType === "number" && Number.isInteger(input.orderType)
          ? input.orderType
          : 1,
      origin: input.origin ?? defaultOrigin(),
      passengerName: input.passengerName?.trim() || "测试乘客",
      passengerPhone: input.passengerPhone?.trim() || input.callerPhone?.trim() || "13800138000",
      phase: "CREATED",
      providerOrderId: `CC${sanitizeProviderId(input.externalOrderId)}`,
      queryCount: 0,
      serviceStartedAt: null,
      startAddress: input.startAddress?.trim() || "Fake Origin Address",
      startName: input.startName?.trim() || "Fake Origin",
      submittedCarTypes: normalizeSubmittedCarTypes(input.submittedCarTypes, estimate.carType),
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
    const timestamp = nowIso();

    const updated: FakeCaocaoOrderState = {
      ...order,
      phase,
      queryCount: phase === order.phase ? order.queryCount : 0,
      updatedAt: timestamp,
      ...syncPhaseTimestamps(order, phase, timestamp),
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
    const timestamp = nowIso();

    const updated: FakeCaocaoOrderState = {
      ...order,
      cancelFeeFen: calculateCancelFeeFen(order.phase),
      phase: "CANCELLED",
      queryCount: 0,
      updatedAt: timestamp,
      ...syncPhaseTimestamps(order, "CANCELLED", timestamp),
    };
    this.orders.set(providerOrderId, updated);
    return updated;
  }

  previewCancelFee(providerOrderId: string): number | null {
    const order = this.orders.get(providerOrderId);
    if (!order) return null;
    if (order.phase === "CANCELLED") return order.cancelFeeFen;
    return calculateCancelFeeFen(order.phase);
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
