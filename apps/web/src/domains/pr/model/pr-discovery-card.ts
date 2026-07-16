import type { PRDiscoveryCreationSuggestion } from "@/domains/pr/model/pr-discovery-creation-suggestion";
import type { PRDiscoveryPlaceSelection } from "@/domains/pr/model/pr-discovery-place-options";
import {
  resolvePRDiscoveryTimeWindowStartTimestamp,
  type TimeWindow,
} from "@/domains/pr/model/pr-discovery-time-window";
import type {
  PRDiscoveryCardGroup,
  PRDiscoveryPersistedCandidate,
} from "@/domains/pr/model/pr-discovery-types";
import {
  addDaysToProductLocalDateKey,
  getTodayProductLocalDateKey,
  isProductLocalDateKey,
  type ProductLocalDateKey,
  parseProductLocalDateKey,
} from "@/shared/datetime/productLocalDate";

export type PRDiscoveryCardViewModel = {
  cardKey: string;
  timeWindow: TimeWindow;
  batchStartTimestamp: number;
  timeLabel: string;
  displayLocationName: string;
  preferenceFingerprint: string | null;
  preferenceTags: string[];
  notes: string | null;
  detailPrId: number | null;
  createTarget: PRDiscoveryCardCreateTarget | null;
  candidateCount: number;
  coverImage: string | null;
};

export type PRDiscoveryCardCreateTarget = {
  timeWindow: TimeWindow;
  place: PRDiscoveryPlaceSelection;
  preferences: string[];
};

type PoiGalleryResolver = (location: string | null) => string | null;
const PRODUCT_TIME_ZONE = "Asia/Shanghai";

const productLocalTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: PRODUCT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const productLocalWeekdayFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: PRODUCT_TIME_ZONE,
  weekday: "short",
});

const resolveRelativeDayLabel = (dateKey: ProductLocalDateKey): "今天" | "明天" | "后天" | null => {
  const todayDateKey = getTodayProductLocalDateKey();
  if (dateKey === todayDateKey) return "今天";
  const tomorrowDateKey = addDaysToProductLocalDateKey(todayDateKey, 1);
  if (tomorrowDateKey !== null && dateKey === tomorrowDateKey) return "明天";
  const dayAfterTomorrowDateKey = addDaysToProductLocalDateKey(todayDateKey, 2);
  return dayAfterTomorrowDateKey !== null && dateKey === dayAfterTomorrowDateKey ? "后天" : null;
};

const resolveTimeWindowStartDateKey = (timeWindow: TimeWindow): ProductLocalDateKey | null => {
  const normalized = timeWindow[0]?.trim() ?? "";
  if (!normalized) return null;
  if (isProductLocalDateKey(normalized)) return normalized;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : getTodayProductLocalDateKey(date);
};

const formatPRDiscoveryCardShortDateLabel = (dateKey: ProductLocalDateKey): string => {
  const parsed = parseProductLocalDateKey(dateKey);
  return parsed ? String(parsed.getUTCMonth() + 1) + "." + String(parsed.getUTCDate()) : dateKey;
};

const formatPRDiscoveryCardDateLabel = (dateKey: ProductLocalDateKey): string => {
  const shortDateLabel = formatPRDiscoveryCardShortDateLabel(dateKey);
  const relativeDayLabel = resolveRelativeDayLabel(dateKey);
  if (relativeDayLabel !== null) return relativeDayLabel + "(" + shortDateLabel + ")";
  const parsed = parseProductLocalDateKey(dateKey);
  return parsed ? shortDateLabel + productLocalWeekdayFormatter.format(parsed) : shortDateLabel;
};

const formatTimeWindowStartTime = (timeWindow: TimeWindow): string | null => {
  const normalized = timeWindow[0]?.trim() ?? "";
  if (!normalized || isProductLocalDateKey(normalized)) return null;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : productLocalTimeFormatter.format(date);
};

const formatCardTimeLabel = (timeWindow: TimeWindow): string => {
  const dateKey = resolveTimeWindowStartDateKey(timeWindow);
  const dateLabel = dateKey ? formatPRDiscoveryCardDateLabel(dateKey) : null;
  const timeLabel = formatTimeWindowStartTime(timeWindow);
  return dateLabel && timeLabel ? dateLabel + " " + timeLabel : (dateLabel ?? timeLabel ?? "");
};

const normalizePreferenceTags = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const tag = value.trim();
    const key = tag.toLocaleLowerCase("zh-CN");
    if (!tag || seen.has(key)) return [];
    seen.add(key);
    return [tag];
  });
};
const normalizePreferenceFingerprint = (values: readonly string[]): string | null => {
  const normalized = normalizePreferenceTags(values)
    .map((value) => value.toLocaleLowerCase("zh-CN"))
    .sort()
    .join("|");
  return normalized || null;
};
const parseCreatedAt = (candidate: PRDiscoveryPersistedCandidate): number => {
  const value = new Date(candidate.createdAt).getTime();
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
};
const compareCandidates = (
  left: PRDiscoveryPersistedCandidate,
  right: PRDiscoveryPersistedCandidate,
): number => parseCreatedAt(left) - parseCreatedAt(right) || left.prId - right.prId;

