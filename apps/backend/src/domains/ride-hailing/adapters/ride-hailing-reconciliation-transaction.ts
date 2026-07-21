import { randomUUID } from "node:crypto";
import type { NewRideHailingOrder } from "../../../entities/ride-hailing-order";
import type { TradeOrderId } from "../../../entities/trade-order";
import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import { BillRepository } from "../../../repositories/BillRepository";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { createBillFromSeed } from "../../bill/commands";
import { materializeChargeLinesFromSplitRule } from "../../bill/contracts";
import {
  closeRideHailingOrderFromProviderCancellation,
  getRideHailingChoiceSetItem,
  resolvePricingFromExecutionSnapshot,
  type ChoiceSetOrderItemSnapshot,
  type RideHailingChoiceSetResolutionSnapshot,
  type RideHailingDispatchBindingSnapshot,
  type RideHailingExecutionPhase,
} from "../../trade/contracts";
import type {
  RideHailingFareCorrectionRequired,
  RideHailingProviderBindingExpectation,
} from "../contracts";
import type { RideHailingReconciliationTransactionPort } from "../ports";
import {
  mergeDriverSnapshot,
  mergeVehicleSnapshot,
  reconcileRideHailingExecutionPhase,
} from "../services/provider-order-observation";

const terminalFinalSettlementPhases = new Set<RideHailingExecutionPhase>(["FINISHED", "CANCELLED"]);

const providerConfirmedServiceVehiclePhases = new Set<RideHailingExecutionPhase>([
  "ACCEPTED",
  "ARRIVED_AT_PICKUP",
  "IN_TRIP",
  "FINISHED",
]);

const jsonEqual = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const isTerminalFinalSettlementPhase = (phase: RideHailingExecutionPhase): boolean =>
  terminalFinalSettlementPhases.has(phase);

const buildProviderCancellationAttemptId = (): string => `term_provider_cancel_${randomUUID()}`;

const buildProviderConfirmedChoiceSetResolution = (input: {
  choiceSetItem: ChoiceSetOrderItemSnapshot;
  dispatchBinding: RideHailingDispatchBindingSnapshot;
  providerVehicleTypeCode: string | null;
  resolvedAt: string;
}): RideHailingChoiceSetResolutionSnapshot | null => {
  if (input.choiceSetItem.resolution) return null;
  const submittedCandidate = input.providerVehicleTypeCode
    ? input.dispatchBinding.submittedCandidates.find(
        (candidate) => candidate.providerVehicleTypeCode === input.providerVehicleTypeCode,
      )
    : input.dispatchBinding.submittedCandidates.length === 1
      ? input.dispatchBinding.submittedCandidates[0]
      : null;
  if (!submittedCandidate) return null;

  const candidate = input.choiceSetItem.candidates.find(
    (item) => item.sku.id === submittedCandidate.skuId,
  );
  if (!candidate) return null;

  return {
    sku: candidate.sku,
    providerVehicleTypeCode: submittedCandidate.providerVehicleTypeCode,
    providerVehicleTypeName: submittedCandidate.providerVehicleTypeName,
    quoteSnapshot: submittedCandidate.quoteSnapshot,
    source: "PROVIDER_ACCEPTED",
    candidateRelation: "IN_CANDIDATES",
    reason: null,
    resolvedAt: input.resolvedAt,
  };
};

const assertExpectedBinding = (input: {
  actual: RideHailingDispatchBindingSnapshot | null;
  expected: RideHailingProviderBindingExpectation;
  mismatchDetail: string;
}) => {
  if (
    !input.actual?.providerOrderId ||
    input.actual.providerInstanceId !== input.expected.providerInstanceId ||
    input.actual.providerOrderId !== input.expected.providerOrderId
  ) {
    return throwHttpProblem({
      status: 409,
      detail: input.mismatchDetail,
      code: "RIDE_HAILING_PROVIDER_BINDING_CHANGED",
    });
  }
};

/**
 * The sole persistence adapter permitted to coordinate Trade, RideHailing,
 * and (for a committed terminal fare) Bill. Provider I/O deliberately stays
 * in the sync orchestration before/after these short transactions.
 */
