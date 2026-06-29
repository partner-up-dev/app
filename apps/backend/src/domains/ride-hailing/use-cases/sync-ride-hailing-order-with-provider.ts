import type { NewRideHailingOrder } from "../../../entities/ride-hailing-order";
import type { TradeOrderId } from "../../../entities/trade-order";
import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import type { RideHailingProviderOrderDetail } from "../model";
import { mergeDriverSnapshot, mergeVehicleSnapshot, observeProviderOrderDetail } from "../services";
import { applyRideHailingFinalSettlementConsequence } from "./apply-ride-hailing-final-settlement-consequence";
import { loadRideHailingProviderExecutionContext } from "./provider-execution-context";

export class RideHailingProviderSyncQueryError extends Error {
  constructor(
    message: string,
    readonly originalError: unknown,
  ) {
    super(message);
    this.name = "RideHailingProviderSyncQueryError";
  }
}

export type RideHailingProviderSyncTrigger =
  | "ORDER_DETAIL_POLL"
  | "CAOCAO_CALLBACK"
  | "CANCEL_REQUEST";

const jsonEqual = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

export async function syncRideHailingOrderWithProvider(input: {
  orderId: TradeOrderId;
  expectedProviderInstanceId?: string | null;
  expectedProviderOrderId?: string | null;
  trigger: RideHailingProviderSyncTrigger;
}): Promise<{
  mutated: boolean;
  providerDetail: RideHailingProviderOrderDetail;
}> {
  const context = await loadRideHailingProviderExecutionContext({
    orderId: input.orderId,
    expectedProviderInstanceId: input.expectedProviderInstanceId,
    expectedProviderOrderId: input.expectedProviderOrderId,
  });

  let providerDetail: RideHailingProviderOrderDetail;
  try {
    providerDetail = await context.port.queryOrderDetail({
      providerOrderId: context.providerOrderId,
    });
  } catch (error) {
    throw new RideHailingProviderSyncQueryError(
      "RideHailing provider order detail query failed",
      error,
    );
  }

  const observation = observeProviderOrderDetail({
    detail: providerDetail,
    providerOrderId: context.providerOrderId,
  });

  const mutated = await db.transaction(async (tx) => {
    const transactionalContext = await loadRideHailingProviderExecutionContext(
      {
        orderId: input.orderId,
        expectedProviderInstanceId: input.expectedProviderInstanceId,
        expectedProviderOrderId: input.expectedProviderOrderId,
      },
      tx,
    );
    const tradeOrderRepo = new TradeOrderRepository(tx);
    const rideOrderRepo = new RideHailingOrderRepository(tx);
    const patch: Partial<NewRideHailingOrder> = {};

    if (
      observation.executionPhase &&
      observation.executionPhase !== transactionalContext.rideOrder.executionPhase
    ) {
      patch.executionPhase = observation.executionPhase;
    }

    const driverSnapshot = mergeDriverSnapshot({
      current: transactionalContext.rideOrder.driverSnapshot,
      observed: observation.driverSnapshot,
    });
    if (!jsonEqual(driverSnapshot, transactionalContext.rideOrder.driverSnapshot)) {
      patch.driverSnapshot = driverSnapshot;
    }

    const vehicleSnapshot = mergeVehicleSnapshot({
      current: transactionalContext.rideOrder.vehicleSnapshot,
      observed: observation.vehicleSnapshot,
    });
    if (!jsonEqual(vehicleSnapshot, transactionalContext.rideOrder.vehicleSnapshot)) {
      patch.vehicleSnapshot = vehicleSnapshot;
    }

    const shouldEnsureFinalBill =
      observation.finalSettlementInput !== null ||
      transactionalContext.rideOrder.finalSettlementInput !== null;
    if (observation.finalSettlementInput) {
      const currentFinalSettlementInput = transactionalContext.rideOrder.finalSettlementInput;
      if (!currentFinalSettlementInput) {
        patch.finalSettlementInput = {
          ...observation.finalSettlementInput,
          committedAt: new Date().toISOString(),
        };
      } else if (
        currentFinalSettlementInput.providerOrderId !==
          observation.finalSettlementInput.providerOrderId ||
        currentFinalSettlementInput.amountFen !== observation.finalSettlementInput.amountFen
      ) {
        return throwHttpProblem({
          status: 409,
          detail: "RideHailing final settlement input conflicts with committed value",
        });
      }
    }

    let mutatedInTransaction = false;
    if (Object.keys(patch).length > 0) {
      const updated = await rideOrderRepo.updateByOrderId(
        transactionalContext.rideOrder.orderId,
        patch,
      );
      if (!updated) {
        return throwHttpProblem({
          status: 500,
          detail: "Failed to persist RideHailing provider sync",
        });
      }
      mutatedInTransaction = true;
    }

    if (transactionalContext.order.status === "INITIATING") {
      await tradeOrderRepo.updateStatus(transactionalContext.order.id, "OPEN");
      mutatedInTransaction = true;
    }

    if (shouldEnsureFinalBill) {
      const consequence = await applyRideHailingFinalSettlementConsequence(
        {
          orderId: transactionalContext.order.id,
        },
        tx,
      );
      mutatedInTransaction = mutatedInTransaction || consequence.applied;
    }

    return mutatedInTransaction;
  });

  return {
    mutated,
    providerDetail,
  };
}
