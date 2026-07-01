import { throwHttpProblem } from "../../../lib/problem-details";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PlacementRepository } from "../../../repositories/PlacementRepository";
import type { PlacementId } from "../../../entities/placement";
import type { PRId } from "../../../entities/partner-request";
import type { PlacementType } from "../model";
import {
  isPlacementActiveAt,
  listMatchingPlacementCandidates,
  resolvePlacementBindings,
} from "../services";
import {
  getOrderingOfferDetail,
  type OrderingOfferDetail,
} from "./get-ordering-offer-detail";

const placementRepo = new PlacementRepository();
const offerRepo = new OfferRepository();
const partnerRepo = new PartnerRepository();

export type PlacementInstanceProjection = {
  id: number;
  type: PlacementType;
  offerId: number;
  creative: {
    ctaLabel: string;
    description?: string | null;
  };
  bindingRules: Array<{
    fieldKey: string;
    contextPath: string;
    lock: true;
  }>;
};

export type MatchPlacementInstanceResult = {
  placements: PlacementInstanceProjection[];
};

export type OrderingEntryPayload = {
  source: {
    offerId: number;
  };
  offerDetail: OrderingOfferDetail;
  prId?: number;
  bindings: Record<string, unknown>;
  bindingLocks: Record<string, true>;
};

const isOfferActiveNow = (
  offer: { status: string; startsAt: Date | null; endsAt: Date | null },
  now = new Date(),
): boolean => {
  if (offer.status !== "ACTIVE") return false;
  if (offer.startsAt && offer.startsAt > now) return false;
  if (offer.endsAt && offer.endsAt <= now) return false;
  return true;
};

export async function matchPlacementInstance(input: {
  type: PlacementType;
  matchingContext: unknown;
}): Promise<MatchPlacementInstanceResult> {
  const placementCandidates = await placementRepo.listActiveByType({
    placementType: input.type,
  });
  const matchingPlacements = listMatchingPlacementCandidates({
    candidates: placementCandidates,
    context: input.matchingContext,
  });

  const placements: PlacementInstanceProjection[] = [];
  for (const placement of matchingPlacements) {
    if (!isPlacementActiveAt(placement)) continue;
    const offer = await offerRepo.findById(placement.offerId);
    if (!offer || !isOfferActiveNow(offer)) continue;
    placements.push({
      id: placement.id,
      type: placement.placementType,
      offerId: placement.offerId,
      creative: placement.creative,
      bindingRules: placement.bindingRules,
    });
  }

  return { placements };
}

export async function resolvePlacementInstanceBindings(input: {
  placementInstanceId: PlacementId;
  matchingContext: unknown;
}): Promise<{ bindings: Record<string, unknown> }> {
  const placement = await placementRepo.findById(input.placementInstanceId);
  if (!placement) {
    return throwHttpProblem({ status: 404, detail: "Placement not found" });
  }
  if (!isPlacementActiveAt(placement)) {
    return throwHttpProblem({ status: 409, detail: "Placement is not active" });
  }
  return {
    bindings: resolvePlacementBindings({
      context: input.matchingContext,
      rules: placement.bindingRules,
    }),
  };
}

const readPrIdFromMatchingContext = (matchingContext: unknown): number | undefined => {
  if (
    typeof matchingContext !== "object" ||
    matchingContext === null ||
    Array.isArray(matchingContext)
  ) {
    return undefined;
  }
  const candidate = (matchingContext as Record<string, unknown>).prId;
  return typeof candidate === "number" && Number.isInteger(candidate)
    ? candidate
    : undefined;
};

const readRecordProperty = (
  value: unknown,
  key: string,
): unknown | undefined => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return (value as Record<string, unknown>)[key];
};

const readTimeString = (matchingContext: unknown, key: "startAt" | "endAt") => {
  const time = readRecordProperty(matchingContext, "time");
  const value = readRecordProperty(time, key);
  return typeof value === "string" ? new Date(value).toISOString() : null;
};

const readCoordinate = (
  value: unknown,
): { latitude: number; longitude: number } | null => {
  if (!Array.isArray(value) || value.length < 2) return null;
  const latitude = value[0];
  const longitude = value[1];
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  return { latitude, longitude };
};

