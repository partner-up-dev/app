import type { PartnerId, WaitlistCycleId } from "../../../entities/partner";
import type { PRId, PartnerRequest } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import {
  requestNotification,
  type NotificationRequest,
  type NotificationRequestResult,
} from "../../notification";
import {
  PartnerRepository,
  type AlternativeWaitlistReminderSlot,
} from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import {
  getWaitlistAlternativeAvailableNotificationContext,
  type WaitlistAlternativeAvailableNotificationContext,
  type WaitlistAlternativeAvailableNotificationContextInput,
} from "../queries/get-waitlist-alternative-available-notification-context";

export type WaitlistAlternativeNotificationPair = {
  sourcePrId: PRId;
  sourcePartnerId: PartnerId;
  sourceWaitlistCycleId: WaitlistCycleId;
  candidatePrId: PRId;
  recipientUserId: UserId;
};

export type WaitlistAlternativeReconciliationResult =
  | {
      outcome: "REQUESTED";
      pair: WaitlistAlternativeNotificationPair;
      creation: NotificationRequestResult["creation"];
    }
  | {
      outcome: "SKIPPED";
      pair: WaitlistAlternativeNotificationPair;
      reason: Extract<
        WaitlistAlternativeAvailableNotificationContext,
        { state: "SKIPPED" }
      >["reason"];
    };

export type WaitlistAlternativeReconcilerDependencies = {
  listSourceSlotsByTypeAndLocation(input: {
    type: string;
    location: string;
    excludePrId: PRId;
  }): Promise<AlternativeWaitlistReminderSlot[]>;
  listSourceSlotsByUser(userId: UserId): Promise<AlternativeWaitlistReminderSlot[]>;
  findRequestById(prId: PRId): Promise<PartnerRequest | null>;
  findVisibleRequestsByType(type: string): Promise<PartnerRequest[]>;
  loadCurrentContext(
    input: WaitlistAlternativeAvailableNotificationContextInput,
  ): Promise<WaitlistAlternativeAvailableNotificationContext>;
  request(
    input: NotificationRequest<"pr.waitlist-alternative-available">,
  ): Promise<NotificationRequestResult>;
};

const partnerRepo = new PartnerRepository();
const prRepo = new PartnerRequestRepository();

const defaultDependencies: WaitlistAlternativeReconcilerDependencies = {
  listSourceSlotsByTypeAndLocation: (input) =>
    partnerRepo.listPendingAlternativeReminderSlotsByTypeAndLocation(input),
  listSourceSlotsByUser: (userId) => partnerRepo.listPendingAlternativeReminderSlotsByUser(userId),
  findRequestById: (prId) => prRepo.findById(prId),
  findVisibleRequestsByType: (type) => prRepo.findVisibleByType(type),
  loadCurrentContext: getWaitlistAlternativeAvailableNotificationContext,
  request: requestNotification,
};

const normalizeText = (value: string | null): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const pairKey = (pair: WaitlistAlternativeNotificationPair): string =>
  [
    pair.recipientUserId,
    pair.sourcePrId,
    pair.sourcePartnerId,
    pair.sourceWaitlistCycleId,
    pair.candidatePrId,
  ].join(":");

const requestFor = (pair: WaitlistAlternativeNotificationPair) => ({
  template: "pr.waitlist-alternative-available" as const,
  recipientUserId: pair.recipientUserId,
  channel: "WECHAT_SUBSCRIPTION" as const,
  payload: {
    sourcePrId: pair.sourcePrId,
    sourcePartnerId: pair.sourcePartnerId,
    sourceWaitlistCycleId: pair.sourceWaitlistCycleId,
    candidatePrId: pair.candidatePrId,
  },
  metadata: {
    aggregate: { type: "partner_request" as const, id: String(pair.sourcePrId) },
    causationId: [
      "partner_request",
      pair.sourcePrId,
      "waitlist-alternative",
      pair.sourcePartnerId,
      pair.sourceWaitlistCycleId,
      pair.candidatePrId,
    ].join(":"),
  },
});

/**
 * Reconciles one current source waitlist cycle / candidate pair.  The pure
 * context owns eligibility; Notification owns active replacement identity and
 * channel dispatch.  No PR command or temporal refresh may enter this path.
 */
export const reconcileWaitlistAlternativeNotification = async (
  pair: WaitlistAlternativeNotificationPair,
  dependencies: WaitlistAlternativeReconcilerDependencies = defaultDependencies,
): Promise<WaitlistAlternativeReconciliationResult> => {
  const context = await dependencies.loadCurrentContext(pair);
  if (context.state === "SKIPPED") {
    return { outcome: "SKIPPED", pair, reason: context.reason };
  }

  const result = await dependencies.request(requestFor(pair));
  return { outcome: "REQUESTED", pair, creation: result.creation };
};

