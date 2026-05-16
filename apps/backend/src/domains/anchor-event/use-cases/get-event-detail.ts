import { throwHttpProblem } from "../../../lib/problem-details";
/**
 * Use-case: Get a single Anchor Event with event-owned create assistance and
 * same-type PR browsing data.
 */

import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type {
  AnchorEvent,
  AnchorEventId,
  AnchorEventPrCreationPolicy,
  TimeWindowEntry,
} from "../../../entities/anchor-event";
import type {
  PRRoute,
  PRStatus,
  PartnerRequest,
} from "../../../entities/partner-request";
import {
  isActiveVisiblePRStatus,
  isTimeWindowAvailableByPoiRules,
  readVisiblePartnerRequestsByType,
  readVisiblePartnerRequestsByTypeAndTime,
  canUserCreatePRForAnchorEvent,
  resolvePRPlaceDisplayName,
} from "../../pr/services";
import {
  listAnchorEventTimeWindowDetails,
  resolveAnchorEventTimeWindowDescription,
} from "../services/time-window-pool";
import { resolvePublicEventLocationPool } from "../services/event-scope";
import { findPoisByNames } from "../../poi";

const eventRepo = new AnchorEventRepository();
const partnerRepo = new PartnerRepository();

export interface EventPRSummary {
  id: number;
  title: string | null;
  type: string;
  location: string | null;
  route: PRRoute | null;
  placeDisplayName: string | null;
  preferences: string[];
  notes: string | null;
  time: [string | null, string | null];
  status: PRStatus;
  minPartners: number | null;
  maxPartners: number | null;
  partnerCount: number;
  createdAt: string;
}

export interface BrowseTimeWindowDetail {
  key: string;
  timeWindow: [string | null, string | null];
  description: string | null;
  prs: EventPRSummary[];
}

export interface CreateTimeWindowDetail {
  key: string;
  timeWindow: [string | null, string | null];
  description: string | null;
  locationOptions: LocationOption[];
}

export interface LocationOption {
  locationId: string;
  remainingQuota: number | null;
  disabled: boolean;
  disabledReason: "NONE" | "MAX_REACHED" | "TIME_UNAVAILABLE";
}

export interface AnchorEventDetail {
  id: number;
  title: string;
  type: string;
  description: string | null;
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  locationPool: string[];
  timeWindowPool: TimeWindowEntry[];
  coverImage: string | null;
  betaGroupQrCode: string | null;
  prCreationPolicy: AnchorEventPrCreationPolicy;
  canUserCreatePR: boolean;
  status: string;
  browseTimeWindows: BrowseTimeWindowDetail[];
  createTimeWindows: CreateTimeWindowDetail[];
  exhausted: boolean;
  createdAt: string;
}

const trimNullable = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toPRSummary = (pr: PartnerRequest): EventPRSummary => ({
  id: pr.id,
  title: pr.title,
  type: pr.type,
  location: pr.location,
  route: pr.route,
  placeDisplayName: resolvePRPlaceDisplayName(pr),
  preferences: Array.isArray(pr.preferences) ? pr.preferences : [],
  notes: pr.notes,
  time: pr.time,
  status: pr.status,
  minPartners: pr.minPartners,
  maxPartners: pr.maxPartners,
  partnerCount: 0,
  createdAt: pr.createdAt.toISOString(),
});

const buildTimeWindowKey = (timeWindow: TimeWindowEntry): string => {
  const [start, end] = timeWindow;
  return `${start ?? "_"}::${end ?? "_"}`;
};