export function createRideHailingReconciliationTransactionPort(): RideHailingReconciliationTransactionPort {
  return {
    async applyProviderObservation(input) {
      return db.transaction(async (tx) => {
        const tradeOrderRepo = new TradeOrderRepository(tx);
        const rideOrderRepo = new RideHailingOrderRepository(tx);

        // Every reconciliation/callback/cancellation path acquires this order.
        const lockedTradeOrder = await tradeOrderRepo.findByIdForUpdate(
          input.orderId as TradeOrderId,
        );
        if (!lockedTradeOrder || lockedTradeOrder.family !== "RIDE_HAILING") {
          return throwHttpProblem({ status: 404, detail: "RideHailing order not found" });
        }
        const lockedRideOrder = await rideOrderRepo.findByOrderIdForUpdate(lockedTradeOrder.id);
        if (!lockedRideOrder) {
          return throwHttpProblem({
            status: 500,
            detail: "RideHailing order facts are missing",
          });
        }
        assertExpectedBinding({
          actual: lockedRideOrder.dispatchBinding,
          expected: input.expectedBinding,
          mismatchDetail: "RideHailing provider binding changed during reconciliation",
        });

        const patch: Partial<NewRideHailingOrder> = {};
        const phaseDecision = reconcileRideHailingExecutionPhase({
          current: lockedRideOrder.executionPhase,
          observed: input.observation.executionPhase,
        });
        if (phaseDecision.accepted) {
          patch.executionPhase = phaseDecision.effectivePhase;
        }

        const driverSnapshot = mergeDriverSnapshot({
          current: lockedRideOrder.driverSnapshot,
          observed: input.observation.driverSnapshot,
        });
        if (!jsonEqual(driverSnapshot, lockedRideOrder.driverSnapshot)) {
          patch.driverSnapshot = driverSnapshot;
        }

        const vehicleSnapshot = mergeVehicleSnapshot({
          current: lockedRideOrder.vehicleSnapshot,
          observed: input.observation.vehicleSnapshot,
        });
        if (!jsonEqual(vehicleSnapshot, lockedRideOrder.vehicleSnapshot)) {
          patch.vehicleSnapshot = vehicleSnapshot;
        }

        let mutated = false;
        if (Object.keys(patch).length > 0) {
          const updated = await rideOrderRepo.updateByOrderId(lockedRideOrder.orderId, patch);
          if (!updated) {
            return throwHttpProblem({
              status: 500,
              detail: "Failed to persist RideHailing provider sync",
            });
          }
          mutated = true;
        }

        const choiceSetItem = getRideHailingChoiceSetItem(lockedTradeOrder.items);
        if (
          choiceSetItem &&
          lockedRideOrder.dispatchBinding &&
          providerConfirmedServiceVehiclePhases.has(phaseDecision.effectivePhase)
        ) {
          const resolution = buildProviderConfirmedChoiceSetResolution({
            choiceSetItem,
            dispatchBinding: lockedRideOrder.dispatchBinding,
            providerVehicleTypeCode: input.observation.providerVehicleTypeCode,
            resolvedAt: input.observedAt,
          });
          if (resolution) {
            await tradeOrderRepo.replaceItems(
              lockedTradeOrder.id,
              lockedTradeOrder.items.map((item) =>
                item.kind === "CHOICE_SET" && item.itemId === choiceSetItem.itemId
                  ? { ...choiceSetItem, resolution }
                  : item,
              ),
            );
            mutated = true;
          }
        }

        if (
          phaseDecision.effectivePhase === "CANCELLED" &&
          (lockedTradeOrder.status === "INITIATING" || lockedTradeOrder.status === "OPEN")
        ) {
          const closedAt = new Date();
          const closedOrder = closeRideHailingOrderFromProviderCancellation(lockedTradeOrder, {
            attemptId: buildProviderCancellationAttemptId(),
            decidedAt: closedAt.toISOString(),
            reason: `RideHailing provider reported cancellation for ${input.expectedBinding.providerOrderId}`,
          });
          await tradeOrderRepo.applyTerminationState({
            id: lockedTradeOrder.id,
            status: closedOrder.status,
            terminationAttempts: closedOrder.terminationAttempts,
            closedAt,
          });
          mutated = true;
        } else if (lockedTradeOrder.status === "INITIATING") {
          await tradeOrderRepo.updateStatus(lockedTradeOrder.id, "OPEN");
          mutated = true;
        }

        return {
          mutated,
          effectiveExecutionPhase: phaseDecision.effectivePhase,
        };
      });
    },

    async commitTerminalSettlement(input) {
      return db.transaction(async (tx) => {
        const tradeOrderRepo = new TradeOrderRepository(tx);
        const rideOrderRepo = new RideHailingOrderRepository(tx);
        const billRepo = new BillRepository(tx);

        // This is the same Trade -> Ride ordering as phase reconciliation.
        const lockedTradeOrder = await tradeOrderRepo.findByIdForUpdate(
          input.orderId as TradeOrderId,
        );
        if (!lockedTradeOrder || lockedTradeOrder.family !== "RIDE_HAILING") {
          return throwHttpProblem({
            status: 404,
            detail: "RideHailing order not found for final settlement",
          });
        }
        const lockedRideOrder = await rideOrderRepo.findByOrderIdForUpdate(lockedTradeOrder.id);
        if (!lockedRideOrder) {
          return throwHttpProblem({
            status: 500,
            detail: "RideHailing order facts are missing for final settlement",
          });
        }
        assertExpectedBinding({
          actual: lockedRideOrder.dispatchBinding,
          expected: input.expectedBinding,
          mismatchDetail: "RideHailing provider binding changed during final settlement",
        });
        if (input.settlement.providerOrderId !== input.expectedBinding.providerOrderId) {
          return throwHttpProblem({
            status: 409,
            detail: "RideHailing provider order does not match local order",
          });
        }
        if (!isTerminalFinalSettlementPhase(lockedRideOrder.executionPhase)) {
          return { mutated: false, correctionRequired: null };
        }

        const committedFinalSettlement = lockedRideOrder.finalSettlementInput;
        if (committedFinalSettlement) {
          const bill = await billRepo.findBySourceOrderId(lockedTradeOrder.id);
          if (
            committedFinalSettlement.amountFen !== input.settlement.amountFen ||
            committedFinalSettlement.currency !== input.settlement.currency
          ) {
            const correctionRequired: RideHailingFareCorrectionRequired | null = bill
              ? {
                  orderId: lockedTradeOrder.id,
                  billId: bill.id,
                  committedAmountFen: committedFinalSettlement.amountFen,
                  observedAmountFen: input.settlement.amountFen,
                  currency: input.settlement.currency,
                  providerOrderId: input.settlement.providerOrderId,
                }
              : null;
            return { mutated: false, correctionRequired };
          }
          return { mutated: false, correctionRequired: null };
        }

        const updatedRideOrder = await rideOrderRepo.updateByOrderId(lockedTradeOrder.id, {
          finalSettlementInput: {
            ...input.settlement,
            committedAt: new Date().toISOString(),
          },
        });
        if (!updatedRideOrder) {
          return throwHttpProblem({
            status: 500,
            detail: "Failed to persist RideHailing final settlement input",
          });
        }

        const existingBill = await billRepo.findBySourceOrderId(lockedTradeOrder.id);
        if (!existingBill) {
          if (!lockedTradeOrder.pricingExecutionSnapshot) {
            return throwHttpProblem({
              status: 500,
              detail: "Order pricing execution snapshot is missing for RideHailing final bill",
            });
          }
          const pricingSnapshot = resolvePricingFromExecutionSnapshot({
            snapshot: lockedTradeOrder.pricingExecutionSnapshot,
            orderContext: {
              serviceTime: lockedRideOrder.departureAt?.toISOString() ?? null,
              quoteTotalFen: input.settlement.amountFen,
            },
          });
          const chargeLines = materializeChargeLinesFromSplitRule({
            totalFen: pricingSnapshot.totalFen,
            splitRule: lockedTradeOrder.splitRuleSnapshot,
          });
          await createBillFromSeed(
            {
              sourceOrderId: lockedTradeOrder.id,
              currency: pricingSnapshot.currency,
              chargeLines: chargeLines.map((line) => ({
                userId: line.userId,
                amountFen: line.amountFen,
                label: "曹操出行费用",
                description: "行程结束后按实际费用结算",
              })),
            },
            tx,
          );
        }

        return { mutated: true, correctionRequired: null };
      });
    },
  };
}
