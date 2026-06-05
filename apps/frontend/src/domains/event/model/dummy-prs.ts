import type { PRRoute } from "@partner-up-dev/backend";
import type {
  AnchorEventDetailResponse,
  AnchorEventTimeWindow,
  AnchorEventTimeWindowPR,
} from "@/domains/event/model/types";
import {
  resolveTimeWindowDateKey,
  resolveTimeWindowStartTimestamp,
  type TimeWindow,
} from "@/domains/event/model/time-window-view";
import {
  buildCreateTimeWindowPlaceOptions,
  toAnchorEventSelectedPlace,
  type AnchorEventPlaceOption,
  type AnchorEventSelectedPlace,
  type AnchorEventPoiGeometry,
} from "@/domains/event/model/place-options";
import { buildRouteSummary } from "@/domains/route/model/route";

type CreateTimeWindow = AnchorEventDetailResponse["createTimeWindows"][number];
type PresetTag = AnchorEventDetailResponse["presetTags"][number];

export type AnchorEventDummyPR = {
  kind: "dummy";
  key: string;
  timeWindowKey: string;
  dateKey: string;
  timeWindow: TimeWindow;
  timeWindowStart: string | null;
  place: AnchorEventSelectedPlace;
  placeKey: string;
  displayLocationName: string;
  preferenceTags: string[];
  preferenceFingerprint: string | null;
};

export type AnchorEventRealPRBrowseItem = {
  kind: "real";
  timeWindowKey: string;
  dateKey: string;
  pr: AnchorEventTimeWindowPR;
  timeWindow: TimeWindow;
  timeWindowStart: string | null;
  placeKey: string | null;
  preferenceFingerprint: string | null;
};

export type AnchorEventDummyGenerationInput = {
  browseTimeWindows: readonly AnchorEventTimeWindow[];
  createTimeWindows: readonly CreateTimeWindow[];
  presetTags: readonly PresetTag[];
  poiByName: ReadonlyMap<string, AnchorEventPoiGeometry>;
  perDateLimit?: number;
  now?: Date;
};

const DEFAULT_PER_DATE_LIMIT = 3;

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

