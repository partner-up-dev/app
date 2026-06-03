import type { PRStatus } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import type {
  ActiveParticipantSummary,
  PendingParticipantSummary,
  RosterParticipantSummary,
} from "../../../repositories/PartnerRepository";
import { hasEventStarted } from "./time-window.service";
import type { PublicPR } from "./pr-view.service";
import type { AlternativeBatchRecommendation } from "../use-cases/recommend-alternative-batches";
import type { PRId } from "../../../entities/partner-request";
import type { ResolvedAnchorParticipationPolicy } from "./anchor-participation-policy.service";
import { isExitAllowedStatus, isJoinableStatus } from "./status-rules";

export type PartnerSectionActionBlockedReason =
  | "NONE"
  | "FULL"
  | "NOT_JOINABLE_STATUS"
  | "JOIN_LOCKED"
  | "EVENT_STARTED"
  | "PARTICIPATION_FREQUENCY_LIMITED"
  | "OUTSIDE_CONFIRM_WINDOW"
  | "NOT_JOINED"
  | "ALREADY_WAITLISTED"
  | "ALREADY_JOINED"
  | "ALREADY_CONFIRMED"
  | "CHECKIN_NOT_OPEN";

export type PartnerSectionReleaseState = "RELEASED" | "EXITED";

export type PartnerSectionRosterItem = {
  partnerId: number;
  displayName: string;
  avatarUrl: string | null;
  isCreator: boolean;
  isSelf: boolean;
  state: "JOINED" | "CONFIRMED" | "ATTENDED" | PartnerSectionReleaseState;
};

export type PartnerSectionView = {
  capacity: {
    current: number;
    min: number | null;
    max: number | null;
    remaining: number | null;
    neededToReady: number;
    pending: number;
    readiness: "NEEDS_MORE" | "READY" | "FULL" | "ACTIVE" | "UNAVAILABLE";
  };
  roster: PartnerSectionRosterItem[];
  viewer: {
    isCreator: boolean;
    isParticipant: boolean;
    myPartnerId: number | null;
    pendingPartnerId: number | null;
    isWaitlisted: boolean;
    waitlistRank: number | null;
    slotState:
      | "NOT_JOINED"
      | "PENDING"
      | "JOINED"
      | "CONFIRMED"
      | "ATTENDED"
      | "EXITED"
      | "RELEASED";
    canJoin: boolean;
    canWaitlist: boolean;
    canExit: boolean;
    canConfirm: boolean;
    canCheckIn: boolean;
    joinBlockedReason: PartnerSectionActionBlockedReason;
    waitlistBlockedReason: PartnerSectionActionBlockedReason;
    exitBlockedReason: PartnerSectionActionBlockedReason;
    confirmBlockedReason: PartnerSectionActionBlockedReason;
    checkInBlockedReason: PartnerSectionActionBlockedReason;
    releasedSlot: null | {
      partnerId: number;
      state: PartnerSectionReleaseState;
      releasedAt: string | null;
      releaseReason: string | null;
    };
  };
  reminder:
    | {
        supported: false;
        visible: false;
      }
    | {
        supported: true;
        visible: boolean;
      };
  confirmation: {
    enabled: boolean;
  };
  timeline: null | {
    eventStartAt: string | null;
    confirmationStartAt: string | null;
    confirmationEndAt: string | null;
    joinLockAt: string | null;
  };
  fallbacks: {
    sameBatchAlternatives: Array<{
      id: PRId;
      location: string;
      status: PRStatus;
    }>;
    alternativeBatches: AlternativeBatchRecommendation[];
  };
};

const toIsoString = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

// Roster entries can include released slots, so accept the broader roster summary type.
const resolveDisplayName = (
  item: RosterParticipantSummary,
  isCreator: boolean,
  isSelf: boolean,
): string => {
  const nickname = item.nickname?.trim();
  if (nickname) return nickname;
  if (isSelf) return "你";
  if (isCreator) return "发起者";
  return `搭子 #${item.partnerId}`;
};

const resolveReadiness = (
  status: PRStatus,
  current: number,
  min: number | null,
  max: number | null,
): PartnerSectionView["capacity"]["readiness"] => {
  if (status === "ACTIVE") return "ACTIVE";
  if (status === "CLOSED" || status === "EXPIRED" || status === "DRAFT") {
    return "UNAVAILABLE";
  }
  if (status === "READY") return "READY";
  if (max !== null && current >= max) return "FULL";
  if (min !== null && current >= min) return "READY";
  return "NEEDS_MORE";
};

