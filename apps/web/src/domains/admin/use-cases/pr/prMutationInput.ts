import type { PRJoinGateConfig, PRRoute } from "@partner-up-dev/backend/contracts";
import type { AdminCreatePRInput } from "@/domains/admin/queries/useAdminPRManagement";
import { normalizePRRouteForSubmit } from "@/domains/pr/model/pr-route";

export type AdminPRBasicDraft = {
  title: string;
  type: string;
  startAt: string;
  endAt: string;
  location: string;
  route: PRRoute | null;
  minPartners: number | null;
  maxPartners: number | null;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
  preferencesText: string;
  notes: string;
  meetingPointDescription: string;
  meetingPointImageUrl: string;
  joinGateConfig: PRJoinGateConfig;
  confirmationEnabled: boolean;
};

export const toIsoDateTime = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
};

export const normalizeComma = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const buildMeetingPointInput = (
  description: string,
  imageUrl: string,
): { description: string | null; imageUrl: string | null } | null => {
  const normalizedDescription = description.trim();
  const normalizedImageUrl = imageUrl.trim();
  if (!normalizedDescription && !normalizedImageUrl) {
    return null;
  }

  return {
    description: normalizedDescription || null,
    imageUrl: normalizedImageUrl || null,
  };
};

export const buildPRContentInput = (draft: AdminPRBasicDraft): AdminCreatePRInput | null => {
  const startAt = toIsoDateTime(draft.startAt);
  const endAt = toIsoDateTime(draft.endAt);
  if (!startAt || !endAt) {
    return null;
  }
  const route = normalizePRRouteForSubmit(draft.route);

  return {
    timeWindow: [startAt, endAt],
    title: draft.title.trim() || null,
    type: draft.type.trim(),
    location: route === null ? draft.location.trim() || null : null,
    route,
    minPartners: draft.minPartners,
    maxPartners: draft.maxPartners,
    preferences: normalizeComma(draft.preferencesText),
    notes: draft.notes.trim() || null,
    meetingPoint: buildMeetingPointInput(draft.meetingPointDescription, draft.meetingPointImageUrl),
    joinGateConfig: draft.joinGateConfig,
    confirmationEnabled: draft.confirmationEnabled,
    confirmationStartOffsetMinutes: draft.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: draft.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: draft.joinLockOffsetMinutes,
  };
};
