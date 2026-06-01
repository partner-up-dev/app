import { throwHttpProblem } from "../../../lib/problem-details";
import { db } from "../../../lib/db";
import type { OfferId } from "../../../entities/offer";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { RentalOrderRepository } from "../../../repositories/RentalOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import type { RepositoryExecutor } from "../../../repositories/_executor";
import { createBillFromSeed } from "../../bill";
import { materializeChargeLinesFromSplitRule } from "../../bill/services";
import type {
  OrderItemSnapshot,
  OrderParticipantSnapshot,
  OrderPricingSnapshot,
  RentalRegistrant,
  SplitRuleSnapshot,
} from "../model";
import { buildEqualRelativeSplitRule, validateOrderParticipants } from "../services";

const DEFAULT_UNPAID_WINDOW_MINUTES = 30;

export interface CreateRentalOrderInput {
  createdBy: string;
  participants: OrderParticipantSnapshot[];
  offerId: OfferId;
  items: OrderItemSnapshot[];
  pricingSnapshot: OrderPricingSnapshot;
  serviceStartAt: string;
  serviceEndAt: string;
  contactPhone: string;
  registrants: RentalRegistrant[];
  splitRuleSnapshot?: SplitRuleSnapshot;
  unpaidWindowMinutes?: number;
}

export type CreateRentalOrderResult = {
  orderId: string;
  billId: string;
};

export async function createRentalOrder(
  input: CreateRentalOrderInput,
  executor: RepositoryExecutor = db,
): Promise<CreateRentalOrderResult> {
  if (executor === db) {
    return db.transaction(async (tx) => createRentalOrder(input, tx));
  }

  const createdBy = input.createdBy as UserId;

  if (input.items.length === 0) {
    return throwHttpProblem({ status: 400, detail: "Rental order requires at least one item" });
  }

  if (input.participants.length === 0) {
    return throwHttpProblem({ status: 400, detail: "Rental order requires at least one participant" });
  }

  if (input.registrants.length !== input.participants.length) {
    return throwHttpProblem({
      status: 400,
      detail: "Registrant count must match order participants",
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
  const chargeLines = materializeChargeLinesFromSplitRule({
    totalFen: input.pricingSnapshot.totalFen,
    splitRule: splitRuleSnapshot,
  });

  const tradeOrderRepo = new TradeOrderRepository(executor);
  const rentalOrderRepo = new RentalOrderRepository(executor);

  const now = new Date();
  const unpaidWindowMinutes =
    input.unpaidWindowMinutes ?? DEFAULT_UNPAID_WINDOW_MINUTES;
  const unpaidExpiresAt = new Date(
    now.getTime() + unpaidWindowMinutes * 60 * 1000,
  ).toISOString();

  const order = await tradeOrderRepo.create({
    family: "RENTAL",
    offerId: input.offerId,
    createdBy,
    participants: input.participants,
    splitRuleSnapshot,
    items: input.items,
    timeout: {
      unpaidExpiresAt,
      defaultWindowMinutes: unpaidWindowMinutes,
    },
  });

  await rentalOrderRepo.create({
    orderId: order.id,
    serviceStartAt: new Date(input.serviceStartAt),
    serviceEndAt: new Date(input.serviceEndAt),
    contactPhone: input.contactPhone,
    registrants: input.registrants,
  });

  const billResult = await createBillFromSeed(
    {
      sourceOrderId: order.id as TradeOrderId,
      currency: input.pricingSnapshot.currency,
      chargeLines: chargeLines.map((line) => ({
        userId: line.userId,
        amountFen: line.amountFen,
        label: "Rental order charge",
        description: "Rental order share",
      })),
    },
    executor,
  );

  return {
    orderId: order.id,
    billId: billResult.billId,
  };
}
