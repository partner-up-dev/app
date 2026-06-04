import assert from "node:assert/strict";
import { test } from "vitest";
import {
  anchorEventPrTimeWindowEditorDefaultModeSchema,
  anchorEventRoutePoolSchema,
  normalizeAnchorEventRoutePool,
} from "./anchor-event";
import type { PRRoute } from "./partner-request";

const route: PRRoute = [
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.0674, 113.2698],
    name: "广州南站",
    full_address: "广州市番禺区石壁街道",
  },
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.1405, 113.327],
    name: "天河体育中心",
    full_address: null,
  },
];

test("anchorEventRoutePoolSchema accepts stable ids with PR route payloads", () => {
  const parsed = anchorEventRoutePoolSchema.parse([
    {
      id: " route-a ",
      route,
    },
  ]);

  assert.equal(parsed[0]?.id, "route-a");
  assert.deepEqual(parsed[0]?.route, route);
});

test("anchorEventRoutePoolSchema rejects duplicate ids and invalid route payloads", () => {
  assert.equal(
    anchorEventRoutePoolSchema.safeParse([
      { id: "route-a", route },
      { id: "route-a", route },
    ]).success,
    false,
  );
  assert.equal(
    anchorEventRoutePoolSchema.safeParse([
      {
        id: "route-a",
        route: [route[0]],
      },
    ]).success,
    false,
  );
});

test("normalizeAnchorEventRoutePool keeps valid unique entries", () => {
  const normalized = normalizeAnchorEventRoutePool([
    { id: "route-a", route },
    { id: "route-a", route },
    { id: "", route },
    { id: "route-b", route: [route[0]] },
  ]);

  assert.deepEqual(normalized, [{ id: "route-a", route }]);
});

test("anchorEventPrTimeWindowEditorDefaultModeSchema accepts only supported editor modes", () => {
  assert.equal(
    anchorEventPrTimeWindowEditorDefaultModeSchema.parse("NORMAL"),
    "NORMAL",
  );
  assert.equal(
    anchorEventPrTimeWindowEditorDefaultModeSchema.parse("FUZZY"),
    "FUZZY",
  );
  assert.equal(
    anchorEventPrTimeWindowEditorDefaultModeSchema.parse("ADVANCED"),
    "ADVANCED",
  );
  assert.equal(
    anchorEventPrTimeWindowEditorDefaultModeSchema.safeParse("CARD").success,
    false,
  );
});
