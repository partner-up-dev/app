import { test } from "vitest";
import assert from "node:assert/strict";
import type { PublicPR } from "../read-models/public-pr-view.service";

const loadMetadataBuilder = async () => {
  process.env.DATABASE_URL ??= "postgres://user:password@localhost:5432/test";
  return (await import("./pr-share-metadata.service"))
    .buildPRCanonicalShareMetadata;
};

const buildPublicPR = ({
  confirmationEnabled = true,
  ...overrides
}: Partial<PublicPR> = {}): PublicPR => ({
  id: 182,
  type: "羽毛球",
  time: [null, null],
  location: "天河体育中心",
  route: null,
  status: "OPEN",
  visibilityStatus: "VISIBLE",
  confirmationStartOffsetMinutes: null,
  confirmationEndOffsetMinutes: null,
  joinLockOffsetMinutes: null,
  minPartners: null,
  maxPartners: null,
  budget: null,
  createdAt: new Date("2026-05-04T00:00:00.000Z"),
  preferences: [],
  notes: null,
  meetingPoint: null,
  joinGateConfig: [],
  feedbackQuestionnaireInstanceId: null,
  createdBy: null,
  xiaohongshuPoster: null,
  wechatThumbnail: null,
  partners: [],
  myPartnerId: null,
  myPendingPartnerId: null,
  isViewerWaitlisted: false,
  isViewerReleased: false,
  ...overrides,
  confirmationEnabled,
});

test("buildPRCanonicalShareMetadata uses explicit title first", async () => {
  const buildPRCanonicalShareMetadata = await loadMetadataBuilder();
  const metadata = buildPRCanonicalShareMetadata(
    buildPublicPR({
      title: "  周末羽毛球  ",
      location: "万胜围",
      type: "羽毛球",
    }),
  );

  assert.equal(metadata.title, "周末羽毛球");
});

test("buildPRCanonicalShareMetadata falls back to anchor event title before type and place", async () => {
  const buildPRCanonicalShareMetadata = await loadMetadataBuilder();
  const metadata = buildPRCanonicalShareMetadata(
    buildPublicPR({
      title: undefined,
      location: "  万胜围  ",
      type: "羽毛球",
    }),
    { anchorEventTitle: "城市羽毛球局" },
  );

  assert.equal(metadata.title, "城市羽毛球局");
});

test("buildPRCanonicalShareMetadata falls back to type before route and location", async () => {
  const buildPRCanonicalShareMetadata = await loadMetadataBuilder();
  const metadata = buildPRCanonicalShareMetadata(
    buildPublicPR({
      title: undefined,
      location: "万胜围",
      route: [
        {
          wgs84: null,
          bd09: null,
          gcj02: [23.1, 113.2],
          name: "广州南站",
          full_address: null,
        },
        {
          wgs84: null,
          bd09: null,
          gcj02: [23.2, 113.3],
          name: "天河体育中心",
          full_address: null,
        },
      ],
      type: "通勤拼车",
    }),
  );

  assert.equal(metadata.title, "通勤拼车");
});

test("buildPRCanonicalShareMetadata includes route in revision", async () => {
  const buildPRCanonicalShareMetadata = await loadMetadataBuilder();
  const base = buildPublicPR({
    title: undefined,
    location: null,
    type: "通勤拼车",
  });
  const left = buildPRCanonicalShareMetadata({
    ...base,
    route: [
      {
        wgs84: null,
        bd09: null,
        gcj02: [23.1, 113.2],
        name: "广州南站",
        full_address: null,
      },
      {
        wgs84: null,
        bd09: null,
        gcj02: [23.2, 113.3],
        name: "天河体育中心",
        full_address: null,
      },
    ],
  });
  const right = buildPRCanonicalShareMetadata({
    ...base,
    route: [
      {
        wgs84: null,
        bd09: null,
        gcj02: [23.1, 113.2],
        name: "广州南站",
        full_address: null,
      },
      {
        wgs84: null,
        bd09: null,
        gcj02: [23.3, 113.4],
        name: "琶洲会展中心",
        full_address: null,
      },
    ],
  });

  assert.notEqual(left.revision, right.revision);
});

test("buildPRCanonicalShareMetadata includes anchor event title in revision", async () => {
  const buildPRCanonicalShareMetadata = await loadMetadataBuilder();
  const base = buildPublicPR({
    title: undefined,
    location: "天河体育中心",
    type: "羽毛球",
  });
  const left = buildPRCanonicalShareMetadata(base, {
    anchorEventTitle: "城市羽毛球局",
  });
  const right = buildPRCanonicalShareMetadata(base, {
    anchorEventTitle: "周末羽毛球局",
  });

  assert.notEqual(left.revision, right.revision);
});

test("buildPRCanonicalShareMetadata falls back to route when type and location are empty", async () => {
  const buildPRCanonicalShareMetadata = await loadMetadataBuilder();
  const metadata = buildPRCanonicalShareMetadata(
    buildPublicPR({
      title: undefined,
      location: "  ",
      route: [
        {
          wgs84: null,
          bd09: null,
          gcj02: [23.1, 113.2],
          name: "广州南站",
          full_address: null,
        },
        {
          wgs84: null,
          bd09: null,
          gcj02: [23.2, 113.3],
          name: "天河体育中心",
          full_address: null,
        },
      ],
      type: "   ",
    }),
  );

  assert.equal(metadata.title, "广州南站~天河体育中心");
});

test("buildPRCanonicalShareMetadata falls back to location when type and route are empty", async () => {
  const buildPRCanonicalShareMetadata = await loadMetadataBuilder();
  const metadata = buildPRCanonicalShareMetadata(
    buildPublicPR({
      title: undefined,
      location: "  万胜围  ",
      route: null,
      type: "   ",
    }),
  );

  assert.equal(metadata.title, "万胜围");
});

test("buildPRCanonicalShareMetadata uses generic PR title as final fallback", async () => {
  const buildPRCanonicalShareMetadata = await loadMetadataBuilder();
  const metadata = buildPRCanonicalShareMetadata(
    buildPublicPR({
      title: undefined,
      location: null,
      type: "   ",
    }),
  );

  assert.equal(metadata.title, "搭子请求");
});
