import type { PRId } from "../../../entities/partner-request";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { findPoisByNames } from "../../poi";
import { createPRFromStructured } from "./create-pr-structured";
import { getPRTypeConfigExpansionPolicy } from "../../pr-type-config";
import {
  isPRActiveStatus,
  readVisiblePartnerRequestsByTypeAndTime,
} from "../services/pr-read.service";
import { reconcileAlternativeWaitlistNotificationsForCandidate } from "../services/waitlist-alternative-reconciler.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

const findNextAvailableLocation = (
  pool: string[],
  sourceLocation: string,
  activeCountsByLocation: Map<string, number>,
  perTimeWindowCapByLocation: Map<string, number | null>,
): string | null => {
  for (const location of pool) {
    if (location === sourceLocation) continue;
    const cap = perTimeWindowCapByLocation.get(location) ?? null;
    if (cap === null || (activeCountsByLocation.get(location) ?? 0) < cap) {
      return location;
    }
  }
  return null;
};

/** Create a sibling PR at another location when a type's expansion policy allows it. */
export async function expandFullCapacityPR(prId: PRId): Promise<void> {
  const request = await prRepo.findById(prId);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  if (request.maxPartners === null) return;

  const sourceActiveCount = await partnerRepo.countActiveByPrId(prId);
  if (sourceActiveCount < request.maxPartners) return;

  const config = await getPRTypeConfigExpansionPolicy(request.type);
  if (!config || config.fullCapacityExpansionPolicy !== "ENABLED") return;

  const sourceLocation = request.location?.trim() ?? "";
  const configuredLocationPool = Array.from(
    new Set(config.locationPool.map((location) => location.trim()).filter(Boolean)),
  );
  const pois = await findPoisByNames(configuredLocationPool);
  const publishedLocations = new Set(pois.map((poi) => poi.name));
  const locationPool = configuredLocationPool.filter((location) =>
    publishedLocations.has(location),
  );
  if (!sourceLocation || !publishedLocations.has(sourceLocation)) return;

  const siblingPRs = await readVisiblePartnerRequestsByTypeAndTime(request.type, request.time);
  const perTimeWindowCapByLocation = new Map(pois.map((poi) => [poi.name, poi.perTimeWindowCap]));
  const activeCountsByLocation = new Map<string, number>();
  for (const sibling of siblingPRs) {
    if (!isPRActiveStatus(sibling.status) || !sibling.location) continue;
    const location = sibling.location.trim();
    if (!locationPool.includes(location)) continue;
    activeCountsByLocation.set(location, (activeCountsByLocation.get(location) ?? 0) + 1);
  }

  const targetLocation = findNextAvailableLocation(
    locationPool,
    sourceLocation,
    activeCountsByLocation,
    perTimeWindowCapByLocation,
  );
  if (!targetLocation) return;

  const existingAtTarget = siblingPRs.filter(
    (sibling) => sibling.location?.trim() === targetLocation,
  );
  const capAtTarget = perTimeWindowCapByLocation.get(targetLocation) ?? null;
  const activeAtTarget = existingAtTarget.filter((sibling) =>
    isPRActiveStatus(sibling.status),
  ).length;
  if (capAtTarget !== null && activeAtTarget >= capAtTarget) return;

  const created = await createPRFromStructured(
    {
      title: request.title ?? undefined,
      type: request.type,
      time: request.time,
      location: targetLocation,
      route: null,
      minPartners: request.minPartners,
      maxPartners: request.maxPartners,
      partners: [],
      budget: request.budget,
      preferences: request.preferences,
      notes: request.notes,
      meetingPoint: request.meetingPoint,
    },
    { authenticatedUserId: null, anonymousUserId: null, oauthOpenId: null },
    {
      creationAuthority: "SYSTEM",
      partnerBoundsMode: "automatic",
      publicationMode: "create-open",
      joinGateConfig: request.joinGateConfig,
      confirmationEnabled: request.confirmationEnabled,
      confirmationStartOffsetMinutes: request.confirmationStartOffsetMinutes,
      confirmationEndOffsetMinutes: request.confirmationEndOffsetMinutes,
      joinLockOffsetMinutes: request.joinLockOffsetMinutes,
    },
  );
  const createdRoot = await prRepo.findById(created.id);
  if (!createdRoot) {
    return throwHttpProblem({
      status: 500,
      detail: "Failed to reload expanded partner request",
    });
  }
  await reconcileAlternativeWaitlistNotificationsForCandidate(createdRoot);
}
