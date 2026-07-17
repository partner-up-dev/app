import { z } from "zod";

export const meetingPointConfigSchema = z.object({
  description: z.string().trim().nullable(),
  imageUrl: z.string().trim().nullable(),
});

export type MeetingPointConfig = z.infer<typeof meetingPointConfigSchema>;

export const meetingPointConfigMapSchema = z.record(meetingPointConfigSchema);
export type MeetingPointConfigMap = z.infer<typeof meetingPointConfigMapSchema>;

const normalizeNullableText = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeMeetingPointConfig = (rawConfig: unknown): MeetingPointConfig | null => {
  if (typeof rawConfig !== "object" || rawConfig === null) {
    return null;
  }

  const raw = rawConfig as Record<string, unknown>;
  const config: MeetingPointConfig = {
    description: normalizeNullableText(raw.description),
    imageUrl: normalizeNullableText(raw.imageUrl),
  };

  return config.description || config.imageUrl ? config : null;
};

export const normalizeMeetingPointConfigMap = (rawMap: unknown): MeetingPointConfigMap => {
  if (typeof rawMap !== "object" || rawMap === null || Array.isArray(rawMap)) {
    return {};
  }

  const result: MeetingPointConfigMap = {};
  for (const [key, value] of Object.entries(rawMap)) {
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      continue;
    }

    const normalizedValue = normalizeMeetingPointConfig(value);
    if (!normalizedValue) {
      continue;
    }

    result[normalizedKey] = normalizedValue;
  }

  return result;
};