const resolveReleaseState = (
  partnerId: number,
  releaseStateByPartnerId: Map<number, PartnerSectionReleaseState>,
): PartnerSectionReleaseState =>
  releaseStateByPartnerId.get(partnerId) ?? "RELEASED";

const resolveRosterState = (
  status: RosterParticipantSummary["status"],
  partnerId: number,
  releaseStateByPartnerId: Map<number, PartnerSectionReleaseState>,
): PartnerSectionRosterItem["state"] => {
  if (status === "EXITED") {
    return "EXITED";
  }
  if (status === "RELEASED") {
    return resolveReleaseState(partnerId, releaseStateByPartnerId);
  }
  return status;
};

const buildBaseSection = (
  publicPR: PublicPR,
  activeParticipants: ActiveParticipantSummary[],
  pendingParticipants: PendingParticipantSummary[],
  rosterParticipants: RosterParticipantSummary[],
  viewerUserId: UserId | null,
  releaseStateByPartnerId: Map<number, PartnerSectionReleaseState>,
): Omit<
  PartnerSectionView,
  "reminder" | "confirmation" | "timeline" | "fallbacks"
> => {
  const current = activeParticipants.length;
  const min = publicPR.minPartners;
  const max = publicPR.maxPartners;
  const remaining = max === null ? null : Math.max(0, max - current);
  const neededToReady =
    min === null ? 0 : Math.max(0, min - current);
  const readiness = resolveReadiness(publicPR.status, current, min, max);

  const roster = rosterParticipants.map((item) => {
    const isCreator = Boolean(publicPR.createdBy && item.userId === publicPR.createdBy);
    const isSelf = Boolean(viewerUserId && item.userId === viewerUserId);
    return {
      partnerId: item.partnerId,
      displayName: resolveDisplayName(item, isCreator, isSelf),
      avatarUrl: item.avatar,
      isCreator,
      isSelf,
      state: resolveRosterState(
        item.status,
        item.partnerId,
        releaseStateByPartnerId,
      ),
    } satisfies PartnerSectionRosterItem;
  });

  const selfActiveSlot =
    publicPR.myPartnerId === null
      ? null
      : activeParticipants.find((item) => item.partnerId === publicPR.myPartnerId) ??
        null;
  const isCreator = Boolean(viewerUserId && publicPR.createdBy === viewerUserId);
  const isParticipant = publicPR.myPartnerId !== null;
  const selfPendingSlot =
    publicPR.myPendingPartnerId === null
      ? null
      : pendingParticipants.find(
          (item) => item.partnerId === publicPR.myPendingPartnerId,
        ) ?? null;
  const waitlistRank =
    selfPendingSlot === null
      ? null
      : pendingParticipants.findIndex(
            (item) => item.partnerId === selfPendingSlot.partnerId,
          ) + 1;
  const releasedSlot = viewerUserId
    ? rosterParticipants
        .filter(
          (item) =>
            (item.status === "RELEASED" || item.status === "EXITED") &&
            item.userId === viewerUserId,
        )
        .sort((a, b) => {
          const aTime = a.releasedAt?.getTime() ?? 0;
          const bTime = b.releasedAt?.getTime() ?? 0;
          if (aTime !== bTime) return bTime - aTime;
          return b.partnerId - a.partnerId;
        })[0] ?? null
    : null;

  const releasedSlotState: PartnerSectionReleaseState | null =
    releasedSlot === null
      ? null
      : releasedSlot.status === "EXITED"
        ? "EXITED"
        : resolveReleaseState(releasedSlot.partnerId, releaseStateByPartnerId);

  const slotState: PartnerSectionView["viewer"]["slotState"] =
    selfActiveSlot?.status ??
    selfPendingSlot?.status ??
    releasedSlotState ??
    "NOT_JOINED";

  return {
    capacity: {
      current,
      min,
      max,
      remaining,
      neededToReady,
      pending: pendingParticipants.length,
      readiness,
    },
    roster,
    viewer: {
      isCreator,
      isParticipant,
      myPartnerId: publicPR.myPartnerId,
      pendingPartnerId: publicPR.myPendingPartnerId,
      isWaitlisted: selfPendingSlot !== null,
      waitlistRank,
      slotState,
      canJoin: false,
      canWaitlist: false,
      canExit: false,
      canConfirm: false,
      canCheckIn: false,
      joinBlockedReason: "NONE",
      exitBlockedReason: "NONE",
      confirmBlockedReason: "NONE",
      checkInBlockedReason: "NONE",
      waitlistBlockedReason: "NONE",
      releasedSlot: releasedSlot
        ? {
            partnerId: releasedSlot.partnerId,
            state: releasedSlotState ?? "RELEASED",
            releasedAt: toIsoString(releasedSlot.releasedAt),
            releaseReason: releasedSlot.releaseReason ?? null,
          }
        : null,
    },
  };
};

