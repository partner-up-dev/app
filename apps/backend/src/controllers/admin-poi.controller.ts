import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { throwHttpProblem } from "../lib/problem-details";
import { meetingPointConfigSchema } from "../entities/meeting-point";
import { poiAvailabilityRulesSchema } from "../entities/poi";
import { adminAuthMiddleware, type AdminAuthEnv } from "../auth/admin-middleware";
import { PoiRepository } from "../repositories/PoiRepository";
import { findPoisByIds, findPoisByNames } from "../domains/poi";
import {
  captureEffectiveMeetingPointsForRequests,
  listRequestsAffectedByPoiMeetingPoint,
  scheduleMeetingPointNotificationsForChangedRequests,
} from "../domains/pr/services";
import { publishAdminPoiApplication, rejectAdminPoiApplication } from "../domains/poi";

const app = new Hono<AdminAuthEnv>();
const poiRepo = new PoiRepository();

const byIdsQuerySchema = z.object({
  ids: z.string().min(1),
});

const poiIdParamSchema = z.object({
  poiId: z.coerce.number().int().positive(),
});

const byNamesQuerySchema = z.object({
  names: z.string().min(1),
});

const upsertPoiSchema = z.object({
  name: z.string().trim().min(1),
  fullAddress: z.string().trim().nullable().optional(),
  gallery: z.array(z.string().trim().min(1)),
  gcj02: z.tuple([z.number(), z.number()]).nullable().optional(),
  wgs84: z.tuple([z.number(), z.number()]).nullable().optional(),
  bd09: z.tuple([z.number(), z.number()]).nullable().optional(),
  perTimeWindowCap: z.number().int().positive().nullable().optional(),
  availabilityRules: poiAvailabilityRulesSchema.optional(),
  meetingPoint: meetingPointConfigSchema.nullable().optional(),
});

const rejectPoiSchema = z.object({
  rejectReason: z.string().trim().max(280).nullable().optional(),
});

const uniqueRequestsById = <T extends { id: number }>(items: T[]): T[] => {
  const byId = new Map<number, T>();
  for (const item of items) {
    byId.set(item.id, item);
  }
  return Array.from(byId.values());
};

const toPoiResponse = (poi: Awaited<ReturnType<PoiRepository["listAll"]>>[number]) => ({
  id: poi.id,
  name: poi.name,
  fullAddress: poi.fullAddress,
  status: poi.status,
  gallery: poi.gallery,
  gcj02: poi.gcj02,
  wgs84: poi.wgs84,
  bd09: poi.bd09,
  perTimeWindowCap: poi.perTimeWindowCap,
  availabilityRules: poi.availabilityRules,
  meetingPoint: poi.meetingPoint,
  submittedByUserId: poi.submittedByUserId,
  reviewedByUserId: poi.reviewedByUserId,
  reviewedAt: poi.reviewedAt?.toISOString() ?? null,
  rejectReason: poi.rejectReason,
  createdAt: poi.createdAt.toISOString(),
  updatedAt: poi.updatedAt.toISOString(),
});

const normalizeCsvIds = (csv: string): string[] => {
  const set = new Set<string>();
  for (const raw of csv.split(",")) {
    const id = raw.trim();
    if (!id) continue;
    set.add(id);
  }
  return Array.from(set);
};

const normalizeCsvNumericIds = (csv: string): number[] =>
  normalizeCsvIds(csv)
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);

