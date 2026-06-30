import type { NewRideHailingOrder } from "../../../entities/ride-hailing-order";
import type { TradeOrderId } from "../../../entities/trade-order";
import {
  type CommerceOrderDetailDebugContext,
  logCommerceOrderDetailDebug,
} from "../../../lib/commerce-order-detail-debug";
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

const summarizeProviderDetail = (
  detail: RideHailingProviderOrderDetail,
): Record<string, unknown> => ({
  providerPhase: detail.phase,
  providerStatusLabel: detail.statusLabel,
  providerDriverName: detail.driver?.driverName ?? null,
  providerVehiclePlate: detail.vehicle?.plate ?? null,
  providerHasVehicleLocation: detail.vehicleLocation != null,
  providerFinalAmountFen: detail.finalAmountFen,
});

export async function syncRideHailingOrderWithProvider(input: {
  orderId: TradeOrderId;
  expectedProviderInstanceId?: string | null;
  expectedProviderOrderId?: string | null;
  trigger: RideHailingProviderSyncTrigger;
  debug?: CommerceOrderDetailDebugContext;
}): Promise<{
  mutated: boolean;
  providerDetail: RideHailingProviderOrderDetail;
}> {
  logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.start", {
    inputOrderId: input.orderId,
    expectedProviderInstanceId: input.expectedProviderInstanceId ?? null,
    expectedProviderOrderId: input.expectedProviderOrderId ?? null,
    trigger: input.trigger,
  });

  const context = await loadRideHailingProviderExecutionContext({
    orderId: input.orderId,
    expectedProviderInstanceId: input.expectedProviderInstanceId,
    expectedProviderOrderId: input.expectedProviderOrderId,
    debug: input.debug,
  });

  logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.context", {
    localOrderId: context.order.id,
    localOrderStatus: context.order.status,
    rideExecutionPhase: context.rideOrder.executionPhase,
    rideDriverName: context.rideOrder.driverSnapshot?.driverName ?? null,
    rideVehiclePlate: context.rideOrder.vehicleSnapshot?.plate ?? null,
    providerInstanceId: context.providerInstance.id,
    providerOrderId: context.providerOrderId,
  });

  let providerDetail: RideHailingProviderOrderDetail;
  try {
    providerDetail = await context.port.queryOrderDetail({
      providerOrderId: context.providerOrderId,
    });
  } catch (error) {
    logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.provider-detail.error", {
      localOrderId: context.order.id,
      providerInstanceId: context.providerInstance.id,
      providerOrderId: context.providerOrderId,
      trigger: input.trigger,
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack ?? null,
            }
          : error,
    });
    throw new RideHailingProviderSyncQueryError(
      "RideHailing provider order detail query failed",
      error,
    );
  }

  logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.provider-detail.success", {
    localOrderId: context.order.id,
    providerInstanceId: context.providerInstance.id,
    providerOrderId: context.providerOrderId,
    trigger: input.trigger,
    ...summarizeProviderDetail(providerDetail),
  });

  const observation = observeProviderOrderDetail({
    detail: providerDetail,
    providerOrderId: context.providerOrderId,
  });

  logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.observation", {
    localOrderId: context.order.id,
    providerOrderId: context.providerOrderId,
    trigger: input.trigger,
    observedExecutionPhase: observation.executionPhase ?? null,
    observedDriverName: observation.driverSnapshot?.driverName ?? null,
    observedVehiclePlate: observation.vehicleSnapshot?.plate ?? null,
    observedFinalSettlementProviderOrderId:
      observation.finalSettlementInput?.providerOrderId ?? null,
    observedFinalSettlementAmountFen: observation.finalSettlementInput?.amountFen ?? null,
  });

  const mutated = await db.transaction(async (tx) => {
    const transactionalContext = await loadRideHailingProviderExecutionContext(
      {
        orderId: input.orderId,
        expectedProviderInstanceId: input.expectedProviderInstanceId,
        expectedProviderOrderId: input.expectedProviderOrderId,
        debug: input.debug,
      },
      tx,
    );
    const tradeOrderRepo = new TradeOrderRepository(tx);
    const rideOrderRepo = new RideHailingOrderRepository(tx);
    const patch: Partial<NewRideHailingOrder> = {};

    logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.tx.context", {
      localOrderId: transactionalContext.order.id,
      localOrderStatus: transactionalContext.order.status,
      rideExecutionPhase: transactionalContext.rideOrder.executionPhase,
      rideDriverName: transactionalContext.rideOrder.driverSnapshot?.driverName ?? null,
      rideVehiclePlate: transactionalContext.rideOrder.vehicleSnapshot?.plate ?? null,
      providerInstanceId: transactionalContext.providerInstance.id,
      providerOrderId: transactionalContext.providerOrderId,
      trigger: input.trigger,
    });

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

    logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.tx.patch", {
      localOrderId: transactionalContext.order.id,
      trigger: input.trigger,
      patchKeys: Object.keys(patch),
      executionPhaseBefore: transactionalContext.rideOrder.executionPhase,
      executionPhaseAfter: patch.executionPhase ?? transactionalContext.rideOrder.executionPhase,
      driverChanged: "driverSnapshot" in patch,
      vehicleChanged: "vehicleSnapshot" in patch,
      finalSettlementCommitted: patch.finalSettlementInput !== undefined,
      shouldEnsureFinalBill,
    });

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
      logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.tx.persisted-ride-order", {
        localOrderId: transactionalContext.order.id,
        trigger: input.trigger,
        patchKeys: Object.keys(patch),
      });
    }

    if (transactionalContext.order.status === "INITIATING") {
      await tradeOrderRepo.updateStatus(transactionalContext.order.id, "OPEN");
      mutatedInTransaction = true;
      logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.tx.promote-order-status", {
        localOrderId: transactionalContext.order.id,
        fromStatus: transactionalContext.order.status,
        toStatus: "OPEN",
        trigger: input.trigger,
      });
    }

    if (shouldEnsureFinalBill) {
      const consequence = await applyRideHailingFinalSettlementConsequence(
        {
          orderId: transactionalContext.order.id,
        },
        tx,
      );
      mutatedInTransaction = mutatedInTransaction || consequence.applied;
      logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.tx.final-settlement", {
        localOrderId: transactionalContext.order.id,
        trigger: input.trigger,
        applied: consequence.applied,
        reason: consequence.reason ?? null,
      });
    }

    return mutatedInTransaction;
  });

  logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.complete", {
    inputOrderId: input.orderId,
    expectedProviderInstanceId: input.expectedProviderInstanceId ?? null,
    expectedProviderOrderId: input.expectedProviderOrderId ?? null,
    trigger: input.trigger,
    mutated,
    ...summarizeProviderDetail(providerDetail),
  });

  return {
    mutated,
    providerDetail,
  };
}