const representativeForGroup = (
  group: PRDiscoveryCardGroup,
): PRDiscoveryPersistedCandidate | null => {
  const locationCandidates = group.candidates.filter(
    (candidate) => (candidate.location?.trim() ?? "").length > 0,
  );
  const sorted = [...locationCandidates].sort(compareCandidates);
  return (
    sorted.find((candidate) => (candidate.notes?.trim() ?? "").length > 0) ?? sorted[0] ?? null
  );
};

export const toPRDiscoveryCardViewModels = (input: {
  groups: readonly PRDiscoveryCardGroup[];
  typeCoverImage: string | null;
  resolveCoverImage: PoiGalleryResolver;
}): PRDiscoveryCardViewModel[] =>
  input.groups.flatMap((group) => {
    const representative = representativeForGroup(group);
    if (!representative) return [];
    const displayLocationName = representative.location?.trim() ?? "";
    const preferenceTags = normalizePreferenceTags(representative.preferences);
    return [
      {
        cardKey: group.cardKey,
        timeWindow: representative.time,
        batchStartTimestamp: resolvePRDiscoveryTimeWindowStartTimestamp(representative.time),
        timeLabel: formatCardTimeLabel(representative.time),
        displayLocationName,
        preferenceFingerprint: normalizePreferenceFingerprint(preferenceTags),
        preferenceTags,
        notes: representative.notes?.trim() || null,
        detailPrId: representative.prId,
        createTarget: null,
        candidateCount: group.candidates.filter(
          (candidate) => (candidate.location?.trim() ?? "").length > 0,
        ).length,
        coverImage: input.resolveCoverImage(displayLocationName) ?? input.typeCoverImage ?? null,
      },
    ];
  });

export const toPRDiscoveryCreationCardViewModels = (input: {
  suggestions: readonly PRDiscoveryCreationSuggestion[];
  typeCoverImage: string | null;
  resolveCoverImage: PoiGalleryResolver;
}): PRDiscoveryCardViewModel[] =>
  input.suggestions.map((suggestion) => ({
    cardKey: suggestion.key,
    timeWindow: suggestion.timeWindow,
    batchStartTimestamp: resolvePRDiscoveryTimeWindowStartTimestamp(suggestion.timeWindow),
    timeLabel: formatCardTimeLabel(suggestion.timeWindow),
    displayLocationName: suggestion.displayLocationName,
    preferenceFingerprint: suggestion.preferenceFingerprint,
    preferenceTags: [...suggestion.preferenceTags],
    notes: null,
    detailPrId: null,
    createTarget: {
      timeWindow: suggestion.timeWindow,
      place: suggestion.place,
      preferences: [...suggestion.preferenceTags],
    },
    candidateCount: 0,
    coverImage:
      input.resolveCoverImage(suggestion.displayLocationName) ?? input.typeCoverImage ?? null,
  }));

export const sortPRDiscoveryCardViewModels = (
  cards: readonly PRDiscoveryCardViewModel[],
): PRDiscoveryCardViewModel[] =>
  [...cards].sort(
    (left, right) =>
      left.batchStartTimestamp - right.batchStartTimestamp ||
      left.displayLocationName.localeCompare(right.displayLocationName, "zh-CN") ||
      (left.preferenceFingerprint ?? "").localeCompare(
        right.preferenceFingerprint ?? "",
        "zh-CN",
      ) ||
      left.cardKey.localeCompare(right.cardKey),
  );

export const toPRDiscoveryCardItems = (input: {
  candidates?: readonly PRDiscoveryPersistedCandidate[];
  cardGroups?: readonly PRDiscoveryCardGroup[];
  suggestions?: readonly PRDiscoveryCreationSuggestion[];
  typeCoverImage?: string | null;
  resolveCoverImage?: PoiGalleryResolver;
}): PRDiscoveryCardViewModel[] => {
  const resolveCoverImage = input.resolveCoverImage ?? (() => null);
  const persisted = input.cardGroups?.length
    ? toPRDiscoveryCardViewModels({
        groups: input.cardGroups,
        typeCoverImage: input.typeCoverImage ?? null,
        resolveCoverImage,
      })
    : (input.candidates ?? []).flatMap((candidate) => {
        const displayLocationName = candidate.location?.trim() ?? "";
        if (!displayLocationName) return [];
        const preferenceTags = normalizePreferenceTags(candidate.preferences);
        return [
          {
            cardKey: "candidate:" + candidate.prId,
            timeWindow: candidate.time,
            batchStartTimestamp: resolvePRDiscoveryTimeWindowStartTimestamp(candidate.time),
            timeLabel: formatCardTimeLabel(candidate.time),
            displayLocationName,
            preferenceFingerprint: normalizePreferenceFingerprint(preferenceTags),
            preferenceTags,
            notes: candidate.notes?.trim() || null,
            detailPrId: candidate.prId,
            createTarget: null,
            candidateCount: 1,
            coverImage: resolveCoverImage(displayLocationName) ?? input.typeCoverImage ?? null,
          },
        ];
      });
  return sortPRDiscoveryCardViewModels([
    ...persisted,
    ...toPRDiscoveryCreationCardViewModels({
      suggestions: input.suggestions ?? [],
      typeCoverImage: input.typeCoverImage ?? null,
      resolveCoverImage,
    }),
  ]);
};

export const isPRDiscoveryCardCreation = (
  card: PRDiscoveryCardViewModel,
): card is PRDiscoveryCardViewModel & { createTarget: PRDiscoveryCardCreateTarget } =>
  card.createTarget !== null;
