import type { PRRoute } from "@partner-up-dev/backend";
import {
  type PRDiscoveryPlaceOption,
  type PRDiscoveryPlaceSelection,
  toPRDiscoverySelectedPlace,
} from "@/domains/pr/model/pr-discovery-place-options";
import {
  resolvePRDiscoveryTimeWindowDateKey,
  resolvePRDiscoveryTimeWindowStartTimestamp,
  type TimeWindow,
} from "@/domains/pr/model/pr-discovery-time-window";
import type { PRDiscoveryPersistedCandidate } from "@/domains/pr/model/pr-discovery-types";
import { buildRouteSummary } from "@/domains/route/model/route";

export type PRDiscoveryBrowseTimeWindow = {
  key: string;
  timeWindow: TimeWindow;
  candidates: readonly PRDiscoveryPersistedCandidate[];
};

export type PRDiscoveryCreateTimeWindow = {
  key: string;
  timeWindow: TimeWindow;
  placeOptions: readonly PRDiscoveryPlaceOption[];
};

export type PRDiscoveryPreferenceTag = { label: string };

type CreateTimeWindow = PRDiscoveryCreateTimeWindow;
type PresetTag = PRDiscoveryPreferenceTag;

export type PRDiscoveryCreationSuggestion = {
  kind: "creation-suggestion";
  key: string;
  timeWindowKey: string;
  dateKey: string;
  timeWindow: TimeWindow;
  timeWindowStart: string | null;
  place: PRDiscoveryPlaceSelection;
  placeKey: string;
  displayLocationName: string;
  preferenceTags: string[];
  preferenceFingerprint: string | null;
};

export type PRDiscoveryRealCandidateBrowseItem = {
  kind: "real";
  timeWindowKey: string;
  dateKey: string;
  pr: PRDiscoveryPersistedCandidate;
  timeWindow: TimeWindow;
  timeWindowStart: string | null;
  placeKey: string | null;
  preferenceFingerprint: string | null;
};

export type PRDiscoveryCreationSuggestionGenerationInput = {
  browseTimeWindows: readonly PRDiscoveryBrowseTimeWindow[];
  createTimeWindows: readonly CreateTimeWindow[];
  presetTags: readonly PresetTag[];
  maxSuggestionCount?: number;
  maxDateCount?: number;
  maxSuggestionsPerDate?: number;
  perDateOpportunityLimit?: number;
  now?: Date;
};

const DEFAULT_MAX_DUMMY_COUNT = 3;
const DEFAULT_MAX_DATE_COUNT = 2;
const DEFAULT_MAX_DUMMIES_PER_DATE = 2;
const DEFAULT_PER_DATE_OPPORTUNITY_LIMIT = 3;

const normalizeLabel = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const routeSignature = (route: PRRoute | null | undefined): string | null => {
  if (!route || route.length === 0) {
    return null;
  }

  return JSON.stringify(
    route.map((point) => ({
      name: point.name?.trim() ?? "",
      fullAddress: point.full_address?.trim() ?? "",
      gcj02: point.gcj02 ?? null,
      wgs84: point.wgs84 ?? null,
      bd09: point.bd09 ?? null,
    })),
  );
};

export const resolvePRDiscoveryPlaceKey = ({
  location,
  route,
}: {
  location: string | null | undefined;
  route: PRRoute | null | undefined;
}): string | null => {
  const normalizedLocation = normalizeLabel(location);
  if (normalizedLocation) {
    return `location:${normalizedLocation}`;
  }

  const signature = routeSignature(route);
  return signature ? `route:${signature}` : null;
};

const resolveOptionPlaceKey = (option: PRDiscoveryPlaceOption): string => {
  if (option.kind === "location") {
    return `location:${option.locationId}`;
  }

  return `route:${routeSignature(option.route) ?? option.routePoolEntryId}`;
};

const normalizePreferenceTags = (preferences: readonly string[]): string[] =>
  Array.from(
    new Set(
      preferences
        .map((preference) => preference.trim())
        .filter((preference) => preference.length > 0),
    ),
  );

export const normalizePreferenceFingerprint = (preferences: readonly string[]): string | null => {
  const normalized = normalizePreferenceTags(preferences).sort((left, right) =>
    left.localeCompare(right, "zh-CN"),
  );
  return normalized.length > 0 ? normalized.join("|") : null;
};

