import { throwHttpProblem } from "../../../lib/problem-details";
import { db } from "../../../lib/db";
import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import type { TradeOrderId } from "../../../entities/trade-order";
import { RideHailingFulfillmentRepository } from "../../../repositories/RideHailingFulfillmentRepository";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import type { RepositoryExecutor } from "../../../repositories/_executor";

export async function createRideHailingFulfillment(
  input: {
    orderId: string;
    providerInstanceId: string;
  },
  executor: RepositoryExecutor = db,
) {
  const tradeOrderRepo = new TradeOrderRepository(executor);
  const providerRepo = new RideHailingProviderInstanceRepository(executor);
  const fulfillmentRepo = new RideHailingFulfillmentRepository(executor);

  const order = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }

  if (order.family !== "RIDE_HAILING") {
    return throwHttpProblem({
      status: 409,
      detail: "Only RideHailing orders create RideHailing fulfillment",
    });
  }

  const providerInstance = await providerRepo.findById(
    input.providerInstanceId as RideHailingProviderInstanceId,
  );
  if (!providerInstance || providerInstance.status !== "ACTIVE") {
    return throwHttpProblem({
      status: 409,
      detail: "RideHailing provider instance is not active",
    });
  }

  const existing = await fulfillmentRepo.findByOrderId(order.id);
  if (existing) {
    if (existing.providerInstanceId !== providerInstance.id) {
      return throwHttpProblem({
        status: 409,
        detail: "RideHailing fulfillment already uses another provider instance",
      });
    }

    return existing;
  }

  return fulfillmentRepo.create({
    orderId: order.id,
    providerInstanceId: providerInstance.id,
    providerType: providerInstance.providerType,
  });
}
