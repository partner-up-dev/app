import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import type { TradeOrderId } from "../../../entities/trade-order";
import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import { CreateOrderAttemptRepository } from "../../../repositories/CreateOrderAttemptRepository";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import type { CreateOrderCommandResult, RideHailingDispatchBindingSnapshot } from "../model";

const CREATE_ORDER_REPLAY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Trade-owned callback seam for a provider create whose synchronous response
 * was unavailable. RideHailing passes only already-verified provider facts;
 * it never reaches into Attempt persistence directly.
 */
export async function confirmRideCreateAttemptFromProvider(input: {
  orderId: TradeOrderId;
  providerInstanceId: RideHailingProviderInstanceId;
  externalOrderId: string;
  providerOrderId: string;
  providerSnapshot: unknown;
}): Promise<{ recovered: boolean }> {
  return db.transaction(async (tx) => {
    const attemptRepo = new CreateOrderAttemptRepository(tx);
    const correlated = await attemptRepo.findByProviderCorrelation({
      orderId: input.orderId,
      providerInstanceId: input.providerInstanceId,
      externalOrderId: input.externalOrderId,
    });
    if (!correlated) return { recovered: false };

    const attempt = await attemptRepo.findByIdForUpdate(correlated.id);
    if (!attempt) throw new Error("CreateOrderAttempt disappeared during callback recovery");
    if (attempt.providerOrderId && attempt.providerOrderId !== input.providerOrderId) {
      return throwHttpProblem({
        status: 409,
        code: "RIDE_HAILING_PROVIDER_ORDER_CORRELATION_CONFLICT",
        detail: "Provider callback order does not match the persisted create attempt",
      });
    }
    if (attempt.status === "FAILED") {
      return throwHttpProblem({
        status: 409,
        code: "RIDE_HAILING_PROVIDER_CREATE_ALREADY_FAILED",
        detail: "Provider callback arrived for a create attempt already resolved as failed",
      });
    }
    if (attempt.status === "SUCCEEDED") return { recovered: true };

    const dispatchBinding: RideHailingDispatchBindingSnapshot = {
      ...attempt.dispatchSeed,
      providerOrderId: input.providerOrderId,
      providerSnapshot: input.providerSnapshot,
    };
    await new RideHailingOrderRepository(tx).updateByOrderId(input.orderId, {
      dispatchBinding,
      executionPhase: "DISPATCHING",
    });
    await new TradeOrderRepository(tx).updateStatus(input.orderId, "OPEN");

    const completedAt = new Date();
    const result: CreateOrderCommandResult = {
      outcome: "CREATED",
      attemptId: attempt.id,
      orderId: input.orderId,
    };
    await attemptRepo.complete({
      id: attempt.id,
      allowedStatuses: ["SUBMITTING"],
      status: "SUCCEEDED",
      providerOrderId: input.providerOrderId,
      resultSnapshot: result,
      responseStatus: 201,
      completedAt,
      replayExpiresAt: new Date(completedAt.getTime() + CREATE_ORDER_REPLAY_TTL_MS),
    });
    return { recovered: true };
  });
}