const resolveRealPRFingerprint = (pr: PRDiscoveryPersistedCandidate): string =>
  [
    pr.time[0] ?? "_",
    pr.time[1] ?? "_",
    resolvePRDiscoveryPlaceKey({
      location: pr.location,
      route: pr.route,
    }) ?? "place:none",
    normalizePreferenceFingerprint(pr.preferences) ?? "preferences:none",
  ].join("::");

const resolveSuggestionFingerprint = (
  timeWindow: TimeWindow,
  placeKey: string,
  preferences: readonly string[],
): string =>
  [
    timeWindow[0] ?? "_",
    timeWindow[1] ?? "_",
    placeKey,
    normalizePreferenceFingerprint(preferences) ?? "preferences:none",
  ].join("::");

const resolveTimePlaceKey = (timeWindow: TimeWindow, placeKey: string): string =>
  [timeWindow[0] ?? "_", timeWindow[1] ?? "_", placeKey].join("::");

const hasTimeWindowStartedAt = (timeWindow: TimeWindow, now: Date): boolean => {
  const startTimestamp = resolvePRDiscoveryTimeWindowStartTimestamp(timeWindow);
  return Number.isFinite(startTimestamp) && now.getTime() >= startTimestamp;
};

const buildPreferenceChoices = (tags: readonly PresetTag[]): string[][] => [
  [],
  ...normalizePreferenceTags(tags.map((tag) => tag.label)).map((label) => [label]),
];

const resolveOptionDisplayLocationName = (option: PRDiscoveryPlaceOption): string => {
  const label = normalizeLabel(option.label);
  if (label) {
    return label;
  }

  if (option.kind === "route") {
    return buildRouteSummary(option.route) ?? option.routePoolEntryId;
  }

  return option.locationId;
};

const resolveRealItemsByDate = (
  browseTimeWindows: readonly PRDiscoveryBrowseTimeWindow[],
): Map<string, PRDiscoveryRealCandidateBrowseItem[]> => {
  const itemsByDate = new Map<string, PRDiscoveryRealCandidateBrowseItem[]>();

  for (const entry of browseTimeWindows) {
    const dateKey = resolvePRDiscoveryTimeWindowDateKey(entry.timeWindow);
    if (!dateKey) {
      continue;
    }

    const bucket = itemsByDate.get(dateKey) ?? [];
    for (const pr of entry.candidates) {
      bucket.push({
        kind: "real",
        timeWindowKey: entry.key,
        dateKey,
        pr,
        timeWindow: entry.timeWindow,
        timeWindowStart: entry.timeWindow[0] ?? null,
        placeKey: resolvePRDiscoveryPlaceKey({
          location: pr.location,
          route: pr.route,
        }),
        preferenceFingerprint: normalizePreferenceFingerprint(pr.preferences),
      });
    }
    itemsByDate.set(dateKey, bucket);
  }

  for (const bucket of itemsByDate.values()) {
    bucket.sort(
      (left, right) =>
        resolvePRDiscoveryTimeWindowStartTimestamp(left.timeWindow) -
          resolvePRDiscoveryTimeWindowStartTimestamp(right.timeWindow) ||
        left.pr.prId - right.pr.prId,
    );
  }

  return itemsByDate;
};

const scoreSuggestionDiversity = (
  suggestion: Pick<
    PRDiscoveryCreationSuggestion,
    "timeWindowStart" | "placeKey" | "preferenceFingerprint"
  >,
  realItems: readonly PRDiscoveryRealCandidateBrowseItem[],
): number => {
  let score = 0;
  const realStartKeys = new Set(realItems.map((item) => item.timeWindowStart));
  const realPlaceKeys = new Set(realItems.map((item) => item.placeKey));
  const realPreferenceKeys = new Set(realItems.map((item) => item.preferenceFingerprint));

  if (!realStartKeys.has(suggestion.timeWindowStart)) {
    score += 4;
  }
  if (!realPlaceKeys.has(suggestion.placeKey)) {
    score += 2;
  }
  if (!realPreferenceKeys.has(suggestion.preferenceFingerprint)) {
    score += 1;
  }
  return score;
};

