import { z } from "zod";
import type { PartnerRequest } from "../../../entities/partner-request";

const prPlacementRuleContextDataSchema = z.object({
  kind: z.literal("PR"),
  prId: z.number().int().positive(),
  status: z.string().min(1),
  title: z.string().nullable(),
  type: z.string().min(1),
  time: z.object({
    startAt: z.string().nullable(),
    endAt: z.string().nullable(),
    hasStart: z.boolean(),
    hasEnd: z.boolean(),
    hasConcreteTime: z.boolean(),
  }),
  location: z.string().nullable(),
  hasLocation: z.boolean(),
  route: z.unknown().nullable(),
  routePointCount: z.number().int().nonnegative(),
  hasRoute: z.boolean(),
  minPartners: z.number().int().nonnegative().nullable(),
  maxPartners: z.number().int().nonnegative().nullable(),
  activeParticipantCount: z.number().int().nonnegative(),
  budget: z.string().nullable(),
  preferences: z.array(z.string()),
  notes: z.string().nullable(),
});

export type PrPlacementRuleContextData = z.infer<typeof prPlacementRuleContextDataSchema>;

export function buildPrPlacementRuleContextData(input: {
  pr: PartnerRequest;
  activeParticipantCount: number;
}): PrPlacementRuleContextData {
  const [startAt, endAt] = input.pr.time;
  const routePointCount = input.pr.route?.length ?? 0;

  return prPlacementRuleContextDataSchema.parse({
    kind: "PR",
    prId: input.pr.id,
    status: input.pr.status,
    title: input.pr.title,
    type: input.pr.type,
    time: {
      startAt,
      endAt,
      hasStart: startAt !== null,
      hasEnd: endAt !== null,
      hasConcreteTime: startAt !== null && endAt !== null,
    },
    location: input.pr.location,
    hasLocation: (input.pr.location?.trim() ?? "").length > 0,
    route: input.pr.route,
    routePointCount,
    hasRoute: routePointCount >= 2,
    minPartners: input.pr.minPartners,
    maxPartners: input.pr.maxPartners,
    activeParticipantCount: input.activeParticipantCount,
    budget: input.pr.budget,
    preferences: input.pr.preferences,
    notes: input.pr.notes,
  });
}
