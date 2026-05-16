import assert from "node:assert/strict";
import { test } from "vitest";
import type { PRRoute } from "../../../entities";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

const route: PRRoute = [
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.0674, 113.2698],
    name: "广州南站",
    full_address: null,
  },
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.1405, 113.327],
    name: "天河体育中心",
    full_address: null,
  },
];

test("resolveActivityStartReminderLocation uses route summary before fallback text", async () => {
  const { resolveActivityStartReminderLocation } = await import(
    "./activity-start-reminder-dispatch.service"
  );

  assert.equal(
    resolveActivityStartReminderLocation({
      location: null,
      route,
    }),
    "广州南站~天河体育中心",
  );
});

test("resolveActivityStartReminderLocation keeps location-mode copy", async () => {
  const { resolveActivityStartReminderLocation } = await import(
    "./activity-start-reminder-dispatch.service"
  );

  assert.equal(
    resolveActivityStartReminderLocation({
      location: " 天河体育中心 ",
      route: null,
    }),
    "天河体育中心",
  );
});

test("resolveActivityStartReminderLocation falls back when no place is present", async () => {
  const { resolveActivityStartReminderLocation } = await import(
    "./activity-start-reminder-dispatch.service"
  );

  assert.equal(
    resolveActivityStartReminderLocation({
      location: null,
      route: null,
    }),
    "地点待定",
  );
});