const sortSuggestions = (
  left: PRDiscoveryCreationSuggestion,
  right: PRDiscoveryCreationSuggestion,
): number =>
  resolvePRDiscoveryTimeWindowStartTimestamp(left.timeWindow) -
    resolvePRDiscoveryTimeWindowStartTimestamp(right.timeWindow) ||
  left.displayLocationName.localeCompare(right.displayLocationName, "zh-CN") ||
  (left.preferenceFingerprint ?? "").localeCompare(right.preferenceFingerprint ?? "", "zh-CN") ||
  left.key.localeCompare(right.key);

const resolveCandidateSortValue = (suggestion: PRDiscoveryCreationSuggestion): string =>
  [
    String(resolvePRDiscoveryTimeWindowStartTimestamp(suggestion.timeWindow)),
    suggestion.displayLocationName,
    suggestion.preferenceFingerprint ?? "",
    suggestion.key,
  ].join("::");

export const buildPRDiscoveryCreationSuggestions = ({
  browseTimeWindows,
  createTimeWindows,
  presetTags,
  maxSuggestionCount = DEFAULT_MAX_DUMMY_COUNT,
  maxDateCount = DEFAULT_MAX_DATE_COUNT,
  maxSuggestionsPerDate = DEFAULT_MAX_DUMMIES_PER_DATE,
  perDateOpportunityLimit = DEFAULT_PER_DATE_OPPORTUNITY_LIMIT,
  now = new Date(),
}: PRDiscoveryCreationSuggestionGenerationInput): PRDiscoveryCreationSuggestion[] => {
  const totalLimit = Math.max(Math.floor(maxSuggestionCount), 0);
  const dateLimit = Math.max(Math.floor(maxDateCount), 0);
  const perDateSuggestionLimit = Math.max(Math.floor(maxSuggestionsPerDate), 0);
  const perDateOpportunityCap = Math.max(Math.floor(perDateOpportunityLimit), 0);
  if (
    totalLimit === 0 ||
    dateLimit === 0 ||
    perDateSuggestionLimit === 0 ||
    perDateOpportunityCap === 0
  ) {
    return [];
  }

  const realItemsByDate = resolveRealItemsByDate(browseTimeWindows);
  const realFingerprints = new Set<string>();
  const realTimePlaceKeys = new Set<string>();
  for (const timeWindow of browseTimeWindows) {
    for (const pr of timeWindow.candidates) {
      realFingerprints.add(resolveRealPRFingerprint(pr));
      const placeKey = resolvePRDiscoveryPlaceKey({
        location: pr.location,
        route: pr.route,
      });
      if (placeKey) {
        realTimePlaceKeys.add(resolveTimePlaceKey(pr.time, placeKey));
      }
    }
  }

  const preferenceChoices = buildPreferenceChoices(presetTags);
  const candidatesByDate = new Map<string, PRDiscoveryCreationSuggestion[]>();

  for (const entry of createTimeWindows) {
    if (hasTimeWindowStartedAt(entry.timeWindow, now)) {
      continue;
    }

    const dateKey = resolvePRDiscoveryTimeWindowDateKey(entry.timeWindow);
    if (!dateKey) {
      continue;
    }

    const placeOptions = entry.placeOptions.filter((option) => !option.disabled);

    for (const option of placeOptions) {
      const place = toPRDiscoverySelectedPlace(option);
      if (!place) {
        continue;
      }

      const placeKey = resolveOptionPlaceKey(option);
      const timePlaceKey = resolveTimePlaceKey(entry.timeWindow, placeKey);
      if (realTimePlaceKeys.has(timePlaceKey)) {
        continue;
      }

      for (const preferenceTags of preferenceChoices) {
        const fingerprint = resolveSuggestionFingerprint(
          entry.timeWindow,
          placeKey,
          preferenceTags,
        );
        if (realFingerprints.has(fingerprint)) {
          continue;
        }

        const preferenceFingerprint = normalizePreferenceFingerprint(preferenceTags);
        const suggestion: PRDiscoveryCreationSuggestion = {
          kind: "creation-suggestion",
          key: [
            "creation-suggestion",
            entry.key,
            placeKey,
            preferenceFingerprint ?? "preferences:none",
          ].join("::"),
          timeWindowKey: entry.key,
          dateKey,
          timeWindow: entry.timeWindow,
          timeWindowStart: entry.timeWindow[0] ?? null,
          place,
          placeKey,
          displayLocationName: resolveOptionDisplayLocationName(option),
          preferenceTags,
          preferenceFingerprint,
        };

        const bucket = candidatesByDate.get(dateKey) ?? [];
        bucket.push(suggestion);
        candidatesByDate.set(dateKey, bucket);
      }
    }
  }

  const selected: PRDiscoveryCreationSuggestion[] = [];
  const selectedTimePlaceKeys = new Set<string>();
  const selectedStartKeys = new Set<string>();
  const selectedPlaceKeys = new Set<string>();
  const selectedPreferenceKeys = new Set<string | null>();
  const selectedCountByDate = new Map<string, number>();

  const availableDateKeys = [...candidatesByDate.entries()]
    .map(([dateKey, candidates]) => {
      const realItems = realItemsByDate.get(dateKey) ?? [];
      const remainingOpportunitySlots = Math.max(perDateOpportunityCap - realItems.length, 0);

      return {
        dateKey,
        candidates: candidates.sort(sortSuggestions),
        realItems,
        limit: Math.min(perDateSuggestionLimit, remainingOpportunitySlots),
      };
    })
    .filter((entry) => entry.limit > 0 && entry.candidates.length > 0)
    .sort(
      (left, right) =>
        resolvePRDiscoveryTimeWindowStartTimestamp(left.candidates[0]?.timeWindow ?? [null, null]) -
          resolvePRDiscoveryTimeWindowStartTimestamp(
            right.candidates[0]?.timeWindow ?? [null, null],
          ) || left.dateKey.localeCompare(right.dateKey),
    )
    .slice(0, dateLimit);

  const pickBestCandidate = (
    candidates: readonly PRDiscoveryCreationSuggestion[],
    realItems: readonly PRDiscoveryRealCandidateBrowseItem[],
  ): PRDiscoveryCreationSuggestion | null => {
    const eligible = candidates.filter((candidate) => {
      const timePlaceKey = resolveTimePlaceKey(candidate.timeWindow, candidate.placeKey);
      return (
        !selectedTimePlaceKeys.has(timePlaceKey) &&
        !selectedStartKeys.has(candidate.timeWindowStart ?? "")
      );
    });

    if (eligible.length === 0) {
      return null;
    }

    return (
      [...eligible].sort((left, right) => {
        const leftScore =
          scoreSuggestionDiversity(left, realItems) +
          (selectedPlaceKeys.has(left.placeKey) ? 0 : 2) +
          (selectedPreferenceKeys.has(left.preferenceFingerprint) ? 0 : 1) +
          (left.preferenceFingerprint ? 1 : 0);
        const rightScore =
          scoreSuggestionDiversity(right, realItems) +
          (selectedPlaceKeys.has(right.placeKey) ? 0 : 2) +
          (selectedPreferenceKeys.has(right.preferenceFingerprint) ? 0 : 1) +
          (right.preferenceFingerprint ? 1 : 0);

        if (leftScore !== rightScore) {
          return rightScore - leftScore;
        }

        return resolveCandidateSortValue(left).localeCompare(
          resolveCandidateSortValue(right),
          "zh-CN",
        );
      })[0] ?? null
    );
  };

  let madeProgress = true;
  while (selected.length < totalLimit && madeProgress) {
    madeProgress = false;

    for (const entry of availableDateKeys) {
      if (selected.length >= totalLimit) {
        break;
      }

      const selectedForDate = selectedCountByDate.get(entry.dateKey) ?? 0;
      if (selectedForDate >= entry.limit) {
        continue;
      }

      const candidate = pickBestCandidate(entry.candidates, entry.realItems);
      if (!candidate) {
        continue;
      }

      selected.push(candidate);
      selectedCountByDate.set(entry.dateKey, selectedForDate + 1);
      selectedTimePlaceKeys.add(resolveTimePlaceKey(candidate.timeWindow, candidate.placeKey));
      selectedStartKeys.add(candidate.timeWindowStart ?? "");
      selectedPlaceKeys.add(candidate.placeKey);
      selectedPreferenceKeys.add(candidate.preferenceFingerprint);
      madeProgress = true;
    }
  }

  return selected.sort(
    (left, right) => left.dateKey.localeCompare(right.dateKey) || sortSuggestions(left, right),
  );
};
