import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type {
  AnchorEventId,
  TimeWindowEntry,
} from "../../../entities/anchor-event";
import type { PartnerRequest } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { readVisiblePartnerRequestsByType } from "../../pr/services";
import { isJoinableStatus } from "../../pr/services";

const eventRepo = new AnchorEventRepository();
const partnerRepo = new PartnerRepository();

const trimNullable = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizePreferenceTag = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeFingerprintPart = (value: string): string | null => {
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeCardKeySegment = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const buildTimeWindowKey = (timeWindow: TimeWindowEntry): string => {
  const [start, end] = timeWindow;
  return `${start ?? "_"}::${end ?? "_"}`;
};

export const buildDemandCardKey = (
  timeWindow: TimeWindowEntry,
  displayLocationName: string,
  preferenceFingerprint: string | null,
): string => {
  const timeWindowSegment = buildTimeWindowKey(timeWindow);
  const locationSegment = normalizeCardKeySegment(displayLocationName);
  const preferenceSegment = preferenceFingerprint
    ? normalizeCardKeySegment(preferenceFingerprint)
    : "_";
  return `${timeWindowSegment}::${locationSegment}::${preferenceSegment}`;
};

export const normalizePreferenceFingerprint = (
  values: string[],
): string | null => {
  const normalized = values
    .map((value) => normalizeFingerprintPart(value))
    .filter((value): value is string => value !== null)
    .sort()
    .join("|");

  return normalized.length > 0 ? normalized : null;
};

export const resolvePreferenceTags = (values: string[]): string[] => {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const value of values) {
    const tag = normalizePreferenceTag(value);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }

  return tags;
};

