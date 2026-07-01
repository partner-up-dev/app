export interface LocalDateTimeInputParts {
  date: string | null;
  time: string | null;
}

const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const pad2 = (value: number): string => String(value).padStart(2, "0");

export const instantToLocalDateTimeInputParts = (value: string | null): LocalDateTimeInputParts => {
  if (!value) return { date: null, time: null };

  if (ISO_DATE_ONLY_PATTERN.test(value)) {
    return { date: value, time: null };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: null, time: null };
  }

  return {
    date: [date.getFullYear(), pad2(date.getMonth() + 1), pad2(date.getDate())].join("-"),
    time: [pad2(date.getHours()), pad2(date.getMinutes())].join(":"),
  };
};

export const localDateTimeInputPartsToInstant = (
  dateValue: string | null,
  timeValue: string | null,
): string | null => {
  if (!dateValue || !ISO_DATE_ONLY_PATTERN.test(dateValue)) {
    return null;
  }

  const resolvedTime = timeValue ?? "00:00";
  const timeMatch = resolvedTime.match(TIME_PATTERN);
  if (!timeMatch) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = dateValue.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};