export function buildPRPartnerSection(params: {
  publicPR: PublicPR;
  activeParticipants: ActiveParticipantSummary[];
  pendingParticipants?: PendingParticipantSummary[];
  rosterParticipants: RosterParticipantSummary[];
  viewerUserId: UserId | null;
  policy?: ResolvedAnchorParticipationPolicy | null;
  sameBatchAlternatives?: Array<{
    id: PRId;
    location: string;
    status: PRStatus;
  }>;
  alternativeBatches?: AlternativeBatchRecommendation[];
  releaseStateByPartnerId?: Map<number, PartnerSectionReleaseState>;
  participationFrequencyLimited?: boolean;
}): PartnerSectionView {
  const {
    publicPR,
    activeParticipants,
    pendingParticipants = [],
    rosterParticipants,
    viewerUserId,
    policy = null,
    sameBatchAlternatives = [],
    alternativeBatches = [],
    releaseStateByPartnerId = new Map(),
    participationFrequencyLimited = false,
  } = params;

  const base = buildBaseSection(
    publicPR,
    activeParticipants,
    pendingParticipants,
    rosterParticipants,
    viewerUserId,
    releaseStateByPartnerId,
  );
  const current = activeParticipants.length;
  const hasParticipationPolicy = policy !== null;
  const confirmationEnabled = publicPR.confirmationEnabled;
  const confirmationPolicyEnabled =
    hasParticipationPolicy && policy.confirmationEnabled;
  const joinLocked =
    hasParticipationPolicy && policy?.joinLockAt
      ? Date.now() >= policy.joinLockAt.getTime()
      : false;
  const started = hasEventStarted(publicPR.time);
  const withinConfirmationWindow =
    confirmationPolicyEnabled &&
    policy?.confirmationStartAt !== null &&
    policy?.confirmationEndAt !== null &&
    Date.now() >= policy.confirmationStartAt.getTime() &&
    Date.now() < policy.confirmationEndAt.getTime();

  let canJoin = true;
  let joinBlockedReason: PartnerSectionActionBlockedReason = "NONE";
  if (base.viewer.isParticipant) {
    canJoin = false;
    joinBlockedReason = "ALREADY_JOINED";
  } else if (!isJoinableStatus(publicPR.status)) {
    canJoin = false;
    joinBlockedReason = "NOT_JOINABLE_STATUS";
  } else if (publicPR.maxPartners !== null && current >= publicPR.maxPartners) {
    canJoin = false;
    joinBlockedReason = "FULL";
  } else if (joinLocked) {
    canJoin = false;
    joinBlockedReason = "JOIN_LOCKED";
  } else if (participationFrequencyLimited) {
    canJoin = false;
    joinBlockedReason = "PARTICIPATION_FREQUENCY_LIMITED";
  }

  let canWaitlist = false;
  let waitlistBlockedReason: PartnerSectionActionBlockedReason = "NONE";
  const waitlistOpen =
    publicPR.status === "OPEN" &&
    publicPR.maxPartners !== null &&
    current >= publicPR.maxPartners;
  if (base.viewer.isParticipant) {
    waitlistBlockedReason = "ALREADY_JOINED";
  } else if (base.viewer.isWaitlisted) {
    waitlistBlockedReason = "ALREADY_WAITLISTED";
  } else if (!waitlistOpen) {
    waitlistBlockedReason = "NOT_JOINABLE_STATUS";
  } else if (joinLocked) {
    waitlistBlockedReason = "JOIN_LOCKED";
  } else if (participationFrequencyLimited) {
    waitlistBlockedReason = "PARTICIPATION_FREQUENCY_LIMITED";
  } else {
    canWaitlist = true;
  }

  let canExit = true;
  let exitBlockedReason: PartnerSectionActionBlockedReason = "NONE";
  if (base.viewer.isCreator) {
    canExit = false;
    exitBlockedReason = "NOT_JOINABLE_STATUS";
  } else if (!base.viewer.isParticipant) {
    canExit = false;
    exitBlockedReason = "NOT_JOINED";
  } else if (!isExitAllowedStatus(publicPR.status)) {
    canExit = false;
    exitBlockedReason = "NOT_JOINABLE_STATUS";
  } else if (hasParticipationPolicy && started) {
    canExit = false;
    exitBlockedReason = "EVENT_STARTED";
  }

  let canConfirm = true;
  let confirmBlockedReason: PartnerSectionActionBlockedReason = "NONE";
  if (!confirmationPolicyEnabled) {
    canConfirm = false;
    confirmBlockedReason = "OUTSIDE_CONFIRM_WINDOW";
  } else if (!base.viewer.isParticipant) {
    canConfirm = false;
    confirmBlockedReason = "NOT_JOINED";
  } else if (
    base.viewer.slotState === "CONFIRMED" ||
    base.viewer.slotState === "ATTENDED"
  ) {
    canConfirm = false;
    confirmBlockedReason = "ALREADY_CONFIRMED";
  } else if (!withinConfirmationWindow) {
    canConfirm = false;
    confirmBlockedReason = "OUTSIDE_CONFIRM_WINDOW";
  }

  let canCheckIn = true;
  let checkInBlockedReason: PartnerSectionActionBlockedReason = "NONE";
  if (!hasParticipationPolicy) {
    canCheckIn = false;
    checkInBlockedReason = "CHECKIN_NOT_OPEN";
  } else if (!base.viewer.isParticipant) {
    canCheckIn = false;
    checkInBlockedReason = "NOT_JOINED";
  } else if (base.viewer.slotState === "ATTENDED") {
    canCheckIn = false;
    checkInBlockedReason = "ALREADY_CONFIRMED";
  } else if (!started) {
    canCheckIn = false;
    checkInBlockedReason = "CHECKIN_NOT_OPEN";
  }

  return {
    ...base,
    viewer: {
      ...base.viewer,
      canJoin,
      canWaitlist,
      canExit,
      canConfirm,
      canCheckIn,
      joinBlockedReason,
      waitlistBlockedReason,
      exitBlockedReason,
      confirmBlockedReason,
      checkInBlockedReason,
    },
    reminder: hasParticipationPolicy
      ? {
          supported: true,
          visible: base.viewer.isParticipant,
        }
      : {
          supported: false,
          visible: false,
        },
    confirmation: {
      enabled: confirmationEnabled,
    },
    timeline: hasParticipationPolicy
      ? {
          eventStartAt: publicPR.time[0],
          confirmationStartAt: toIsoString(policy?.confirmationStartAt),
          confirmationEndAt: toIsoString(policy?.confirmationEndAt),
          joinLockAt: toIsoString(policy?.joinLockAt),
        }
      : null,
    fallbacks: {
      sameBatchAlternatives,
      alternativeBatches,
    },
  };
}

