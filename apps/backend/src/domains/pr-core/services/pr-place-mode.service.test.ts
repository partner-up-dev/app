import assert from "node:assert/strict";
import { test } from "vitest";
import { partnerRequestFieldsSchema } from "../../../entities/partner-request";
import {
  buildPRRouteSummary,
  normalizePartnerRequestFieldsForPersistence,
  resolvePRPlaceDisplayName,
} from "./pr-place-mode.service";

const route = [
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.1, 113.2] as [number, number],
    name: "广州南站",
    full_address: null,
  },
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.2, 113.3] as [number, number],
    name: "天河体育中心",
    full_address: null,
  },
];

test("partnerRequestFieldsSchema accepts location mode and defaults route", () => {
  const parsed = partnerRequestFieldsSchema.parse({
    title: "羽毛球",
    type: "羽毛球",
    time: [null, null],
    location: "天河体育中心",
    minPartners: 2,
    maxPartners: null,
    partners: [],
    budget: null,
    preferences: [],
    notes: null,
  });

  assert.equal(parsed.route, null);
});

test("partnerRequestFieldsSchema accepts route mode with null location", () => {
  const parsed = partnerRequestFieldsSchema.parse({
    title: "通勤拼车",
    type: "通勤拼车",
    time: [null, null],
    location: null,
    route,
    minPartners: 2,
    maxPartners: null,
    partners: [],
    budget: null,
    preferences: [],
    notes: null,
  });

  assert.deepEqual(parsed.route, route);
});

test("partnerRequestFieldsSchema rejects location and route together", () => {
  const result = partnerRequestFieldsSchema.safeParse({
    title: "通勤拼车",
    type: "通勤拼车",
    time: [null, null],
    location: "天河体育中心",
    route,
    minPartners: 2,
    maxPartners: null,
    partners: [],
    budget: null,
    preferences: [],
    notes: null,
  });

  assert.equal(result.success, false);
});

test("partnerRequestFieldsSchema rejects route points without coordinates", () => {
  const result = partnerRequestFieldsSchema.safeParse({
    title: "通勤拼车",
    type: "通勤拼车",
    time: [null, null],
    location: null,
    route: [
      {
        wgs84: null,
        bd09: null,
        gcj02: null,
        name: "起点",
        full_address: null,
      },
      {
        wgs84: null,
        bd09: null,
        gcj02: [23.2, 113.3],
        name: "终点",
        full_address: null,
      },
    ],
    minPartners: 2,
    maxPartners: null,
    partners: [],
    budget: null,
    preferences: [],
    notes: null,
  });

  assert.equal(result.success, false);
});

test("buildPRRouteSummary truncates endpoint names within total limit", () => {
  const summary = buildPRRouteSummary([
    {
      wgs84: null,
      bd09: null,
      gcj02: [23.1, 113.2],
      name: "超长起点名字一二三四五",
      full_address: null,
    },
    {
      wgs84: null,
      bd09: null,
      gcj02: [23.2, 113.3],
      name: "超长终点名字六七八九十",
      full_address: null,
    },
  ]);

  assert.equal(summary?.length, 16);
  assert.equal(summary?.includes("~"), true);
  assert.equal(summary?.includes("…"), true);
});

test("resolvePRPlaceDisplayName prefers route summary over location", () => {
  assert.equal(
    resolvePRPlaceDisplayName({
      location: "天河体育中心",
      route,
    }),
    "广州南站~天河体育中心",
  );
});

test("normalizePartnerRequestFieldsForPersistence clears location for route mode", () => {
  const normalized = normalizePartnerRequestFieldsForPersistence({
    title: "通勤拼车",
    type: "通勤拼车",
    time: [null, null],
    location: null,
    route,
    minPartners: 2,
    maxPartners: null,
    partners: [],
    budget: null,
    preferences: [],
    notes: null,
  });

  assert.equal(normalized.location, null);
  assert.deepEqual(normalized.route, route);
});
