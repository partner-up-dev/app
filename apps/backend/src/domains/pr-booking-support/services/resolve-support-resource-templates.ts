import type {
  AnchorEventSupportResource,
  NewPRSupportResource,
} from "../../../entities";
import { getTimeWindowStart, type TimeWindow } from "../../pr/services";

const BOOKING_DEADLINE_RULE_PATTERN = /^T-(\d+)([mhd])$/i;

const resolveBookingDeadlineAt = (
  bookingDeadlineRule: string | null | undefined,
  timeWindow: TimeWindow,
): Date | null => {
  if (!bookingDeadlineRule) return null;

  const trimmed = bookingDeadlineRule.trim();
  if (!trimmed) return null;

  const absolute = new Date(trimmed);
  if (!Number.isNaN(absolute.getTime())) {
    return absolute;
  }

  const start = getTimeWindowStart(timeWindow);
  if (!start) return null;

  const match = trimmed.match(BOOKING_DEADLINE_RULE_PATTERN);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) return null;

  let offsetMs = 0;
  if (unit === "m") offsetMs = amount * 60 * 1000;
  if (unit === "h") offsetMs = amount * 60 * 60 * 1000;
  if (unit === "d") offsetMs = amount * 24 * 60 * 60 * 1000;
  if (offsetMs <= 0) return null;

  return new Date(start.getTime() - offsetMs);
};

const matchesLocation = (
  resource: AnchorEventSupportResource,
  location: string | null,
): boolean => {
  if (resource.appliesToAllLocations) return true;
  if (!location) return false;
  return resource.locationIds.includes(location);
};

const normalizeDetailRules = (
  overrideRules: string[] | null | undefined,
  fallbackRules: string[],
): string[] =>
  overrideRules && overrideRules.length > 0 ? [...overrideRules] : [...fallbackRules];

export interface ResolveSupportTemplatesInput {
  eventResources: AnchorEventSupportResource[];
  prId: number;
  location: string | null;
  timeWindow: TimeWindow;
}

export const resolveSupportResourceTemplates = ({
  eventResources,
  prId,
  location,
  timeWindow,
}: ResolveSupportTemplatesInput): NewPRSupportResource[] => {
  const resolved: NewPRSupportResource[] = [];

  for (const resource of eventResources) {
    if (!matchesLocation(resource, location)) continue;
    const bookingRequired = resource.bookingRequired;
    const bookingDeadlineRule = resource.bookingDeadlineRule;

    resolved.push({
      prId,
      sourceEventSupportResourceId: resource.id,
      title: resource.title,
      resourceKind: resource.resourceKind,
      bookingRequired,
      bookingHandledBy:
        bookingRequired ? (resource.bookingHandledBy ?? null) : null,
      bookingDeadlineAt: bookingRequired
        ? resolveBookingDeadlineAt(bookingDeadlineRule, timeWindow)
        : null,
      bookingLocksParticipant: resource.bookingLocksParticipant,
      cancellationPolicy: resource.cancellationPolicy ?? null,
      settlementMode: resource.settlementMode,
      subsidyRate: resource.subsidyRate ?? null,
      subsidyCap: resource.subsidyCap ?? null,
      requiresUserTransferToPlatform: resource.requiresUserTransferToPlatform,
      summaryText: resource.summaryText,
      detailRules: normalizeDetailRules(undefined, resource.detailRules),
      joinGateConfig: resource.joinGateConfig,
      displayOrder: resource.displayOrder,
    });
  }

  return resolved.sort(
    (a, b) =>
      (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
      a.title.localeCompare(b.title),
  );
};