export const resolveAnchorEventPlaceKey = ({
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

const resolveOptionPlaceKey = (option: AnchorEventPlaceOption): string => {
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

export const normalizePreferenceFingerprint = (
  preferences: readonly string[],
): string | null => {
  const normalized = normalizePreferenceTags(preferences).sort((left, right) =>
    left.localeCompare(right, "zh-CN"),
  );
  return normalized.length > 0 ? normalized.join("|") : null;
};

const resolveRealPRFingerprint = (pr: AnchorEventTimeWindowPR): string =>
  [
    pr.time[0] ?? "_",
    pr.time[1] ?? "_",
    resolveAnchorEventPlaceKey({
      location: pr.location,
      route: pr.route,
    }) ?? "place:none",
    normalizePreferenceFingerprint(pr.preferences) ?? "preferences:none",
  ].join("::");

const resolveDummyFingerprint = (
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

const hasTimeWindowStartedAt = (timeWindow: TimeWindow, now: Date): boolean => {
  const startTimestamp = resolveTimeWindowStartTimestamp(timeWindow);
  return Number.isFinite(startTimestamp) && now.getTime() >= startTimestamp;
};

const buildPreferenceChoices = (tags: readonly PresetTag[]): string[][] => [
  [],
  ...normalizePreferenceTags(tags.map((tag) => tag.label)).map((label) => [
    label,
  ]),
];

const resolveOptionDisplayLocationName = (
  option: AnchorEventPlaceOption,
): string => {
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
  browseTimeWindows: readonly AnchorEventTimeWindow[],
): Map<string, AnchorEventRealPRBrowseItem[]> => {
  const itemsByDate = new Map<string, AnchorEventRealPRBrowseItem[]>();

  for (const entry of browseTimeWindows) {
    const dateKey = resolveTimeWindowDateKey(entry.timeWindow);
    if (!dateKey) {
      continue;
    }

    const bucket = itemsByDate.get(dateKey) ?? [];
    for (const pr of entry.prs) {
      bucket.push({
        kind: "real",
        timeWindowKey: entry.key,
        dateKey,
        pr,
        timeWindow: entry.timeWindow,
        timeWindowStart: entry.timeWindow[0] ?? null,
        placeKey: resolveAnchorEventPlaceKey({
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
        resolveTimeWindowStartTimestamp(left.timeWindow) -
          resolveTimeWindowStartTimestamp(right.timeWindow) ||
        left.pr.id - right.pr.id,
    );
  }

  return itemsByDate;
};

const scoreDummyDiversity = (
  dummy: Pick<
    AnchorEventDummyPR,
    "timeWindowStart" | "placeKey" | "preferenceFingerprint"
  >,
  realItems: readonly AnchorEventRealPRBrowseItem[],
): number => {
  let score = 0;
  const realStartKeys = new Set(realItems.map((item) => item.timeWindowStart));
  const realPlaceKeys = new Set(realItems.map((item) => item.placeKey));
  const realPreferenceKeys = new Set(
    realItems.map((item) => item.preferenceFingerprint),
  );

  if (!realStartKeys.has(dummy.timeWindowStart)) {
    score += 4;
  }
  if (!realPlaceKeys.has(dummy.placeKey)) {
    score += 2;
  }
  if (!realPreferenceKeys.has(dummy.preferenceFingerprint)) {
    score += 1;
  }
  return score;
};

export const buildAnchorEventDummyPRs = ({
  browseTimeWindows,
  createTimeWindows,
  presetTags,
  poiByName,
  perDateLimit = DEFAULT_PER_DATE_LIMIT,
  now = new Date(),
}: AnchorEventDummyGenerationInput): AnchorEventDummyPR[] => {
  const limit = Math.max(Math.floor(perDateLimit), 0);
  if (limit === 0) {
    return [];
  }

  const realItemsByDate = resolveRealItemsByDate(browseTimeWindows);
  const realFingerprints = new Set<string>();
  for (const timeWindow of browseTimeWindows) {
    for (const pr of timeWindow.prs) {
      realFingerprints.add(resolveRealPRFingerprint(pr));
    }
  }

  const preferenceChoices = buildPreferenceChoices(presetTags);
  const candidatesByDate = new Map<string, AnchorEventDummyPR[]>();

  for (const entry of createTimeWindows) {
    if (hasTimeWindowStartedAt(entry.timeWindow, now)) {
      continue;
    }

    const dateKey = resolveTimeWindowDateKey(entry.timeWindow);
    if (!dateKey) {
      continue;
    }

    const placeOptions = buildCreateTimeWindowPlaceOptions({
      placeSelector: entry.placeSelector,
      locationOptions: entry.locationOptions,
      routeOptions: entry.routeOptions,
      poiByName,
    }).filter((option) => !option.disabled);

    for (const option of placeOptions) {
      const place = toAnchorEventSelectedPlace(option);
      if (!place) {
        continue;
      }

      const placeKey = resolveOptionPlaceKey(option);
      for (const preferenceTags of preferenceChoices) {
        const fingerprint = resolveDummyFingerprint(
          entry.timeWindow,
          placeKey,
          preferenceTags,
        );
        if (realFingerprints.has(fingerprint)) {
          continue;
        }

        const preferenceFingerprint =
          normalizePreferenceFingerprint(preferenceTags);
        const dummy: AnchorEventDummyPR = {
          kind: "dummy",
          key: [
            "dummy",
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
        bucket.push(dummy);
        candidatesByDate.set(dateKey, bucket);
      }
    }
  }

  const selected: AnchorEventDummyPR[] = [];
  for (const [dateKey, candidates] of candidatesByDate) {
    const realItems = realItemsByDate.get(dateKey) ?? [];
    const remainingSlots = Math.max(limit - realItems.length, 0);
    if (remainingSlots === 0) {
      continue;
    }

    selected.push(
      ...candidates
        .sort((left, right) => {
          const leftScore = scoreDummyDiversity(left, realItems);
          const rightScore = scoreDummyDiversity(right, realItems);
          if (leftScore !== rightScore) {
            return rightScore - leftScore;
          }

          return (
            resolveTimeWindowStartTimestamp(left.timeWindow) -
              resolveTimeWindowStartTimestamp(right.timeWindow) ||
            left.displayLocationName.localeCompare(
              right.displayLocationName,
              "zh-CN",
            ) ||
            (left.preferenceFingerprint ?? "").localeCompare(
              right.preferenceFingerprint ?? "",
              "zh-CN",
            )
          );
        })
        .slice(0, remainingSlots),
    );
  }

  return selected.sort(
    (left, right) =>
      left.dateKey.localeCompare(right.dateKey) ||
      resolveTimeWindowStartTimestamp(left.timeWindow) -
        resolveTimeWindowStartTimestamp(right.timeWindow) ||
      left.displayLocationName.localeCompare(right.displayLocationName, "zh-CN"),
  );
};