export const resolveDemandCardBatchStartTimestamp = (
  timeWindow: TimeWindowEntry,
): number => {
  const [start] = timeWindow;
  if (!start) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = new Date(start).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

export type DemandCardCandidate = {
  prId: number;
  status: string;
  createdAt: string;
  notes: string | null;
};

export type DemandCardSummary = {
  cardKey: string;
  timeWindow: TimeWindowEntry;
  batchStartTimestamp: number;
  displayLocationName: string;
  preferenceFingerprint: string | null;
  preferenceTags: string[];
  notes: string | null;
  detailPrId: number | null;
  candidateCount: number;
};

type CandidateGroup = {
  cardKey: string;
  timeWindow: TimeWindowEntry;
  batchStartTimestamp: number;
  displayLocationName: string;
  preferenceFingerprint: string | null;
  preferenceTags: string[];
  candidates: DemandCardCandidate[];
};

const compareCandidates = (
  left: DemandCardCandidate,
  right: DemandCardCandidate,
): number => {
  const leftTime = new Date(left.createdAt).getTime();
  const rightTime = new Date(right.createdAt).getTime();
  const safeLeft = Number.isFinite(leftTime) ? leftTime : Number.POSITIVE_INFINITY;
  const safeRight = Number.isFinite(rightTime)
    ? rightTime
    : Number.POSITIVE_INFINITY;

  if (safeLeft !== safeRight) {
    return safeLeft - safeRight;
  }

  return left.prId - right.prId;
};

const compareCards = (left: DemandCardSummary, right: DemandCardSummary): number => {
  if (left.batchStartTimestamp !== right.batchStartTimestamp) {
    return left.batchStartTimestamp - right.batchStartTimestamp;
  }

  return left.cardKey.localeCompare(right.cardKey);
};

const toDemandCardCandidate = (record: PartnerRequest): DemandCardCandidate => ({
  prId: record.id,
  status: record.status,
  createdAt: record.createdAt.toISOString(),
  notes: trimNullable(record.notes),
});

const buildCandidateGroup = ({
  timeWindow,
  displayLocationName,
  preferenceFingerprint,
  preferenceTags,
}: {
  timeWindow: TimeWindowEntry;
  displayLocationName: string;
  preferenceFingerprint: string | null;
  preferenceTags: string[];
}): CandidateGroup => ({
  cardKey: buildDemandCardKey(
    timeWindow,
    displayLocationName,
    preferenceFingerprint,
  ),
  timeWindow,
  batchStartTimestamp: resolveDemandCardBatchStartTimestamp(timeWindow),
  displayLocationName,
  preferenceFingerprint,
  preferenceTags,
  candidates: [],
});

const findActivePartnerPrIdsByUser = async (
  userId: UserId | null | undefined,
): Promise<Set<number>> => {
  if (!userId) {
    return new Set<number>();
  }

  const slots = await partnerRepo.findActiveByUserId(userId);
  return new Set(slots.map((slot) => slot.prId));
};

const groupJoinableCandidates = async (
  input: {
    eventId: AnchorEventId;
    viewerUserId?: UserId | null;
  },
): Promise<CandidateGroup[]> => {
  const event = await eventRepo.findById(input.eventId);

  if (!event) {
    return [];
  }

  const groupMap = new Map<string, CandidateGroup>();
  const [records, activePartnerPrIds] = await Promise.all([
    readVisiblePartnerRequestsByType(event.type),
    findActivePartnerPrIdsByUser(input.viewerUserId),
  ]);

  for (const record of records) {
    if (!isJoinableStatus(record.status)) {
      continue;
    }
    if (activePartnerPrIds.has(record.id)) {
      continue;
    }

    const displayLocationName = trimNullable(record.location);
    if (!displayLocationName) {
      continue;
    }

    const preferences = Array.isArray(record.preferences)
      ? record.preferences
      : [];
    const preferenceTags = resolvePreferenceTags(preferences);
    const preferenceFingerprint = normalizePreferenceFingerprint(preferenceTags);
    const cardKey = buildDemandCardKey(
      record.time,
      displayLocationName,
      preferenceFingerprint,
    );

    const existing =
      groupMap.get(cardKey) ??
      buildCandidateGroup({
        timeWindow: record.time,
        displayLocationName,
        preferenceFingerprint,
        preferenceTags,
      });

    existing.candidates.push(toDemandCardCandidate(record));
    groupMap.set(cardKey, existing);
  }

  return Array.from(groupMap.values());
};

const materializeDemandCardSummary = (
  group: CandidateGroup,
): DemandCardSummary | null => {
  const sortedCandidates = [...group.candidates].sort(compareCandidates);
  if (sortedCandidates.length === 0) {
    return null;
  }

  const representativeCandidate =
    sortedCandidates.find((candidate) => candidate.notes !== null) ??
    sortedCandidates[0] ??
    null;

  return {
    cardKey: group.cardKey,
    timeWindow: group.timeWindow,
    batchStartTimestamp: group.batchStartTimestamp,
    displayLocationName: group.displayLocationName,
    preferenceFingerprint: group.preferenceFingerprint,
    preferenceTags: group.preferenceTags,
    notes: representativeCandidate?.notes ?? null,
    detailPrId: representativeCandidate?.prId ?? null,
    candidateCount: sortedCandidates.length,
  };
};

export const listDemandCards = async ({
  eventId,
  viewerUserId,
}: {
  eventId: AnchorEventId;
  viewerUserId?: UserId | null;
}): Promise<DemandCardSummary[]> => {
  const groups = await groupJoinableCandidates({ eventId, viewerUserId });
  return groups
    .map(materializeDemandCardSummary)
    .filter((card): card is DemandCardSummary => card !== null)
    .sort(compareCards);
};

export const listJoinableDemandCardCandidates = async ({
  eventId,
  cardKey,
  viewerUserId,
}: {
  eventId: AnchorEventId;
  cardKey: string;
  viewerUserId?: UserId | null;
}): Promise<DemandCardCandidate[]> => {
  const groups = await groupJoinableCandidates({ eventId, viewerUserId });
  const matched = groups.find((group) => group.cardKey === cardKey);
  if (!matched) {
    return [];
  }

  return [...matched.candidates].sort(compareCandidates);
};
