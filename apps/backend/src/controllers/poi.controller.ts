import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import type { UserId } from "../entities/user";
import {
  findPoisByIds,
  findPoisByNames,
  listMyPoiApplications,
  submitPoiApplication,
} from "../domains/poi";
import { throwAuthenticatedRequired } from "../domains/pr-core/services/creator-identity.service";

const app = new Hono<AuthEnv>();

const byIdsQuerySchema = z.object({
  ids: z.string().min(1),
});

const byNamesQuerySchema = z.object({
  names: z.string().min(1),
});

const poiApplicationSchema = z.object({
  title: z.string().trim().min(1).max(80),
  imageUrl: z.string().trim().url().max(2048),
});

const requireAuthenticatedUserId = (c: Context<AuthEnv>): UserId => {
  const auth = c.get("auth");
  if (!auth.roles.includes("authenticated") || !auth.userId) {
    return throwAuthenticatedRequired();
  }
  return auth.userId as UserId;
};

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

const toPublicPoiResponse = (poi: Awaited<ReturnType<typeof findPoisByNames>>[number]) => ({
  id: poi.id,
  name: poi.name,
  fullAddress: poi.fullAddress,
  gallery: poi.gallery,
  gcj02: poi.gcj02,
  wgs84: poi.wgs84,
  bd09: poi.bd09,
  perTimeWindowCap: poi.perTimeWindowCap,
  availabilityRules: poi.availabilityRules,
  meetingPoint: poi.meetingPoint,
});

export const poiRoute = app
  .use("*", authMiddleware)
  .get("/by-ids", zValidator("query", byIdsQuerySchema), async (c) => {
    const { ids } = c.req.valid("query");
    const normalizedIds = normalizeCsvNumericIds(ids);
    const pois = await findPoisByIds(normalizedIds);

    return c.json(pois.map(toPublicPoiResponse));
  })
  .get("/by-names", zValidator("query", byNamesQuerySchema), async (c) => {
    const { names } = c.req.valid("query");
    const normalizedNames = normalizeCsvIds(names);
    const pois = await findPoisByNames(normalizedNames);

    return c.json(pois.map(toPublicPoiResponse));
  })
  .post("/applications", zValidator("json", poiApplicationSchema), async (c) => {
    const userId = requireAuthenticatedUserId(c);
    const payload = c.req.valid("json");
    const application = await submitPoiApplication({
      title: payload.title,
      imageUrl: payload.imageUrl,
      submittedByUserId: userId,
    });
    return c.json(application, 201);
  })
  .get("/applications/mine", async (c) => {
    const userId = requireAuthenticatedUserId(c);
    const applications = await listMyPoiApplications(userId);
    return c.json(applications);
  });
