import type { PRDiscoveryCandidate, PRDiscoveryCardGroup } from "../contracts";

const trimNullable = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
};

const normalizeCardKeySegment = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("zh-CN");

export const normalizePreferenceTags = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase("zh-CN");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
};

export const normalizePreferenceFingerprint = (values: readonly string[]): string | null => {
  const normalized = normalizePreferenceTags(values)
    .map((value) => value.toLocaleLowerCase("zh-CN"))
    .sort()
    .join("|");
  return normalized || null;
};

export const resolveTimeWindowStartTimestamp = (
  timeWindow: [string | null, string | null],
): number => {
  const value = timeWindow[0];
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
};

const buildTimeWindowKey = (timeWindow: [string | null, string | null]): string =>
  `${timeWindow[0] ?? "_"}::${timeWindow[1] ?? "_"}`;

export const buildPRDiscoveryCardKey = (candidate: PRDiscoveryCandidate): string | null => {
  const location = trimNullable(candidate.location);
  if (!location) return null;
  const preferenceFingerprint = normalizePreferenceFingerprint(candidate.preferences);
  return `${buildTimeWindowKey(candidate.time)}::${normalizeCardKeySegment(location)}::${
    preferenceFingerprint ? normalizeCardKeySegment(preferenceFingerprint) : "_"
  }`;
};

type WorkingCardGroup = {
  cardKey: string;
  timeWindow: [string | null, string | null];
  batchStartTimestamp: number;
  displayLocationName: string;
  preferenceFingerprint: string | null;
  preferenceTags: string[];
  candidates: PRDiscoveryCandidate[];
};

const compareCandidates = (left: PRDiscoveryCandidate, right: PRDiscoveryCandidate): number => {
  const leftTimestamp = new Date(left.createdAt).getTime();
  const rightTimestamp = new Date(right.createdAt).getTime();
  const safeLeft = Number.isFinite(leftTimestamp) ? leftTimestamp : Number.POSITIVE_INFINITY;
  const safeRight = Number.isFinite(rightTimestamp) ? rightTimestamp : Number.POSITIVE_INFINITY;
  return safeLeft - safeRight || left.prId - right.prId;
};

const materializeCard = (group: WorkingCardGroup): PRDiscoveryCardGroup | null => {
  const candidates = [...group.candidates].sort(compareCandidates);
  const representativeCandidate =
    candidates.find((candidate) => trimNullable(candidate.notes) !== null) ?? candidates[0];
  if (!representativeCandidate) return null;
  return {
    cardKey: group.cardKey,
    timeWindow: group.timeWindow,
    batchStartTimestamp: group.batchStartTimestamp,
    displayLocationName: group.displayLocationName,
    preferenceFingerprint: group.preferenceFingerprint,
    preferenceTags: group.preferenceTags,
    notes: trimNullable(representativeCandidate.notes),
    detailPrId: representativeCandidate.prId,
    representativeCandidate,
    candidateCount: candidates.length,
    candidates,
  };
};

export const groupPRDiscoveryCandidates = (
  candidates: readonly PRDiscoveryCandidate[],
): PRDiscoveryCardGroup[] => {
  const groups = new Map<string, WorkingCardGroup>();
  for (const candidate of candidates) {
    const location = trimNullable(candidate.location);
    const cardKey = buildPRDiscoveryCardKey(candidate);
    if (!location || !cardKey) continue;
    const existing = groups.get(cardKey);
    if (existing) {
      existing.candidates.push(candidate);
      continue;
    }
    const preferenceTags = normalizePreferenceTags(candidate.preferences);
    groups.set(cardKey, {
      cardKey,
      timeWindow: candidate.time,
      batchStartTimestamp: resolveTimeWindowStartTimestamp(candidate.time),
      displayLocationName: location,
      preferenceFingerprint: normalizePreferenceFingerprint(preferenceTags),
      preferenceTags,
      candidates: [candidate],
    });
  }
  return [...groups.values()]
    .map(materializeCard)
    .filter((card): card is PRDiscoveryCardGroup => card !== null)
    .sort(
      (left, right) =>
        left.batchStartTimestamp - right.batchStartTimestamp ||
        left.cardKey.localeCompare(right.cardKey),
    );
};