/**
 * A candidate changed into an available state. Reconcile every opted-in
 * pending source slot that shares its normalized type/location.
 */
export const reconcileAlternativeWaitlistNotificationsForCandidate = async (
  candidateRequest: PartnerRequest,
  dependencies: WaitlistAlternativeReconcilerDependencies = defaultDependencies,
): Promise<WaitlistAlternativeReconciliationResult[]> => {
  const type = normalizeText(candidateRequest.type);
  const location = normalizeText(candidateRequest.location);
  if (!type || !location) return [];

  const sourceSlots = await dependencies.listSourceSlotsByTypeAndLocation({
    type,
    location,
    excludePrId: candidateRequest.id,
  });
  const reconciled: WaitlistAlternativeReconciliationResult[] = [];
  const seen = new Set<string>();

  for (const sourceSlot of sourceSlots) {
    if (!sourceSlot.waitlistCycleId) continue;
    const pair: WaitlistAlternativeNotificationPair = {
      sourcePrId: sourceSlot.prId,
      sourcePartnerId: sourceSlot.partnerId,
      sourceWaitlistCycleId: sourceSlot.waitlistCycleId,
      candidatePrId: candidateRequest.id,
      recipientUserId: sourceSlot.userId,
    };
    if (seen.has(pairKey(pair))) continue;
    seen.add(pairKey(pair));
    reconciled.push(await reconcileWaitlistAlternativeNotification(pair, dependencies));
  }

  return reconciled;
};

export type WaitlistAlternativeSourceInput = {
  sourceRequest: PartnerRequest;
  sourcePartnerId: PartnerId;
  sourceWaitlistCycleId: WaitlistCycleId;
  recipientUserId: UserId;
};

/**
 * A source waitlist cycle was created or its user regranted permission.
 * Enumerate candidates only as discovery; each pair is still validated by the
 * shared strict current-state query before it can request Notification work.
 */
export const reconcileAlternativeWaitlistNotificationsForSource = async (
  input: WaitlistAlternativeSourceInput,
  dependencies: WaitlistAlternativeReconcilerDependencies = defaultDependencies,
): Promise<WaitlistAlternativeReconciliationResult[]> => {
  const type = normalizeText(input.sourceRequest.type);
  const location = normalizeText(input.sourceRequest.location);
  if (!type || !location) return [];

  const candidates = await dependencies.findVisibleRequestsByType(type);
  const reconciled: WaitlistAlternativeReconciliationResult[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (candidate.id === input.sourceRequest.id || normalizeText(candidate.location) !== location) {
      continue;
    }
    const pair: WaitlistAlternativeNotificationPair = {
      sourcePrId: input.sourceRequest.id,
      sourcePartnerId: input.sourcePartnerId,
      sourceWaitlistCycleId: input.sourceWaitlistCycleId,
      candidatePrId: candidate.id,
      recipientUserId: input.recipientUserId,
    };
    if (seen.has(pairKey(pair))) continue;
    seen.add(pairKey(pair));
    reconciled.push(await reconcileWaitlistAlternativeNotification(pair, dependencies));
  }

  return reconciled;
};

/** Rebuilds alternative opportunities from a user's currently pending slots. */
export const reconcileAlternativeWaitlistNotificationsForUserSources = async (
  userId: UserId,
  dependencies: WaitlistAlternativeReconcilerDependencies = defaultDependencies,
): Promise<WaitlistAlternativeReconciliationResult[]> => {
  const sourceSlots = await dependencies.listSourceSlotsByUser(userId);
  const reconciled: WaitlistAlternativeReconciliationResult[] = [];
  const seenSourceCycles = new Set<string>();

  for (const sourceSlot of sourceSlots) {
    if (!sourceSlot.waitlistCycleId) continue;
    const sourceCycleKey = [
      sourceSlot.prId,
      sourceSlot.partnerId,
      sourceSlot.waitlistCycleId,
      sourceSlot.userId,
    ].join(":");
    if (seenSourceCycles.has(sourceCycleKey)) continue;
    seenSourceCycles.add(sourceCycleKey);

    const sourceRequest = await dependencies.findRequestById(sourceSlot.prId);
    if (!sourceRequest) continue;
    reconciled.push(
      ...(await reconcileAlternativeWaitlistNotificationsForSource(
        {
          sourceRequest,
          sourcePartnerId: sourceSlot.partnerId,
          sourceWaitlistCycleId: sourceSlot.waitlistCycleId,
          recipientUserId: sourceSlot.userId,
        },
        dependencies,
      )),
    );
  }

  return reconciled;
};
