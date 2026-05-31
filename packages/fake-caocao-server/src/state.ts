export type FakeCaocaoVehicleEstimate = {
  carType: string;
  carTypeName: string;
  estimateAmountFen: number;
  distanceMeters: number;
  durationSeconds: number;
};

export type FakeCaocaoDriverSnapshot = {
  driverName: string;
  driverPhone: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleColor: string;
  latitude: number;
  longitude: number;
};

export type FakeCaocaoOrderPhase =
  | "CREATED"
  | "ACCEPTED"
  | "IN_TRIP"
  | "FINISHED"
  | "CANCELLED";

export type FakeCaocaoOrderState = {
  providerOrderId: string;
  externalOrderId: string;
  carType: string;
  phase: FakeCaocaoOrderPhase;
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

export class FakeCaocaoState {
  private failNextCreate = false;
  private readonly estimates = new Map<string, FakeCaocaoVehicleEstimate>();
  private readonly orders = new Map<string, FakeCaocaoOrderState>();
  private readonly feeConfirms: FakeCaocaoFeeConfirmState[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.failNextCreate = false;
    this.estimates.clear();
    for (const estimate of defaultEstimates()) {
      this.estimates.set(estimate.carType, estimate);
    }
    this.orders.clear();
    this.feeConfirms.length = 0;
  }

  snapshot(): FakeCaocaoStateSnapshot {
    return {
      estimates: [...this.estimates.values()],
      failNextCreate: this.failNextCreate,
      feeConfirms: [...this.feeConfirms],
      orders: [...this.orders.values()],
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
    return (
      this.estimates.get(carType) ??
      this.estimates.get("EXPRESS") ??
      defaultEstimates()[0]!
    );
  }

  createOrder(input: {
    externalOrderId: string;
    carType: string;
  }): FakeCaocaoOrderState {
    const existing = [...this.orders.values()].find(
      (order) => order.externalOrderId === input.externalOrderId,
    );
    if (existing) return existing;

    const estimate = this.findEstimate(input.carType);
    const timestamp = nowIso();
    const order: FakeCaocaoOrderState = {
      cancelFeeFen: 0,
      carType: estimate.carType,
      createdAt: timestamp,
      externalOrderId: input.externalOrderId,
      finalAmountFen: estimate.estimateAmountFen + 400,
      phase: "CREATED",
      providerOrderId: `CC${sanitizeProviderId(input.externalOrderId)}`,
      queryCount: 0,
      updatedAt: timestamp,
    };
    this.orders.set(order.providerOrderId, order);
    return order;
  }

  findOrder(providerOrderId: string): FakeCaocaoOrderState | null {
    return this.orders.get(providerOrderId) ?? null;
  }

  advanceOrderDetail(providerOrderId: string): FakeCaocaoOrderState | null {
    const order = this.orders.get(providerOrderId);
    if (!order) return null;

    const nextQueryCount = order.queryCount + 1;
    const nextPhase: FakeCaocaoOrderPhase =
      order.phase === "CANCELLED"
        ? "CANCELLED"
        : nextQueryCount <= 1
          ? "ACCEPTED"
          : nextQueryCount === 2
            ? "IN_TRIP"
            : "FINISHED";

    const updated: FakeCaocaoOrderState = {
      ...order,
      phase: nextPhase,
      queryCount: nextQueryCount,
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
      cancelFeeFen: order.phase === "ACCEPTED" ? 800 : 0,
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
