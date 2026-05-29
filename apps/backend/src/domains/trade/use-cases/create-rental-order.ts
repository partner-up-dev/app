import { throwHttpProblem } from "../../../lib/problem-details";
import { db } from "../../../lib/db";
import type { OfferId } from "../../../entities/offer";
import type { PRId } from "../../../entities/partner-request";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { createBillFromSeed } from "../../bill";
import { attachOrderToPr } from "../../pr-core";
import { materializeChargeLinesFromSplitRule } from "../../bill/services";
import type {
  OrderItemSnapshot,
  OrderOfferSnapshot,
  OrderParticipantSnapshot,
  OrderPricingSnapshot,
  RentalRegistrant,
  SplitRuleSnapshot,
} from "../model";
import { buildEqualRelativeSplitRule } from "../services";

const DEFAULT_UNPAID_WINDOW_MINUTES = 30;

const partnerRepo = new PartnerRepository();

export interface CreateRentalOrderInput {
  prId: number;
  createdBy: string;
  offerSnapshot: OrderOfferSnapshot;
  items: OrderItemSnapshot[];
  pricingSnapshot: OrderPricingSnapshot;
  selectedZoneCodes: string[];
  serviceStartAt: string;
  serviceEndAt: string;
  participantCount: number;
  contactPhone: string;
  registrants: RentalRegistrant[];
  splitRuleSnapshot?: SplitRuleSnapshot;
  unpaidWindowMinutes?: number;
}

function buildOrderParticipants(
  activeParticipants: Awaited<
    ReturnType<PartnerRepository["listActiveParticipantSummariesByPrId"]>
  >,
  createdBy: string,
): OrderParticipantSnapshot[] {
  return activeParticipants.map((participant) => ({
    participantId: String(participant.partnerId),
    userId: participant.userId,
    role: participant.userId === createdBy ? "CREATOR" : "PARTICIPANT",
    joinedVia: "PR_ACTIVE_PARTICIPANT",
    joinedAt: null,
    removedAt: null,
  }));
}

export async function createRentalOrder(input: CreateRentalOrderInput) {
  const prId = input.prId as PRId;
  const createdBy = input.createdBy as UserId;
  const offerId = input.offerSnapshot.offerId as OfferId;

  if (input.items.length === 0) {
    return throwHttpProblem({ status: 400, detail: "Rental order requires at least one item" });
  }

  if (input.participantCount <= 0) {
    return throwHttpProblem({ status: 400, detail: "Participant count must be positive" });
  }

  if (input.registrants.length !== input.participantCount) {
    return throwHttpProblem({
      status: 400,
      detail: "Registrant count must match participant count",
    });
  }

  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(
    prId,
  );
  if (activeParticipants.length === 0) {
    return throwHttpProblem({
      status: 409,
      detail: "Rental order requires at least one active PR participant",
    });
  }

  const participants = buildOrderParticipants(activeParticipants, input.createdBy);
  const splitRuleSnapshot =
    input.splitRuleSnapshot ??
    buildEqualRelativeSplitRule(participants.map((participant) => participant.userId));
  const chargeLines = materializeChargeLinesFromSplitRule({
    totalFen: input.pricingSnapshot.totalFen,
    splitRule: splitRuleSnapshot,
  });

  return db.transaction(async (tx) => {
    const tradeOrderRepo = new TradeOrderRepository(tx);

    const now = new Date();
    const unpaidWindowMinutes =
      input.unpaidWindowMinutes ?? DEFAULT_UNPAID_WINDOW_MINUTES;
    const unpaidExpiresAt = new Date(
      now.getTime() + unpaidWindowMinutes * 60 * 1000,
    ).toISOString();

    const order = await tradeOrderRepo.create({
      family: "RENTAL",
      createdBy,
      participants,
      splitRuleSnapshot,
      offerSnapshot: input.offerSnapshot,
      items: input.items,
      pricingSnapshot: input.pricingSnapshot,
      timeout: {
        unpaidExpiresAt,
        defaultWindowMinutes: unpaidWindowMinutes,
      },
      selectedZoneCodes: input.selectedZoneCodes,
      serviceStartAt: new Date(input.serviceStartAt),
      serviceEndAt: new Date(input.serviceEndAt),
      participantCount: input.participantCount,
      contactPhone: input.contactPhone,
      registrants: input.registrants,
    });

    await attachOrderToPr(
      {
        orderId: order.id,
        prId,
        offerId,
        orderCreatedBy: createdBy,
      },
      tx,
    );

    const billResult = await createBillFromSeed(
      {
        sourceOrderId: order.id as TradeOrderId,
        currency: input.pricingSnapshot.currency,
        chargeLines: chargeLines.map((line) => ({
          userId: line.userId,
          amountFen: line.amountFen,
          label: "Rental order charge",
          description: `PR #${input.prId} rental order share`,
        })),
      },
      tx,
    );

    return {
      orderId: order.id,
      billId: billResult.billId,
    };
  });
}