export const adminPoiRoute = app
  .use("*", adminAuthMiddleware)
  .get("/pois", async (c) => {
    const pois = await poiRepo.listAll();
    return c.json(pois.map(toPoiResponse));
  })
  .get("/pois/by-ids", zValidator("query", byIdsQuerySchema), async (c) => {
    const { ids } = c.req.valid("query");
    const normalizedIds = normalizeCsvNumericIds(ids);
    const pois = await findPoisByIds(normalizedIds, {
      includeUnpublished: true,
    });

    return c.json(pois.map(toPoiResponse));
  })
  .get("/pois/by-names", zValidator("query", byNamesQuerySchema), async (c) => {
    const { names } = c.req.valid("query");
    const normalizedNames = normalizeCsvIds(names);
    const pois = await findPoisByNames(normalizedNames, {
      includeUnpublished: true,
    });

    return c.json(pois.map(toPoiResponse));
  })
  .post("/pois", zValidator("json", upsertPoiSchema), async (c) => {
    const {
      name,
      fullAddress,
      gallery,
      gcj02,
      wgs84,
      bd09,
      perTimeWindowCap,
      availabilityRules,
      meetingPoint,
    } = c.req.valid("json");

    const poi = await poiRepo.createByName(name, {
      fullAddress: fullAddress ?? null,
      gallery,
      gcj02: gcj02 ?? null,
      wgs84: wgs84 ?? null,
      bd09: bd09 ?? null,
      perTimeWindowCap: perTimeWindowCap ?? null,
      availabilityRules: availabilityRules ?? [],
      meetingPoint: meetingPoint ?? null,
    });
    if (!poi) {
      return throwHttpProblem({ status: 409, detail: "POI already exists" });
    }

    return c.json(toPoiResponse(poi), 201);
  })
  .put(
    "/pois/:poiId",
    zValidator("param", poiIdParamSchema),
    zValidator("json", upsertPoiSchema),
    async (c) => {
      const { poiId } = c.req.valid("param");
      const {
        name,
        fullAddress,
        gallery,
        gcj02,
        wgs84,
        bd09,
        perTimeWindowCap,
        availabilityRules,
        meetingPoint,
      } = c.req.valid("json");
      const [existingPoi] = await findPoisByIds([poiId], {
        includeUnpublished: true,
      });
      const previousName = existingPoi?.name ?? name;
      const affectedRequests = uniqueRequestsById([
        ...(await listRequestsAffectedByPoiMeetingPoint(previousName)),
        ...(previousName === name ? [] : await listRequestsAffectedByPoiMeetingPoint(name)),
      ]);
      const previousMeetingPoints =
        await captureEffectiveMeetingPointsForRequests(affectedRequests);
      const updatedAt = new Date();

      const poi = await poiRepo.updateById(poiId, {
        name,
        fullAddress: fullAddress ?? null,
        gallery,
        gcj02: gcj02 ?? null,
        wgs84: wgs84 ?? null,
        bd09: bd09 ?? null,
        perTimeWindowCap: perTimeWindowCap ?? null,
        availabilityRules: availabilityRules ?? existingPoi?.availabilityRules ?? [],
        meetingPoint: meetingPoint ?? existingPoi?.meetingPoint ?? null,
      });
      if (!poi) {
        return throwHttpProblem({ status: 404, detail: "POI not found" });
      }
      await scheduleMeetingPointNotificationsForChangedRequests({
        previous: previousMeetingPoints,
        requests: affectedRequests,
        updatedAt,
      });
      return c.json(toPoiResponse(poi));
    },
  )
  .post("/pois/:poiId/publish", zValidator("param", poiIdParamSchema), async (c) => {
    const { poiId } = c.req.valid("param");
    const auth = c.get("auth");
    const result = await publishAdminPoiApplication({
      poiId,
      reviewedByUserId: auth.userId ?? null,
    });
    return c.json(result);
  })
  .post(
    "/pois/:poiId/reject",
    zValidator("param", poiIdParamSchema),
    zValidator("json", rejectPoiSchema),
    async (c) => {
      const { poiId } = c.req.valid("param");
      const { rejectReason } = c.req.valid("json");
      const auth = c.get("auth");
      const result = await rejectAdminPoiApplication({
        poiId,
        reviewedByUserId: auth.userId ?? null,
        rejectReason: rejectReason ?? null,
      });
      return c.json(result);
    },
  );
