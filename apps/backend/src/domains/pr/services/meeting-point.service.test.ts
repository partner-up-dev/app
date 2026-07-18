import assert from "node:assert/strict";
import { test } from "vitest";
import type { PoiRepository } from "../../../repositories/PoiRepository";
import type { PRTypeConfigRepository } from "../../../repositories/PRTypeConfigRepository";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

test("resolveEffectiveMeetingPoint follows PR, type location, type, then POI fallback order", async () => {
  const { PRTypeConfigRepository: PRTypeConfigRepositoryClass } =
    await import("../../../repositories/PRTypeConfigRepository");
  const { PoiRepository: PoiRepositoryClass } = await import("../../../repositories/PoiRepository");

  const originalFindByType = PRTypeConfigRepositoryClass.prototype.findByType;
  const originalFindByName = PoiRepositoryClass.prototype.findByName;

  PRTypeConfigRepositoryClass.prototype.findByType = async () =>
    ({
      meetingPoint: {
        description: "类型默认入口",
        imageUrl: null,
      },
      locationMeetingPoints: {
        poiA: {
          description: "A 店门口",
          imageUrl: "https://example.com/a.png",
        },
      },
    }) as unknown as Awaited<ReturnType<PRTypeConfigRepository["findByType"]>>;
  PoiRepositoryClass.prototype.findByName = async () =>
    ({
      meetingPoint: {
        description: "POI 兜底入口",
        imageUrl: null,
      },
    }) as unknown as Awaited<ReturnType<PoiRepository["findByName"]>>;

  try {
    const { resolveEffectiveMeetingPoint } = await import("./meeting-point.service");

    assert.deepEqual(
      await resolveEffectiveMeetingPoint({
        type: "board-game",
        location: "poiA",
        meetingPoint: {
          description: "PR 单独入口",
          imageUrl: null,
        },
      }),
      {
        source: "PR",
        description: "PR 单独入口",
        imageUrl: null,
      },
    );

    assert.deepEqual(
      await resolveEffectiveMeetingPoint({
        type: "board-game",
        location: "poiA",
        meetingPoint: null,
      }),
      {
        source: "PR_TYPE_LOCATION",
        description: "A 店门口",
        imageUrl: "https://example.com/a.png",
      },
    );

    assert.deepEqual(
      await resolveEffectiveMeetingPoint({
        type: "board-game",
        location: "poiB",
        meetingPoint: null,
      }),
      {
        source: "PR_TYPE",
        description: "类型默认入口",
        imageUrl: null,
      },
    );

    PRTypeConfigRepositoryClass.prototype.findByType = async () => null;

    assert.deepEqual(
      await resolveEffectiveMeetingPoint({
        type: "board-game",
        location: "poiC",
        meetingPoint: null,
      }),
      {
        source: "POI",
        description: "POI 兜底入口",
        imageUrl: null,
      },
    );
  } finally {
    PRTypeConfigRepositoryClass.prototype.findByType = originalFindByType;
    PoiRepositoryClass.prototype.findByName = originalFindByName;
  }
});

test("resolveEffectiveMeetingPoint skips automatic fallbacks when location is null", async () => {
  const { PRTypeConfigRepository: PRTypeConfigRepositoryClass } =
    await import("../../../repositories/PRTypeConfigRepository");
  const { PoiRepository: PoiRepositoryClass } = await import("../../../repositories/PoiRepository");

  const originalFindByType = PRTypeConfigRepositoryClass.prototype.findByType;
  const originalFindByName = PoiRepositoryClass.prototype.findByName;

  PRTypeConfigRepositoryClass.prototype.findByType = async () =>
    ({
      meetingPoint: {
        description: "类型默认入口",
        imageUrl: null,
      },
      locationMeetingPoints: {
        poiA: {
          description: "A 店门口",
          imageUrl: null,
        },
      },
    }) as unknown as Awaited<ReturnType<PRTypeConfigRepository["findByType"]>>;
  PoiRepositoryClass.prototype.findByName = async () =>
    ({
      meetingPoint: {
        description: "POI 兜底入口",
        imageUrl: null,
      },
    }) as unknown as Awaited<ReturnType<PoiRepository["findByName"]>>;

  try {
    const { resolveEffectiveMeetingPoint } = await import("./meeting-point.service");

    assert.deepEqual(
      await resolveEffectiveMeetingPoint({
        type: "board-game",
        location: null,
        meetingPoint: {
          description: "PR 单独入口",
          imageUrl: null,
        },
      }),
      {
        source: "PR",
        description: "PR 单独入口",
        imageUrl: null,
      },
    );

    assert.equal(
      await resolveEffectiveMeetingPoint({
        type: "board-game",
        location: null,
        meetingPoint: null,
      }),
      null,
    );
  } finally {
    PRTypeConfigRepositoryClass.prototype.findByType = originalFindByType;
    PoiRepositoryClass.prototype.findByName = originalFindByName;
  }
});
