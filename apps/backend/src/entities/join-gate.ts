import { z } from "zod";

export const prJoinGateSourceSchema = z.enum([
  "PR",
  "ANCHOR_EVENT",
]);
export type PRJoinGateSource = z.infer<typeof prJoinGateSourceSchema>;

const prJoinGateBaseSchema = z.object({
  key: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  source: prJoinGateSourceSchema,
});

export const prJoinNoticeGateConfigSchema = prJoinGateBaseSchema.extend({
  kind: z.literal("JOIN_NOTICE"),
  body: z.string().trim().min(1).max(5000),
});
export type PRJoinNoticeGateConfig = z.infer<
  typeof prJoinNoticeGateConfigSchema
>;

export const prJoinGateConfigItemSchema = z.discriminatedUnion("kind", [
  prJoinNoticeGateConfigSchema,
]);
export type PRJoinGateConfigItem = z.infer<
  typeof prJoinGateConfigItemSchema
>;

export const prJoinGateConfigSchema = z.array(prJoinGateConfigItemSchema);
export type PRJoinGateConfig = z.infer<typeof prJoinGateConfigSchema>;

export const normalizePRJoinGateConfig = (
  rawConfig: unknown,
): PRJoinGateConfig => {
  const parsed = prJoinGateConfigSchema.safeParse(rawConfig);
  if (parsed.success) {
    return parsed.data;
  }
  if (!Array.isArray(rawConfig)) {
    return [];
  }
  return rawConfig.flatMap((item) => {
    const parsedItem = prJoinGateConfigItemSchema.safeParse(item);
    return parsedItem.success ? [parsedItem.data] : [];
  });
};
