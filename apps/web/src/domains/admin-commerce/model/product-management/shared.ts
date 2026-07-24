export type NumberInput = number | string;

let draftIdSeed = 0;

export const createDraftId = (prefix: string): string => {
  draftIdSeed += 1;
  return `${prefix}-${draftIdSeed}`;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const parseIntegerField = (
  value: NumberInput,
  label: string,
  options: { min?: number; max?: number } = {},
): number => {
  const parsed = typeof value === "number" ? value : Number.parseInt(value.trim(), 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} 必须是整数`);
  }
  if (options.min !== undefined && parsed < options.min) {
    throw new Error(`${label} 不能小于 ${options.min}`);
  }
  if (options.max !== undefined && parsed > options.max) {
    throw new Error(`${label} 不能大于 ${options.max}`);
  }
  return parsed;
};

export const parseOptionalPositiveInteger = (value: string, label: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return parseIntegerField(trimmed, label, { min: 1 });
};

export const parseNullableNonnegativeInteger = (value: string, label: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return parseIntegerField(trimmed, label, { min: 0 });
};
