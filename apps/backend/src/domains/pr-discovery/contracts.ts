import type { PartnerRequest, PRRoute, PRStatus } from "../../entities/partner-request";

export type PRDiscoveryViewMode = "FORM" | "CARD" | "LIST";
export type PRDiscoveryViewRatios = Record<PRDiscoveryViewMode, number>;

export type PRDiscoveryCandidate = {
  prId: number;
  canonicalPath: string;
  title: string | null;
  type: string;
  location: string | null;
  route: PRRoute | null;
  placeDisplayName: string | null;
  preferences: string[];
  notes: string | null;
  time: [string | null, string | null];
  status: "OPEN";
  minPartners: number | null;
  maxPartners: number | null;
  partnerCount: number;
  createdAt: string;
};

/**
 * Public LIST projection. This is deliberately separate from the active
 * candidate contract: historical CLOSED records belong to LIST only and must
 * never leak into CARD or recommendation candidate sets.
 */
export type PRDiscoveryListRecord = {
  prId: number;
  canonicalPath: string;
  title: string | null;
  type: string;
  location: string | null;
  route: PRRoute | null;
  placeDisplayName: string | null;
  preferences: string[];
  notes: string | null;
  time: [string | null, string | null];
  status: Exclude<PRStatus, "DRAFT" | "EXPIRED">;
  minPartners: number | null;
  maxPartners: number | null;
  partnerCount: number;
  createdAt: string;
};

export type PRDiscoveryCatalogItem = {
  type: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  locationCount: number;
  locationPool: string[];
  routeCount: number;
  routePool: Array<{ id: string; route: PRRoute }>;
  pois: Array<{
    id: number;
    name: string;
    gallery: string[];
  }>;
  fallbackGallery: string[];
};

export type PRDiscoveryTypeDetail = PRDiscoveryCatalogItem & {
  communityQrCode: string | null;
  viewRatios: PRDiscoveryViewRatios;
};

export type PRDiscoveryDirectoryCriteria = {
  type: string;
  dates: string[];
};

export type PRDiscoveryDirectoryResponse = {
  criteria: PRDiscoveryDirectoryCriteria;
  candidates: PRDiscoveryCandidate[];
  listRecords: PRDiscoveryListRecord[];
  cardGroups: PRDiscoveryCardGroup[];
};

export type PRDiscoveryRecommendationMatch = {
  exactPlace: boolean;
  exactLocation: boolean;
  exactRoute: boolean;
  startDeltaMinutes: number | null;
  startWithinWindow: boolean;
  exactTagMatches: string[];
  conflictingTagMatches: string[];
  groupMomentumScore: number;
  score: number;
};

export type PRDiscoveryRecommendationCandidate = PRDiscoveryCandidate & {
  match: PRDiscoveryRecommendationMatch;
};

export type PRDiscoveryRecommendationResponse = {
  selection: {
    type: string;
    place: PRDiscoveryPlaceSelection;
    timeWindows: Array<{ startAt: string; endAt: string }>;
    preferences: string[];
  };
  matchedCandidate: PRDiscoveryRecommendationCandidate | null;
  orderedCandidates: PRDiscoveryRecommendationCandidate[];
};

export type PRDiscoveryPlaceSelection =
  | { kind: "location"; location: string }
  | { kind: "route"; route: PRRoute };

export type PRDiscoveryCardGroup = {
  cardKey: string;
  timeWindow: [string | null, string | null];
  batchStartTimestamp: number;
  displayLocationName: string;
  preferenceFingerprint: string | null;
  preferenceTags: string[];
  notes: string | null;
  detailPrId: number;
  representativeCandidate: PRDiscoveryCandidate;
  candidateCount: number;
  candidates: PRDiscoveryCandidate[];
};

export type PRDiscoveryConfigRow = {
  type: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  communityQrCode: string | null;
  locationPool: string[];
  routePool: Array<{ id: string; route: PRRoute }>;
  discoveryFormRatio: number;
  discoveryCardRatio: number;
  discoveryListRatio: number;
};

const isDiscoveryListRecordStatus = (status: PRStatus): status is PRDiscoveryListRecord["status"] =>
  status === "OPEN" || status === "READY" || status === "ACTIVE" || status === "CLOSED";

export const toDiscoveryCandidate = (
  pr: Pick<
    PartnerRequest,
    | "id"
    | "title"
    | "type"
    | "location"
    | "route"
    | "time"
    | "minPartners"
    | "maxPartners"
    | "preferences"
    | "notes"
    | "createdAt"
  >,
  partnerCount: number,
): PRDiscoveryCandidate => ({
  prId: pr.id,
  canonicalPath: `/pr/${pr.id}`,
  title: pr.title,
  type: pr.type,
  location: pr.location,
  route: pr.route,
  placeDisplayName: resolvePlaceDisplayName(pr),
  preferences: Array.isArray(pr.preferences) ? [...pr.preferences] : [],
  notes: pr.notes,
  time: pr.time,
  status: "OPEN",
  minPartners: pr.minPartners,
  maxPartners: pr.maxPartners,
  partnerCount,
  createdAt: pr.createdAt.toISOString(),
});

export const toDiscoveryListRecord = (
  pr: Pick<
    PartnerRequest,
    | "id"
    | "title"
    | "type"
    | "location"
    | "route"
    | "time"
    | "status"
    | "minPartners"
    | "maxPartners"
    | "preferences"
    | "notes"
    | "createdAt"
  >,
  partnerCount: number,
): PRDiscoveryListRecord => {
  if (!isDiscoveryListRecordStatus(pr.status)) {
    throw new Error(`PR status ${pr.status} cannot be projected into LIST`);
  }
  return {
    prId: pr.id,
    canonicalPath: `/pr/${pr.id}`,
    title: pr.title,
    type: pr.type,
    location: pr.location,
    route: pr.route,
    placeDisplayName: resolvePlaceDisplayName(pr),
    preferences: Array.isArray(pr.preferences) ? [...pr.preferences] : [],
    notes: pr.notes,
    time: pr.time,
    status: pr.status,
    minPartners: pr.minPartners,
    maxPartners: pr.maxPartners,
    partnerCount,
    createdAt: pr.createdAt.toISOString(),
  };
};

const resolvePlaceDisplayName = (pr: Pick<PartnerRequest, "location" | "route">): string | null => {
  const location = pr.location?.trim();
  if (location) return location;
  const route = pr.route;
  if (!route || route.length < 2) return null;
  const first = route[0]?.name.trim();
  const last = route[route.length - 1]?.name.trim();
  return first && last ? `${first}~${last}` : null;
};
