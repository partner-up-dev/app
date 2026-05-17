import type { AnchorEventFormModeResponse } from "@/domains/event/model/types";

const PRODUCT_TIME_ZONE = "Asia/Shanghai";
const MINUTE_MS = 60 * 1000;
const FIVE_MINUTE_MS = 5 * MINUTE_MS;

const datePartFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: PRODUCT_TIME_ZONE,
  month: "numeric",
  day: "numeric",
});

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PRODUCT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timePartFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: PRODUCT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

type PresetTag = AnchorEventFormModeResponse["presetTags"][number];
type StartOption = AnchorEventFormModeResponse["startOptions"][number];

const normalizeTagLabel = (value: string): string => value.trim();

const parseFormModeDateTime = (value: string): Date | null => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isValidFormModeDateTime = (
  value: string | null | undefined,
): value is string =>
  typeof value === "string" && parseFormModeDateTime(value) !== null;

export const buildFormModeDateKey = (isoDateTime: string): string => {
  const date = parseFormModeDateTime(isoDateTime);
  return date === null ? "" : dateKeyFormatter.format(date);
};

export const formatFormModeDateLabel = (isoDateTime: string): string => {
  const date = parseFormModeDateTime(isoDateTime);
  return date === null ? "" : datePartFormatter.format(date);
};

export const formatFormModeTimeLabel = (isoDateTime: string): string => {
  const date = parseFormModeDateTime(isoDateTime);
  return date === null ? "" : timePartFormatter.format(date);
};

export const buildFormModeRouteDateKey = (isoDateTime: string): string =>
  buildFormModeDateKey(isoDateTime);

export const buildFormModeRouteTimeKey = (isoDateTime: string): string =>
  formatFormModeTimeLabel(isoDateTime);

export const buildFormModeStartAtFromRouteParts = (
  dateKey: string,
  timeKey: string,
): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }
  if (!/^\d{2}:\d{2}$/.test(timeKey)) {
    return null;
  }

  const [hourText, minuteText] = timeKey.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const date = new Date(`${dateKey}T${timeKey}:00+08:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const isoDateTime = date.toISOString();
  if (
    buildFormModeRouteDateKey(isoDateTime) !== dateKey ||
    buildFormModeRouteTimeKey(isoDateTime) !== timeKey
  ) {
    return null;
  }

  return isoDateTime;
};

export const formatFormModeDurationLabel = (
  durationMinutes: number | null,
): string => {
  if (durationMinutes === null || durationMinutes <= 0) {
    return "";
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `持续 ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `持续 ${hours}h`;
  }
  return `持续 ${minutes}m`;
};

const buildStableSeed = (seed: string): number =>
  Array.from(seed).reduce(
    (accumulator, character) => accumulator + character.charCodeAt(0),
    0,
  );

export const pickStableGalleryImage = (
  gallery: readonly string[],
  seed: string,
): string | null => {
  const normalizedGallery = gallery
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (normalizedGallery.length === 0) {
    return null;
  }

  const index = buildStableSeed(seed) % normalizedGallery.length;
  return normalizedGallery[index] ?? null;
};

export const derivePreferenceCategory = (label: string): string | null => {
  const normalized = normalizeTagLabel(label);
  if (!normalized.includes(":")) {
    return null;
  }

  const [category] = normalized.split(":", 1);
  const resolved = category?.trim() ?? "";
  return resolved.length > 0 ? resolved : null;
};

export const buildPreferenceTagGroups = (tags: readonly PresetTag[]) => {
  const categorized = new Map<
    string,
    Array<{
      id: number;
      label: string;
      description: string;
    }>
  >();
  const uncategorized: Array<{
    id: number;
    label: string;
    description: string;
  }> = [];

  for (const tag of tags) {
    const category = derivePreferenceCategory(tag.label);
    if (!category) {
      uncategorized.push(tag);
      continue;
    }

    const items = categorized.get(category) ?? [];
    items.push(tag);
    categorized.set(category, items);
  }

  return {
    categorized: Array.from(categorized.entries()).map(([category, items]) => ({
      category,
      tags: items,
    })),
    uncategorized,
    uncategorizedLabel:
      categorized.size === 0 && uncategorized.length > 0 ? "偏好" : "其它",
  };
};

const roundUpToFiveMinutes = (value: Date): Date => {
  const timestamp = value.getTime();
  const rounded = Math.ceil(timestamp / FIVE_MINUTE_MS) * FIVE_MINUTE_MS;
  return new Date(rounded);
};

export const buildAdvancedModeStartOptions = (
  earliestLeadMinutes: number | null,
  now: Date = new Date(),
): StartOption[] => {
  if (earliestLeadMinutes === null || earliestLeadMinutes <= 0) {
    return [];
  }

  const start = roundUpToFiveMinutes(now);
  const boundary = new Date(now.getTime() + earliestLeadMinutes * MINUTE_MS);
  const values: StartOption[] = [];

  for (
    let cursor = start.getTime();
    cursor <= boundary.getTime();
    cursor += FIVE_MINUTE_MS
  ) {
    const startAt = new Date(cursor).toISOString();
    values.push({
      key: `${startAt}::advanced`,
      startAt,
      endAt: startAt,
      description: null,
    });
  }

  return values;
};

export const buildStartOptionsByDate = (startOptions: readonly StartOption[]) => {
  const groups = new Map<string, StartOption[]>();

  for (const option of startOptions) {
    if (!isValidFormModeDateTime(option.startAt)) {
      continue;
    }
    const dateKey = buildFormModeDateKey(option.startAt);
    if (!dateKey) {
      continue;
    }
    const items = groups.get(dateKey) ?? [];
    items.push(option);
    groups.set(dateKey, items);
  }

  return Array.from(groups.entries())
    .map(([dateKey, options]) => ({
      dateKey,
      dateLabel: formatFormModeDateLabel(options[0]?.startAt ?? dateKey),
      options: [...options].sort((left, right) =>
        left.startAt.localeCompare(right.startAt),
      ),
    }))
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey));
};

export const shouldAutoOpenAdvancedFormModeTime = (
  startOptions: readonly StartOption[],
  earliestLeadMinutes: number | null,
  now: Date = new Date(),
): boolean =>
  buildStartOptionsByDate(startOptions).length === 0 &&
  buildAdvancedModeStartOptions(earliestLeadMinutes, now).length > 0;
