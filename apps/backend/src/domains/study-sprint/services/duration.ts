import type { PartnerRequest } from "../../../entities/partner-request";
import { STUDY_SPRINT_DEFAULT_DURATION_MINUTES } from "../model";

const MS_PER_MINUTE = 60_000;

const parseTime = (value: string | null): Date | null => {
  if (value === null) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const deriveStudySprintDurationMinutes = (
  pr: PartnerRequest,
): number => {
  const startAt = parseTime(pr.time[0]);
  const endAt = parseTime(pr.time[1]);
  if (!startAt || !endAt) return STUDY_SPRINT_DEFAULT_DURATION_MINUTES;

  const diffMs = endAt.getTime() - startAt.getTime();
  if (diffMs <= 0) return STUDY_SPRINT_DEFAULT_DURATION_MINUTES;

  return Math.max(1, Math.ceil(diffMs / MS_PER_MINUTE));
};
