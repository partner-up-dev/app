import { afterEach, describe, expect, test, vi } from "vitest";
import type { Poi } from "../../../entities/poi";
import { ProblemDetailsError } from "../../../lib/problem-details";
import { PoiRepository } from "../../../repositories/PoiRepository";
import { createAdminPoi } from "./create-admin-poi";

vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://unit:unit@localhost:5432/unit";
});

const persistedPoi = (overrides: Partial<Poi> = {}): Poi => ({
  id: 17,
  name: "Stable POI",
  fullAddress: "Stable address",
  status: "PUBLISHED",
  gallery: ["https://example.com/poi.png"],
  gcj02: [121.4, 31.2],
  wgs84: null,
  bd09: null,
  perTimeWindowCap: 4,
  availabilityRules: [],
  meetingPoint: {
    description: "North entrance",
    imageUrl: "https://example.com/meeting-point.png",
  },
  submittedByUserId: null,
  reviewedByUserId: null,
  reviewedAt: null,
  rejectReason: null,
  createdAt: new Date("2030-01-02T03:04:05.000Z"),
  updatedAt: new Date("2030-01-03T04:05:06.000Z"),
  ...overrides,
});

const input = {
  name: "Stable POI",
  fullAddress: "Stable address",
  gallery: ["https://example.com/poi.png"],
  gcj02: [121.4, 31.2] as [number, number],
  wgs84: null,
  bd09: null,
  perTimeWindowCap: 4,
  availabilityRules: [],
  meetingPoint: {
    description: "North entrance",
    imageUrl: "https://example.com/meeting-point.png",
  },
};

describe("createAdminPoi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("returns the stable snapshot with ISO dates", async () => {
    const create = vi
      .spyOn(PoiRepository.prototype, "createByName")
      .mockResolvedValue(persistedPoi());

    const result = await createAdminPoi(input);

    expect(create).toHaveBeenCalledWith(input.name, {
      fullAddress: input.fullAddress,
      gallery: input.gallery,
      gcj02: input.gcj02,
      wgs84: null,
      bd09: null,
      perTimeWindowCap: input.perTimeWindowCap,
      availabilityRules: [],
      meetingPoint: input.meetingPoint,
    });
    expect(result).toMatchObject({
      id: 17,
      name: "Stable POI",
      status: "PUBLISHED",
      createdAt: "2030-01-02T03:04:05.000Z",
      updatedAt: "2030-01-03T04:05:06.000Z",
    });
    expect(result).not.toHaveProperty("pinHash");
  });

  test("keeps the existing duplicate-name conflict", async () => {
    vi.spyOn(PoiRepository.prototype, "createByName").mockResolvedValue(null);

    await expect(createAdminPoi(input)).rejects.toMatchObject({
      status: 409,
      message: "POI already exists",
    } satisfies Partial<ProblemDetailsError>);
  });
});
