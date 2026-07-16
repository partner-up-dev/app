const UTC_PLUS_8_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (value: number): string => value.toString().padStart(2, "0");

const toUtc8Shifted = (date: Date): Date => new Date(date.getTime() + UTC_PLUS_8_OFFSET_MS);

export const formatDateKeyUtc8 = (date: Date): string => {
  const shifted = toUtc8Shifted(date);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

const ensureDateKey = (dateKey: string): void => {
  if (!DATE_KEY_PATTERN.test(dateKey)) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
};

export const parseDateKeyStartUtc = (dateKey: string): Date => {
  ensureDateKey(dateKey);
  return new Date(`${dateKey}T00:00:00+08:00`);
};

export const addDaysUtc8 = (dateKey: string, days: number): string => {
  const start = parseDateKeyStartUtc(dateKey);
  return formatDateKeyUtc8(new Date(start.getTime() + days * DAY_MS));
};

export const getUtcRangeForDateKey = (dateKey: string): { startUtc: Date; endUtc: Date } => {
  const startUtc = parseDateKeyStartUtc(dateKey);
  const endUtc = parseDateKeyStartUtc(addDaysUtc8(dateKey, 1));
  return { startUtc, endUtc };
};

export const getYesterdayDateKeyUtc8 = (now: Date = new Date()): string =>
  formatDateKeyUtc8(new Date(now.getTime() - DAY_MS));

export const getRunAtForDateKey = (dateKey: string, hour = 0, minute = 5): Date => {
  const nextDateKey = addDaysUtc8(dateKey, 1);
  return new Date(`${nextDateKey}T${pad2(hour)}:${pad2(minute)}:00+08:00`);
};
