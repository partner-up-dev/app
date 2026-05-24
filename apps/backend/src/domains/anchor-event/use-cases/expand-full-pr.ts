import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventPRContextRepository } from "../../../repositories/AnchorEventPRContextRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { initializeSlotsForPR } from "../../pr/services";
import type { PRId } from "../../../entities/partner-request";
import { operationLogService } from "../../../infra/operation-log";
import { resolvePublicEventLocationPool } from "../services/event-scope";
import {
  isActiveVisiblePRStatus,
  readVisibleAnchorEventPRContextRecordsByEventTimeWindow,
  readVisibleAnchorEventPRContextRecordsByEventTimeWindowAndLocation,
} from "../../pr/services";
import { normalizeAutomaticPartnerBounds } from "../../pr/services";
import { scheduleAlternativeWaitlistNotificationsForCandidate } from "../../pr-core/services/waitlist-alternative-reminder.service";
import { materializeEventDefaultsForPR } from "../../pr/services";
import { findPoisByNames } from "../../poi";
import { eventOwnsTimeWindow } from "../services/time-window-pool";

const prRepo = new PartnerRequestRepository();
const anchorEventRepo = new AnchorEventRepository();
const eventContextRepo = new AnchorEventPRContextRepository();
const partnerRepo = new PartnerRepository();

const findNextAvailableLocation = (
  pool: string[],
  activeCountsByLocation: Map<string, number>,
  perTimeWindowCapByLocation: Map<string, number | null>,
): string | null => {
  for (const location of pool) {
    const cap = perTimeWindowCapByLocation.get(location) ?? null;
    if (cap === null || (activeCountsByLocation.get(location) ?? 0) < cap) {
      return location;
    }
  }
  return null;
};

/**
 * Phase 2: when a PR becomes FULL, auto-create a new PR under
 * the same event time window, using a different location in the same
 * event location pool.
 */
export async function expandFullPR(prId: PRId): Promise<void> {
  const request = await prRepo.findById(prId);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  if (request.maxPartners === null) {
    return;
  }
  const sourceActiveCount = await partnerRepo.countActiveByPrId(prId);
  if (sourceActiveCount < request.maxPartners) {
    return;
  }

  const fullPR = await eventContextRepo.findRecordByPrId(prId);
  if (!fullPR) {
    return;
  }

  const event = await anchorEventRepo.findById(fullPR.anchor.anchorEventId);
  if (!event || event.status !== "ACTIVE") {
    return;
  }
  if (!eventOwnsTimeWindow(event, fullPR.anchor.timeWindow)) {
    return;
  }
  if (event.fullPrExpansionPolicy !== "ENABLED") {
    return;
  }

  const siblingPRs = await readVisibleAnchorEventPRContextRecordsByEventTimeWindow(
    fullPR.anchor.anchorEventId,
    fullPR.anchor.timeWindow,
  );
  const locationPool = await resolvePublicEventLocationPool(event);
  const sourceLocation = fullPR.root.location?.trim() ?? "";
  if (!sourceLocation || !locationPool.includes(sourceLocation)) {
    return;
  }
  const pois = await findPoisByNames(locationPool);
  const perTimeWindowCapByLocation = new Map(
    pois.map((poi) => [poi.name, poi.perTimeWindowCap]),
  );
  const activeCountsByLocation = new Map<string, number>();
  for (const record of siblingPRs) {
    if (!isActiveVisiblePRStatus(record.root.status) || !record.root.location) {
      continue;
    }
    const location = record.root.location.trim();
    if (!locationPool.includes(location)) {
      continue;
    }
    activeCountsByLocation.set(
      location,
      (activeCountsByLocation.get(location) ?? 0) + 1,
    );
  }

  const targetLocation = findNextAvailableLocation(
    locationPool,
    activeCountsByLocation,
    perTimeWindowCapByLocation,
  );
  if (!targetLocation) {
    return;
  }

  const existingAtTarget =
    await readVisibleAnchorEventPRContextRecordsByEventTimeWindowAndLocation(
      fullPR.anchor.anchorEventId,
      fullPR.anchor.timeWindow,
      targetLocation,
    );
  const capAtTarget = perTimeWindowCapByLocation.get(targetLocation) ?? null;
  const activeAtTarget = existingAtTarget.filter((record) =>
    isActiveVisiblePRStatus(record.root.status),
  ).length;
  if (capAtTarget !== null && activeAtTarget >= capAtTarget) {
    return;
  }
  const partnerBounds = normalizeAutomaticPartnerBounds(
    fullPR.root.minPartners,
    fullPR.root.maxPartners,
    0,
  );

  const createdRoot = await prRepo.create({
    title: fullPR.root.title,
    type: fullPR.root.type,
    time: fullPR.root.time,
    location: targetLocation,
    status: "OPEN",
    visibilityStatus: "VISIBLE",
    minPartners: partnerBounds.minPartners,
    maxPartners: partnerBounds.maxPartners,
    preferences: fullPR.root.preferences,
    notes: null,
    joinGateConfig: [],
    confirmationEnabled: fullPR.root.confirmationEnabled,
    confirmationStartOffsetMinutes:
      fullPR.root.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: fullPR.root.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: fullPR.root.joinLockOffsetMinutes,
  });

  await initializeSlotsForPR(createdRoot.id, null);
  await materializeEventDefaultsForPR({
    prId: createdRoot.id,
    anchorEventId: fullPR.anchor.anchorEventId,
    type: createdRoot.type,
    location: createdRoot.location,
    timeWindow: createdRoot.time,
    prNotes: createdRoot.notes,
  });

  operationLogService.log({
    actorId: null,
    action: "pr.auto_create",
    aggregateType: "partner_request",
    aggregateId: String(createdRoot.id),
    detail: {
      sourcePrId: prId,
      timeWindow: fullPR.anchor.timeWindow,
      location: createdRoot.location,
      activeCountAtSource: sourceActiveCount,
    },
  });

  await scheduleAlternativeWaitlistNotificationsForCandidate(createdRoot);
}