const resolveTimeWindowSortTimestamp = (timeWindow: TimeWindowEntry): number => {
  const [start] = timeWindow;
  if (!start) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = new Date(start).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

const sortBrowseTimeWindows = (
  left: BrowseTimeWindowDetail,
  right: BrowseTimeWindowDetail,
): number => {
  const leftTimestamp = resolveTimeWindowSortTimestamp(left.timeWindow);
  const rightTimestamp = resolveTimeWindowSortTimestamp(right.timeWindow);
  if (leftTimestamp !== rightTimestamp) {
    return leftTimestamp - rightTimestamp;
  }

  return left.key.localeCompare(right.key);
};

const buildBrowseTimeWindowDetails = (
  prs: PartnerRequest[],
  event: Pick<AnchorEvent, "timePoolConfig">,
): BrowseTimeWindowDetail[] => {
  const byKey = new Map<string, BrowseTimeWindowDetail>();

  for (const pr of prs) {
    const key = buildTimeWindowKey(pr.time);
    const existing = byKey.get(key);
    if (existing) {
      existing.prs.push(toPRSummary(pr));
      continue;
    }

    byKey.set(key, {
      key,
      timeWindow: pr.time,
      description: resolveAnchorEventTimeWindowDescription(event, pr.time),
      prs: [toPRSummary(pr)],
    });
  }

  return Array.from(byKey.values()).sort(sortBrowseTimeWindows);
};

export async function getAnchorEventDetail(
  eventId: AnchorEventId,
): Promise<AnchorEventDetail> {
  const event = await eventRepo.findById(eventId);
  if (!event) {
    return throwHttpProblem({ status: 404, detail: "Anchor event not found" });
  }

  const locationPool = await resolvePublicEventLocationPool(event);
  const timeWindowDetails = listAnchorEventTimeWindowDetails(event);
  const timeWindowPool = timeWindowDetails.map((detail) => detail.timeWindow);
  const pois = await findPoisByNames(locationPool);
  const poiByLocation = new Map(pois.map((poi) => [poi.name, poi]));

  const browsePRs = await readVisiblePartnerRequestsByType(event.type);
  const browseTimeWindows = buildBrowseTimeWindowDetails(browsePRs, event);
  const activePartnerCounts = await partnerRepo.countActiveByPrIds(
    browsePRs.map((pr) => pr.id),
  );

  for (const browseTimeWindow of browseTimeWindows) {
    for (const pr of browseTimeWindow.prs) {
      pr.partnerCount = activePartnerCounts.get(pr.id) ?? 0;
    }
  }

  const createTimeWindows: CreateTimeWindowDetail[] = [];
  let hasAvailableCapacity = false;

  for (const timeWindowDetail of timeWindowDetails) {
    const timeWindow = timeWindowDetail.timeWindow;
    const sameTypePRs = await readVisiblePartnerRequestsByTypeAndTime(
      event.type,
      timeWindow,
    );
    const activeCountsByLocation = new Map<string, number>();

    for (const pr of sameTypePRs) {
      if (!isActiveVisiblePRStatus(pr.status)) {
        continue;
      }

      const location = trimNullable(pr.location);
      if (!location) {
        continue;
      }
      if (!locationPool.includes(location)) {
        continue;
      }

      activeCountsByLocation.set(
        location,
        (activeCountsByLocation.get(location) ?? 0) + 1,
      );
    }

    const locationOptions: LocationOption[] = locationPool.map((locationId) => {
      const activeCount = activeCountsByLocation.get(locationId) ?? 0;
      const poi = poiByLocation.get(locationId) ?? null;
      const cap = poi?.perTimeWindowCap ?? null;
      const remainingQuota =
        cap === null ? null : Math.max(cap - activeCount, 0);
      const timeAvailable =
        !poi ||
        poi.availabilityRules.length === 0 ||
        isTimeWindowAvailableByPoiRules(poi.availabilityRules, timeWindow);
      const disabled =
        !timeAvailable || (remainingQuota !== null && remainingQuota <= 0);
      if (!disabled) {
        hasAvailableCapacity = true;
      }

      return {
        locationId,
        remainingQuota,
        disabled,
        disabledReason: !timeAvailable
          ? "TIME_UNAVAILABLE"
          : disabled
            ? "MAX_REACHED"
            : "NONE",
      };
    });

    createTimeWindows.push({
      key: timeWindowDetail.key,
      timeWindow,
      description: timeWindowDetail.description,
      locationOptions,
    });
  }

  const exhausted =
    timeWindowPool.length === 0 || locationPool.length === 0 || !hasAvailableCapacity;

  return {
    id: event.id,
    title: event.title,
    type: event.type,
    description: event.description,
    defaultMinPartners: event.defaultMinPartners ?? null,
    defaultMaxPartners: event.defaultMaxPartners ?? null,
    locationPool,
    timeWindowPool,
    coverImage: event.coverImage,
    betaGroupQrCode: event.betaGroupQrCode,
    prCreationPolicy: event.prCreationPolicy,
    canUserCreatePR: canUserCreatePRForAnchorEvent(event),
    status: event.status,
    browseTimeWindows,
    createTimeWindows,
    exhausted,
    createdAt: event.createdAt.toISOString(),
  };
}
