export type ProductLocalDateKey = string;

const ISO_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PRODUCT_TIME_ZONE = "Asia/Shanghai";

const productLocalDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PRODUCT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const productLocalMonthFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: PRODUCT_TIME_ZONE,
  year: "numeric",
  month: "long",
});

const productLocalShortDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: PRODUCT_TIME_ZONE,
  month: "numeric",
  day: "numeric",
});

const pad2 = (value: number): string => String(value).padStart(2, "0");

const buildDateKeyFromParts = (date: Date): ProductLocalDateKey =>
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;

export const isProductLocalDateKey = (
  value: unknown,
): value is ProductLocalDateKey =>
  typeof value === "string" && ISO_DATE_KEY_PATTERN.test(value.trim());

export const parseProductLocalDateKey = (
  value: ProductLocalDateKey,
): Date | null => {
  if (!isProductLocalDateKey(value)) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
};

export const getTodayProductLocalDateKey = (
  now: Date = new Date(),
): ProductLocalDateKey => {
  let year = "";
  let month = "";
  let day = "";

  for (const part of productLocalDateFormatter.formatToParts(now)) {
    if (part.type === "year") year = part.value;
    if (part.type === "month") month = part.value;
    if (part.type === "day") day = part.value;
  }

  return `${year}-${month}-${day}`;
};

export const addDaysToProductLocalDateKey = (
  value: ProductLocalDateKey,
  days: number,
): ProductLocalDateKey | null => {
  const parsed = parseProductLocalDateKey(value);
  if (!parsed) {
    return null;
  }

  parsed.setUTCDate(parsed.getUTCDate() + days);
  return buildDateKeyFromParts(parsed);
};

export const getProductLocalWeekStartDateKey = (
  value: ProductLocalDateKey,
): ProductLocalDateKey | null => {
  const parsed = parseProductLocalDateKey(value);
  if (!parsed) {
    return null;
  }

  const weekdayOffset = (parsed.getUTCDay() + 6) % 7;
  parsed.setUTCDate(parsed.getUTCDate() - weekdayOffset);
  return buildDateKeyFromParts(parsed);
};

export const listProductLocalDateKeysFrom = (
  start: ProductLocalDateKey,
  count: number,
): ProductLocalDateKey[] => {
  const values: ProductLocalDateKey[] = [];
  for (let index = 0; index < count; index += 1) {
    const next = addDaysToProductLocalDateKey(start, index);
    if (next) {
      values.push(next);
    }
  }
  return values;
};

export const normalizeProductLocalDateKeys = (
  values: readonly string[],
): ProductLocalDateKey[] =>
  Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value): value is ProductLocalDateKey =>
          isProductLocalDateKey(value),
        ),
    ),
  ).sort((left, right) => left.localeCompare(right));

export const formatProductLocalMonthLabel = (
  value: ProductLocalDateKey,
): string => {
  const parsed = parseProductLocalDateKey(value);
  return parsed ? productLocalMonthFormatter.format(parsed) : value;
};

export const formatProductLocalShortDateLabel = (
  value: ProductLocalDateKey,
): string => {
  const parsed = parseProductLocalDateKey(value);
  return parsed ? productLocalShortDateFormatter.format(parsed) : value;
};
