import type { PRDisplayStatus } from "@/domains/pr/model/pr-display-status";

type Translate = (key: string) => string;

const PR_STATUS_TEXT_KEYS: Record<PRDisplayStatus, string> = {
  DRAFT: "status.draft",
  OPEN: "status.open",
  READY: "status.ready",
  FULL: "status.full",
  ACTIVE: "status.active",
  CLOSED: "status.closed",
  EXPIRED: "status.expired",
};

const PR_STATUS_TAG_TONES = {
  DRAFT: "neutral",
  OPEN: "primary",
  READY: "tertiary",
  FULL: "error",
  ACTIVE: "secondary",
  CLOSED: "neutral",
  EXPIRED: "neutral",
} as const satisfies Record<PRDisplayStatus, string>;

export const resolvePRStatusTagText = (status: PRDisplayStatus, t: Translate): string =>
  t(PR_STATUS_TEXT_KEYS[status]);

export const resolvePRStatusTagTone = (
  status: PRDisplayStatus,
): (typeof PR_STATUS_TAG_TONES)[PRDisplayStatus] => PR_STATUS_TAG_TONES[status];
