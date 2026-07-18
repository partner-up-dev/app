import { throwHttpProblem } from "../../../lib/problem-details";

export const PARTNER_BOUNDS_ERROR_MESSAGES = {
  minPartnersInvalid: "最少人数必须为大于等于 1 的整数",
  maxPartnersInvalid: "最多人数必须为空或大于等于 2 的整数",
  maxPartnersBelowMin: "最多人数必须大于等于最少人数",
  maxPartnersBelowCurrentParticipants: "最多人数不能小于当前参与人数",
} as const;

export const MIN_MANUAL_PARTNERS = 1;
export const MIN_PRESENT_MAX_PARTNERS = 2;
export const DEFAULT_AUTOMATIC_MIN_PARTNERS = 2;

const throwPartnerBoundsError = (
  message: (typeof PARTNER_BOUNDS_ERROR_MESSAGES)[keyof typeof PARTNER_BOUNDS_ERROR_MESSAGES],
): never => {
  return throwHttpProblem({ status: 400, detail: message });
};

const assertMaxPartnersValid = (
  minPartners: number,
  maxPartners: number | null,
  currentParticipants: number,
): void => {
  if (maxPartners !== null && maxPartners < MIN_PRESENT_MAX_PARTNERS) {
    throwPartnerBoundsError(PARTNER_BOUNDS_ERROR_MESSAGES.maxPartnersInvalid);
  }
  if (maxPartners !== null && maxPartners < minPartners) {
    throwPartnerBoundsError(PARTNER_BOUNDS_ERROR_MESSAGES.maxPartnersBelowMin);
  }
  if (maxPartners !== null && maxPartners < currentParticipants) {
    throwPartnerBoundsError(PARTNER_BOUNDS_ERROR_MESSAGES.maxPartnersBelowCurrentParticipants);
  }
};

export function assertManualPartnerBoundsValid(
  minPartners: number | null,
  maxPartners: number | null,
  currentParticipants: number,
): asserts minPartners is number {
  const validatedMinPartners = minPartners ?? 0;
  if (validatedMinPartners < MIN_MANUAL_PARTNERS) {
    throwPartnerBoundsError(PARTNER_BOUNDS_ERROR_MESSAGES.minPartnersInvalid);
  }

  assertMaxPartnersValid(validatedMinPartners, maxPartners, currentParticipants);
}

export function normalizeAutomaticPartnerBounds(
  minPartners: number | null,
  maxPartners: number | null,
  currentParticipants: number,
): {
  minPartners: number;
  maxPartners: number | null;
} {
  const normalizedMinPartners =
    minPartners !== null && minPartners >= MIN_MANUAL_PARTNERS
      ? minPartners
      : DEFAULT_AUTOMATIC_MIN_PARTNERS;

  assertMaxPartnersValid(normalizedMinPartners, maxPartners, currentParticipants);

  return {
    minPartners: normalizedMinPartners,
    maxPartners,
  };
}
