import assert from "node:assert/strict";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { test, vi } from "vitest";
import {
  buildProblemDetailsPayload,
  ProblemDetailsError,
} from "../lib/problem-details";

const AUTHENTICATED_REQUIRED_CODE = "AUTHENTICATED_REQUIRED";

process.env.DATABASE_URL ??= "postgres://unit:unit@localhost:5432/unit";

vi.mock("../domains/poi", () => ({
  findPoisByIds: vi.fn(),
  findPoisByNames: vi.fn(),
  listMyPoiApplications: vi.fn(),
  submitPoiApplication: vi.fn(),
}));

vi.mock("../domains/anchor-event", () => ({
  listAnchorEvents: vi.fn(),
  getAnchorEventDetail: vi.fn(),
  getAnchorEventDemandCards: vi.fn(),
  assignAnchorEventLandingMode: vi.fn(),
  getAnchorEventFormModeData: vi.fn(),
  submitAnchorEventFormModePreferenceTags: vi.fn(),
  recommendAnchorEventFormModePRs: vi.fn(),
  createAnchorEventFormModeAutoPR: vi.fn(),
  materializeAnchorEventDummyPR: vi.fn(),
}));

vi.mock("../domains/anchor-event-route-application", () => ({
  listMyAnchorEventRouteApplications: vi.fn(),
  submitAnchorEventRouteApplication: vi.fn(),
}));

const { anchorEventRoute } = await import("./anchor-event.controller");
const { poiRoute } = await import("./poi.controller");

const app = new Hono()
  .onError((error, c) => {
    if (!(error instanceof ProblemDetailsError)) {
      throw error;
    }

    const { payload, contentLanguage } = buildProblemDetailsPayload(
      error,
      c.req.header("accept-language"),
    );

    return c.body(JSON.stringify(payload), error.status as ContentfulStatusCode, {
      "Content-Type": "application/problem+json; charset=utf-8",
      "Content-Language": contentLanguage,
    });
  })
  .route("/api/pois", poiRoute)
  .route("/api/events", anchorEventRoute);

const assertAuthenticatedRequired = async (response: Response): Promise<void> => {
  assert.equal(response.status, 401);
  const payload = (await response.json()) as { code?: string; status?: number };
  assert.equal(payload.status, 401);
  assert.equal(payload.code, AUTHENTICATED_REQUIRED_CODE);
};

test("POI application APIs return coded authenticated-required responses", async () => {
  await assertAuthenticatedRequired(
    await app.request("/api/pois/applications/mine"),
  );

  await assertAuthenticatedRequired(
    await app.request("/api/pois/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "新地点",
        imageUrl: "https://partner-up.test/poi.png",
      }),
    }),
  );
});

test("anchor-event route application APIs return coded authenticated-required responses", async () => {
  await assertAuthenticatedRequired(
    await app.request("/api/events/route-applications/mine"),
  );

  await assertAuthenticatedRequired(
    await app.request("/api/events/1/route-applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: [
          {
            name: "起点",
            full_address: "起点地址",
            wgs84: null,
            bd09: null,
            gcj02: [113.32, 23.12],
          },
          {
            name: "终点",
            full_address: "终点地址",
            wgs84: null,
            bd09: null,
            gcj02: [113.33, 23.13],
          },
        ],
      }),
    }),
  );
});
