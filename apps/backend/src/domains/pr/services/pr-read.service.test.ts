import { beforeEach, describe, expect, test, vi } from "vitest";
import type { PartnerRequest, PRStatus } from "../../../entities/partner-request";

const partnerRequestRows = vi.hoisted(() => ({
  byType: [] as PartnerRequest[],
  byTypeAndTime: [] as PartnerRequest[],
}));

vi.mock("../../../repositories/PartnerRequestRepository", () => ({
  PartnerRequestRepository: class {
    async findVisibleByType() {
      return partnerRequestRows.byType;
    }

    async findVisibleByTypeAndTime() {
      return partnerRequestRows.byTypeAndTime;
    }
  },
}));

vi.mock("../temporal-refresh", () => ({
  refreshTemporalStatus: async (request: PartnerRequest) => request,
}));

describe("PR read service visibility status", () => {
  beforeEach(() => {
    partnerRequestRows.byType = [];
    partnerRequestRows.byTypeAndTime = [];
  });

  test("treats draft as non-public and non-active", async () => {
    const { isPRActiveStatus, isPRPubliclyReadableStatus } = await import("./pr-read.service");

    expect(isPRPubliclyReadableStatus("DRAFT")).toBe(false);
    expect(isPRActiveStatus("DRAFT")).toBe(false);
    expect(isPRPubliclyReadableStatus("OPEN")).toBe(true);
    expect(isPRPubliclyReadableStatus("CLOSED")).toBe(true);
    expect(isPRActiveStatus("OPEN")).toBe(true);
    expect(isPRActiveStatus("READY")).toBe(true);
    expect(isPRActiveStatus("ACTIVE")).toBe(true);
    expect(isPRActiveStatus("CLOSED")).toBe(false);
    expect(isPRActiveStatus("EXPIRED")).toBe(false);
  });

  test("excludes draft rows from visible type reads after status sync", async () => {
    const { readVisiblePartnerRequestsByType } = await import("./pr-read.service");
    partnerRequestRows.byType = [
      partnerRequest({ id: 1, status: "DRAFT" }),
      partnerRequest({ id: 2, status: "OPEN" }),
      partnerRequest({ id: 3, status: "CLOSED" }),
    ];

    await expect(readVisiblePartnerRequestsByType("自习搭子")).resolves.toEqual([
      expect.objectContaining({ id: 2, status: "OPEN" }),
      expect.objectContaining({ id: 3, status: "CLOSED" }),
    ]);
  });

  test("excludes draft rows from visible type-and-time reads after status sync", async () => {
    const { readVisiblePartnerRequestsByTypeAndTime } = await import("./pr-read.service");
    partnerRequestRows.byTypeAndTime = [
      partnerRequest({ id: 1, status: "DRAFT" }),
      partnerRequest({ id: 2, status: "READY" }),
    ];

    await expect(
      readVisiblePartnerRequestsByTypeAndTime("自习搭子", [
        "2026-06-08T11:00:00.000Z",
        "2026-06-08T12:00:00.000Z",
      ]),
    ).resolves.toEqual([expect.objectContaining({ id: 2, status: "READY" })]);
  });
});

const partnerRequest = ({ id, status }: { id: number; status: PRStatus }): PartnerRequest =>
  ({
    id,
    status,
    type: "自习搭子",
    visibilityStatus: "VISIBLE",
    title: null,
    location: "云山水榭",
    route: null,
    preferences: [],
    notes: null,
    time: ["2026-06-08T11:00:00.000Z", "2026-06-08T12:00:00.000Z"],
    minPartners: 1,
    maxPartners: 4,
    createdAt: new Date("2026-06-07T00:00:00.000Z"),
  }) as unknown as PartnerRequest;
