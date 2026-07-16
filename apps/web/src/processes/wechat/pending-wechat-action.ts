import {
  isPRDiscoveryCreateReplaySelection,
  type PRDiscoveryCreateReplaySelection,
} from "@/domains/pr/model/discovery";

const PENDING_WECHAT_ACTION_STORAGE_KEY = "partner_up_pending_wechat_action";
const PENDING_WECHAT_ACTION_TTL_MS = 10 * 60 * 1000;

type PendingActionBase = {
  createdAt: number;
};

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

type PendingPRDiscoveryCreateAction = PendingActionBase & {
  kind: "PR_DISCOVERY_CREATE";
  selection: PRDiscoveryCreateReplaySelection;
  allowEditAfterReady: import("@partner-up-dev/backend").PRAllowEditAfterReady | null;
};

export type PendingWeChatAction =
  | PendingPRJoinAction
  | PendingPRWaitlistAction
  | PendingPRExitAction
  | PendingPRConfirmAction
  | PendingPRPublishAction
  | PendingPRDiscoveryCreateAction;

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
      kind: "PR_DISCOVERY_CREATE";
      selection: PRDiscoveryCreateReplaySelection;
      allowEditAfterReady: import("@partner-up-dev/backend").PRAllowEditAfterReady | null;
    };

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const isRecent = (createdAt: number): boolean =>
  Date.now() - createdAt <= PENDING_WECHAT_ACTION_TTL_MS;

const isAllowEditAfterReady = (
  value: unknown,
): value is import("@partner-up-dev/backend").PRAllowEditAfterReady | null => {
  if (value === null) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => !["timeWindow", "location", "route"].includes(key)))
    return false;
  if (candidate.location !== undefined && candidate.location !== true) return false;
  if (candidate.route !== undefined && candidate.route !== true) return false;
  if (candidate.timeWindow !== undefined) {
    if (
      !Array.isArray(candidate.timeWindow) ||
      candidate.timeWindow.length !== 2 ||
      !candidate.timeWindow.every((item) => typeof item === "string")
    )
      return false;
  }
  return true;
};

const isPendingWeChatAction = (value: unknown): value is PendingWeChatAction => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PendingWeChatAction>;
  if (typeof candidate.createdAt !== "number" || !Number.isFinite(candidate.createdAt)) {
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
  if (candidate.kind === "PR_DISCOVERY_CREATE") {
    return (
      isPRDiscoveryCreateReplaySelection(candidate.selection) &&
      isAllowEditAfterReady(candidate.allowEditAfterReady)
    );
  }
  return false;
};

export const setPendingWeChatAction = (action: NewPendingWeChatAction): void => {
  if (typeof window === "undefined") return;
  try {
    const payload: PendingWeChatAction = {
      ...action,
      createdAt: Date.now(),
    };
    window.localStorage.setItem(PENDING_WECHAT_ACTION_STORAGE_KEY, JSON.stringify(payload));
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