export function buildCommunityPartnerSection(
  publicPR: PublicPR,
  activeParticipants: ActiveParticipantSummary[],
  viewerUserId: UserId | null,
  options: {
    rosterParticipants?: RosterParticipantSummary[];
    releaseStateByPartnerId?: Map<number, PartnerSectionReleaseState>;
  } = {},
): PartnerSectionView {
  const rosterParticipants = options.rosterParticipants ?? activeParticipants;
  const releaseStateByPartnerId = options.releaseStateByPartnerId ?? new Map();
  return buildPRPartnerSection({
    publicPR,
    activeParticipants,
    pendingParticipants: [],
    rosterParticipants,
    viewerUserId,
    releaseStateByPartnerId,
  });
}

export function buildAnchorPartnerSection(params: {
  publicPR: PublicPR;
  activeParticipants: ActiveParticipantSummary[];
  pendingParticipants: PendingParticipantSummary[];
  rosterParticipants: RosterParticipantSummary[];
  viewerUserId: UserId | null;
  policy: ResolvedAnchorParticipationPolicy;
  sameBatchAlternatives: Array<{
    id: PRId;
    location: string;
    status: PRStatus;
  }>;
  alternativeBatches: AlternativeBatchRecommendation[];
  releaseStateByPartnerId?: Map<number, PartnerSectionReleaseState>;
  participationFrequencyLimited?: boolean;
}): PartnerSectionView {
  return buildPRPartnerSection({
    publicPR: params.publicPR,
    activeParticipants: params.activeParticipants,
    pendingParticipants: params.pendingParticipants,
    rosterParticipants: params.rosterParticipants,
    viewerUserId: params.viewerUserId,
    policy: params.policy,
    sameBatchAlternatives: params.sameBatchAlternatives,
    alternativeBatches: params.alternativeBatches,
    releaseStateByPartnerId: params.releaseStateByPartnerId,
    participationFrequencyLimited: params.participationFrequencyLimited,
  });
}
