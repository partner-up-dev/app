import assert from "node:assert/strict";
import { test } from "vitest";
import type { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type { PoiRepository } from "../../../repositories/PoiRepository";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

test("resolveEffectiveMeetingPoint follows PR, event location, event, then POI fallback order", async () => {
  const { AnchorEventRepository: AnchorEventRepositoryClass } = await import(
    "../../../repositories/AnchorEventRepository"
  );
  const { PoiRepository: PoiRepositoryClass } = await import(
    "../../../repositories/PoiRepository"
  );

  const originalFindOneByType =
    AnchorEventRepositoryClass.prototype.findOneByType;
  const originalFindByName = PoiRepositoryClass.prototype.findByName;

  AnchorEventRepositoryClass.prototype.findOneByType = async () =>
    ({
      meetingPoint: {
        description: "活动默认入口",
        imageUrl: null,
      },
      locationMeetingPoints: {
        poiA: {
          description: "A 店门口",
          imageUrl: "https://example.com/a.png",
        },
      },
    }) as unknown as Awaited<
      ReturnType<AnchorEventRepository["findOneByType"]>
    >;
  PoiRepositoryClass.prototype.findByName = async () =>
    ({
      meetingPoint: {
        description: "POI 兜底入口",
        imageUrl: null,
      },
    }) as unknown as Awaited<ReturnType<PoiRepository["findByName"]>>;

  try {
    const { resolveEffectiveMeetingPoint } = await import(
      "./meeting-point.service"
    );

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
        source: "ANCHOR_EVENT_LOCATION",
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
        source: "ANCHOR_EVENT",
        description: "活动默认入口",
        imageUrl: null,
      },
    );

    AnchorEventRepositoryClass.prototype.findOneByType = async () => null;

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
    AnchorEventRepositoryClass.prototype.findOneByType = originalFindOneByType;
    PoiRepositoryClass.prototype.findByName = originalFindByName;
  }
});

test("resolveEffectiveMeetingPoint skips automatic fallbacks when location is null", async () => {
  const { AnchorEventRepository: AnchorEventRepositoryClass } = await import(
    "../../../repositories/AnchorEventRepository"
  );
  const { PoiRepository: PoiRepositoryClass } = await import(
    "../../../repositories/PoiRepository"
  );

  const originalFindOneByType =
    AnchorEventRepositoryClass.prototype.findOneByType;
  const originalFindByName = PoiRepositoryClass.prototype.findByName;

  AnchorEventRepositoryClass.prototype.findOneByType = async () =>
    ({
      meetingPoint: {
        description: "活动默认入口",
        imageUrl: null,
      },
      locationMeetingPoints: {
        poiA: {
          description: "A 店门口",
          imageUrl: null,
        },
      },
    }) as unknown as Awaited<
      ReturnType<AnchorEventRepository["findOneByType"]>
    >;
  PoiRepositoryClass.prototype.findByName = async () =>
    ({
      meetingPoint: {
        description: "POI 兜底入口",
        imageUrl: null,
      },
    }) as unknown as Awaited<ReturnType<PoiRepository["findByName"]>>;

  try {
    const { resolveEffectiveMeetingPoint } = await import(
      "./meeting-point.service"
    );

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
    AnchorEventRepositoryClass.prototype.findOneByType = originalFindOneByType;
    PoiRepositoryClass.prototype.findByName = originalFindByName;
  }
});
