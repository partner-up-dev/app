import { throwHttpProblem } from "../../../lib/problem-details";
import { db } from "../../../lib/db";
import type { OfferId } from "../../../entities/offer";
import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import type { UserId } from "../../../entities/user";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import type { RepositoryExecutor } from "../../../repositories/_executor";
import type {
  OrderItemSnapshot,
  OrderParticipantSnapshot,
  OrderPricingSnapshot,
  RideHailingRiderSnapshot,
  RideHailingRouteSnapshot,
  SplitRuleSnapshot,
} from "../model";
import { buildEqualRelativeSplitRule, validateOrderParticipants } from "../services";

const DEFAULT_INITIATING_WINDOW_MINUTES = 30;

export interface CreateRideHailingOrderFoundationInput {
  createdBy: string;
  participants: OrderParticipantSnapshot[];
  offerId: OfferId;
  items: OrderItemSnapshot[];
  pricingSnapshot: OrderPricingSnapshot;
  routeSnapshot: RideHailingRouteSnapshot;
  departureAt?: string | null;
  riders: RideHailingRiderSnapshot[];
  contactPhone: string;
  providerInstanceId: string;
  splitRuleSnapshot?: SplitRuleSnapshot;
  initiatingWindowMinutes?: number;
}

export type CreateRideHailingOrderFoundationResult = {
  orderId: string;
};

export async function createRideHailingOrderFoundation(
  input: CreateRideHailingOrderFoundationInput,
  executor: RepositoryExecutor = db,
): Promise<CreateRideHailingOrderFoundationResult> {
  if (executor === db) {
    return db.transaction((tx) => createRideHailingOrderFoundation(input, tx));
  }

  const createdBy = input.createdBy as UserId;

  if (input.items.length === 0) {
    return throwHttpProblem({
      status: 400,
      detail: "RideHailing order requires at least one item",
    });
  }

  if (input.riders.length === 0) {
    return throwHttpProblem({
      status: 400,
      detail: "RideHailing order requires at least one rider",
    });
  }

  const participantError = validateOrderParticipants({
    participants: input.participants,
    createdBy: input.createdBy,
  });
  if (participantError) {
    return throwHttpProblem({
      status: 409,
      detail: participantError,
    });
  }

  const splitRuleSnapshot =
    input.splitRuleSnapshot ??
    buildEqualRelativeSplitRule(
      input.participants.map((participant) => participant.userId),
    );

  const tradeOrderRepo = new TradeOrderRepository(executor);
  const rideOrderRepo = new RideHailingOrderRepository(executor);

  const now = new Date();
  const initiatingWindowMinutes =
    input.initiatingWindowMinutes ?? DEFAULT_INITIATING_WINDOW_MINUTES;
  const initiatingExpiresAt = new Date(
    now.getTime() + initiatingWindowMinutes * 60 * 1000,
  ).toISOString();

  const order = await tradeOrderRepo.create({
    family: "RIDE_HAILING",
    offerId: input.offerId,
    createdBy,
    status: "INITIATING",
    participants: input.participants,
    splitRuleSnapshot,
    items: input.items,
    timeout: {
      unpaidExpiresAt: initiatingExpiresAt,
      defaultWindowMinutes: initiatingWindowMinutes,
    },
  });

  await rideOrderRepo.create({
    orderId: order.id,
    routeSnapshot: input.routeSnapshot,
    departureAt: input.departureAt ? new Date(input.departureAt) : null,
    riders: input.riders,
    contactPhone: input.contactPhone,
    providerInstanceId: input.providerInstanceId as RideHailingProviderInstanceId,
    executionPhase: "INITIATING",
  });

  return {
    orderId: order.id,
  };
}