const readRoutePlace = (value: unknown) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const coordinate =
    readCoordinate(record.gcj02) ??
    readCoordinate(record.bd09) ??
    readCoordinate(record.wgs84);
  if (!coordinate || typeof record.name !== "string") return null;
  return {
    name: record.name,
    address: typeof record.full_address === "string" ? record.full_address : null,
    ...coordinate,
  };
};

const readRouteSnapshot = (matchingContext: unknown) => {
  const route = readRecordProperty(matchingContext, "route");
  if (!Array.isArray(route) || route.length < 2) return null;
  const places = route.map(readRoutePlace);
  if (places.some((place) => place === null)) return null;
  const resolvedPlaces = places as Array<NonNullable<ReturnType<typeof readRoutePlace>>>;
  const origin = resolvedPlaces[0]!;
  const destination = resolvedPlaces[resolvedPlaces.length - 1]!;
  const waypoints = resolvedPlaces.slice(1, -1);
  return {
    origin,
    waypoints,
    destination,
    drivingPlan: {
      distanceMeters: null,
      durationSeconds: null,
      polyline: resolvedPlaces.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
      })),
    },
  };
};

export async function resolvePlacementOrderingEntry(input: {
  placementInstanceId: PlacementId;
  matchingContext: unknown;
  viewerUserId?: string | null;
}): Promise<OrderingEntryPayload> {
  const placement = await placementRepo.findById(input.placementInstanceId);
  if (!placement) {
    return throwHttpProblem({ status: 404, detail: "Placement not found" });
  }
  if (!isPlacementActiveAt(placement)) {
    return throwHttpProblem({ status: 409, detail: "Placement is not active" });
  }

  const bindings = resolvePlacementBindings({
    context: input.matchingContext,
    rules: placement.bindingRules,
  });
  const bindingLocks = Object.fromEntries(
    placement.bindingRules.map((rule) => [rule.fieldKey, true] as const),
  );
  const prId = readPrIdFromMatchingContext(input.matchingContext);
  const activeParticipantCount = readRecordProperty(
    input.matchingContext,
    "activeParticipantCount",
  );
  const routeSnapshot = readRouteSnapshot(input.matchingContext);
  const startAt = readTimeString(input.matchingContext, "startAt");
  const endAt = readTimeString(input.matchingContext, "endAt");
  const activeParticipants =
    prId === undefined
      ? []
      : await partnerRepo.listActiveParticipantSummariesByPrId(prId as PRId);
  const viewerParticipant = input.viewerUserId
    ? (activeParticipants.find(
        (participant) => participant.userId === input.viewerUserId,
      ) ?? null)
    : null;
  if (
    prId !== undefined &&
    (!input.viewerUserId ||
      !activeParticipants.some(
        (participant) => participant.userId === input.viewerUserId,
      ))
  ) {
    return throwHttpProblem({
      status: 403,
      detail: "Only active PR participants can resolve this ordering entry",
    });
  }
  const offerDetail = await getOrderingOfferDetail({
    offerId: placement.offerId,
  });

  return {
    source: {
      offerId: placement.offerId,
    },
    offerDetail,
    ...(prId === undefined ? {} : { prId }),
    bindingLocks,
    bindings: {
      ...bindings,
      ...(typeof activeParticipantCount === "number"
        ? { participantCount: activeParticipantCount }
        : {}),
      ...(startAt ? { serviceStartAt: startAt } : {}),
      ...(endAt ? { serviceEndAt: endAt } : {}),
      ...(routeSnapshot ? { route: routeSnapshot } : {}),
      ...(viewerParticipant?.phoneNumber?.trim()
        ? { contactPhone: viewerParticipant.phoneNumber.trim() }
        : {}),
      ...(activeParticipants.length === 0
        ? {}
        : {
            orderParticipants: activeParticipants.map((participant) => ({
              userId: participant.userId,
              displayName: participant.nickname ?? "参与者",
              phoneMasked: participant.phoneNumber
                ? `${participant.phoneNumber.slice(0, 3)}****${participant.phoneNumber.slice(-4)}`
                : null,
            })),
          }),
    },
  };
}
