import type { PRAllowEditAfterReady, PRRoute } from "@partner-up-dev/backend";

const PENDING_WECHAT_ACTION_STORAGE_KEY = "partner_up_pending_wechat_action";
const PENDING_WECHAT_ACTION_TTL_MS = 10 * 60 * 1000;

type PendingActionBase = {
  createdAt: number;
};

type PendingAnchorCreateHandoff = "event_assisted_create";

type PendingPRJoinAction = PendingActionBase & {
  kind: "PR_JOIN";
  prId: number;
};

type PendingPRWaitlistAction = PendingActionBase & {
  kind: "PR_WAITLIST";
  prId: number;
};

type PendingPRExitAction = PendingActionBase & {
  kind: "PR_EXIT";
  prId: number;
};

type PendingPRConfirmAction = PendingActionBase & {
  kind: "PR_CONFIRM";
  prId: number;
};

type PendingPRPublishAction = PendingActionBase & {
  kind: "PR_PUBLISH";
  prId: number;
};

type PendingAnchorCreateAction = PendingActionBase & {
  kind: "EVENT_ASSISTED_PR_CREATE";
  eventId: number;
  handoff?: PendingAnchorCreateHandoff;
  allowEditAfterReady?: PRAllowEditAfterReady | null;
  fields: {
    type: string;
    time: [string | null, string | null];
    location: string | null;
    route: PRRoute | null;
    minPartners: number | null;
    maxPartners: number | null;
    preferences: string[];
  };
};

export type PendingWeChatAction =
  | PendingPRJoinAction
  | PendingPRWaitlistAction
  | PendingPRExitAction
  | PendingPRConfirmAction
  | PendingPRPublishAction
  | PendingAnchorCreateAction;

type NewPendingWeChatAction =
  | {
      kind: "PR_JOIN";
      prId: number;
    }
  | {
      kind: "PR_WAITLIST";
      prId: number;
    }
  | {
      kind: "PR_EXIT";
      prId: number;
    }
  | {
      kind: "PR_CONFIRM";
      prId: number;
    }
  | {
      kind: "PR_PUBLISH";
      prId: number;
    }
  | {
      kind: "EVENT_ASSISTED_PR_CREATE";
      eventId: number;
      handoff?: PendingAnchorCreateHandoff;
      allowEditAfterReady?: PRAllowEditAfterReady | null;
      fields: {
        type: string;
        time: [string | null, string | null];
        location: string | null;
        route: PRRoute | null;
        minPartners: number | null;
        maxPartners: number | null;
        preferences: string[];
      };
    };

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const isCoordinatePair = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === "number" &&
  Number.isFinite(value[0]) &&
  typeof value[1] === "number" &&
  Number.isFinite(value[1]);

const isNullableCoordinatePair = (
  value: unknown,
): value is [number, number] | null =>
  value === null || isCoordinatePair(value);

const isPRRoutePoint = (value: unknown): value is PRRoute[number] => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const point = value as Partial<PRRoute[number]>;
  return (
    isNullableCoordinatePair(point.wgs84) &&
    isNullableCoordinatePair(point.bd09) &&
    isNullableCoordinatePair(point.gcj02) &&
    typeof point.name === "string" &&
    point.name.trim().length > 0 &&
    (point.full_address === null || typeof point.full_address === "string") &&
    (point.wgs84 !== null || point.bd09 !== null || point.gcj02 !== null)
  );
};

const isPRRoute = (value: unknown): value is PRRoute =>
  Array.isArray(value) && value.length >= 2 && value.every(isPRRoutePoint);

const isEditableAfterReady = (
  value: unknown,
): value is PRAllowEditAfterReady | null | undefined => {
  if (value === undefined || value === null) return true;
  if (typeof value !== "object") return false;
  const policy = value as Partial<PRAllowEditAfterReady>;
  return (
    policy.location === undefined &&
    policy.route === undefined &&
    (policy.timeWindow === undefined ||
      (Array.isArray(policy.timeWindow) &&
        policy.timeWindow.length === 2 &&
        typeof policy.timeWindow[0] === "string" &&
        typeof policy.timeWindow[1] === "string"))
  );
};

const isRecent = (createdAt: number): boolean =>
  Date.now() - createdAt <= PENDING_WECHAT_ACTION_TTL_MS;

const isPendingWeChatAction = (
  value: unknown,
): value is PendingWeChatAction => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PendingWeChatAction>;
  if (
    typeof candidate.createdAt !== "number" ||
    !Number.isFinite(candidate.createdAt)
  ) {
    return false;
  }

  if (candidate.kind === "PR_JOIN") {
    return isPositiveInteger(candidate.prId);
  }
  if (candidate.kind === "PR_WAITLIST") {
    return isPositiveInteger(candidate.prId);
  }
  if (candidate.kind === "PR_EXIT") {
    return isPositiveInteger(candidate.prId);
  }
  if (candidate.kind === "PR_CONFIRM") {
    return isPositiveInteger(candidate.prId);
  }
  if (candidate.kind === "PR_PUBLISH") {
    return isPositiveInteger(candidate.prId);
  }
  if (candidate.kind === "EVENT_ASSISTED_PR_CREATE") {
    const anchorCandidate = candidate as Partial<PendingAnchorCreateAction>;
    const fields = anchorCandidate.fields;
    return (
      isPositiveInteger(anchorCandidate.eventId) &&
      (anchorCandidate.handoff === undefined ||
        anchorCandidate.handoff === "event_assisted_create") &&
      typeof fields === "object" &&
      fields !== null &&
      typeof fields.type === "string" &&
      fields.type.trim().length > 0 &&
      Array.isArray(fields.time) &&
      fields.time.length === 2 &&
      (fields.time[0] === null || typeof fields.time[0] === "string") &&
      (fields.time[1] === null || typeof fields.time[1] === "string") &&
      (fields.location === null ||
        (typeof fields.location === "string" &&
          fields.location.trim().length > 0)) &&
      (fields.route === null || isPRRoute(fields.route)) &&
      (fields.location !== null || fields.route !== null) &&
      isEditableAfterReady(anchorCandidate.allowEditAfterReady) &&
      Array.isArray(fields.preferences) &&
      fields.preferences.every((entry) => typeof entry === "string") &&
      (fields.minPartners === null || isPositiveInteger(fields.minPartners)) &&
      (fields.maxPartners === null || isPositiveInteger(fields.maxPartners))
    );
  }

  return false;
};

export const setPendingWeChatAction = (
  action: NewPendingWeChatAction,
): void => {
  if (typeof window === "undefined") return;
  try {
    const payload: PendingWeChatAction = {
      ...action,
      createdAt: Date.now(),
    };
    window.localStorage.setItem(
      PENDING_WECHAT_ACTION_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // Ignore storage failures.
  }
};

export const clearPendingWeChatAction = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PENDING_WECHAT_ACTION_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
};

export const readPendingWeChatAction = (): PendingWeChatAction | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_WECHAT_ACTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isPendingWeChatAction(parsed)) {
      clearPendingWeChatAction();
      return null;
    }
    if (!isRecent(parsed.createdAt)) {
      clearPendingWeChatAction();
      return null;
    }
    return parsed;
  } catch {
    clearPendingWeChatAction();
    return null;
  }
};
