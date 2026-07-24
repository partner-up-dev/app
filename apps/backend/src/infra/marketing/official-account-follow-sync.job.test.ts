import { describe, expect, it, vi } from "vitest";
import type { JobHandlerContext } from "../jobs";
import type { WeChatOfficialAccountFollowerPage } from "../../services/WeChatOfficialAccountFollowerService";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://unit:unit@localhost:5432/unit";

const { createOfficialAccountFollowSyncJobDefinition } =
  await import("./official-account-follow-sync.job");

const followedAt = new Date("2031-01-01T00:00:00.000Z");
type FetchFollowerOpenIdPage = (
  nextOpenId: string | null,
) => Promise<WeChatOfficialAccountFollowerPage>;
type MarkOfficialAccountFollowersByOpenIds = (
  openIds: string[],
  followedAt: Date,
) => Promise<number>;
type ScheduleNextRun = () => Promise<void>;

const jobContext: JobHandlerContext = {
  jobId: 1,
  jobVersion: 1,
  attempts: 1,
  runAt: followedAt,
  windowStartCursor: null,
  source: "manual",
  leaseToken: "lease-token",
  isCreationReservationHeld: async () => false,
};

describe("official-account follow-sync Job", () => {
  it("uses a typed versioned definition and follows every provider page", async () => {
    const fetchFollowerOpenIdPage = vi
      .fn<FetchFollowerOpenIdPage>()
      .mockResolvedValueOnce({
        openIds: ["openid-1"],
        nextOpenId: "cursor-2",
        count: 1,
      })
      .mockResolvedValueOnce({
        openIds: ["openid-2"],
        nextOpenId: null,
        count: 1,
      });
    const markOfficialAccountFollowersByOpenIds = vi.fn<MarkOfficialAccountFollowersByOpenIds>(
      async () => 1,
    );
    const scheduleNextRun = vi.fn<ScheduleNextRun>(async () => undefined);
    const definition = createOfficialAccountFollowSyncJobDefinition({
      isConfigured: () => true,
      fetchFollowerOpenIdPage,
      markOfficialAccountFollowersByOpenIds,
      scheduleNextRun,
      now: () => followedAt,
    });

    expect(definition.jobType).toBe("wechat.official-account.follow-sync");
    expect(definition.version).toBe(1);
    expect(definition.payloadSchema.safeParse({}).success).toBe(true);
    expect(definition.payloadSchema.safeParse({ unexpected: true }).success).toBe(false);
    await expect(definition.execute({}, jobContext)).resolves.toEqual({
      disposition: "SUCCEEDED",
      reason: "FOLLOW_SYNC_COMPLETED",
    });
    expect(fetchFollowerOpenIdPage).toHaveBeenNthCalledWith(1, null);
    expect(fetchFollowerOpenIdPage).toHaveBeenNthCalledWith(2, "cursor-2");
    expect(markOfficialAccountFollowersByOpenIds).toHaveBeenNthCalledWith(
      1,
      ["openid-1"],
      followedAt,
    );
    expect(markOfficialAccountFollowersByOpenIds).toHaveBeenNthCalledWith(
      2,
      ["openid-2"],
      followedAt,
    );
    expect(scheduleNextRun).toHaveBeenCalledOnce();
  });

  it("keeps the periodic chain alive when provider configuration is absent", async () => {
    const fetchFollowerOpenIdPage = vi.fn<FetchFollowerOpenIdPage>();
    const markOfficialAccountFollowersByOpenIds = vi.fn<MarkOfficialAccountFollowersByOpenIds>();
    const scheduleNextRun = vi.fn<ScheduleNextRun>(async () => undefined);
    const definition = createOfficialAccountFollowSyncJobDefinition({
      isConfigured: () => false,
      fetchFollowerOpenIdPage,
      markOfficialAccountFollowersByOpenIds,
      scheduleNextRun,
      now: () => followedAt,
    });

    await expect(definition.execute({}, jobContext)).resolves.toEqual({
      disposition: "SUCCEEDED",
      reason: "FOLLOW_SYNC_NOT_CONFIGURED",
    });
    expect(fetchFollowerOpenIdPage).not.toHaveBeenCalled();
    expect(markOfficialAccountFollowersByOpenIds).not.toHaveBeenCalled();
    expect(scheduleNextRun).toHaveBeenCalledOnce();
  });

  it("returns a retryable result when a dependency fails", async () => {
    const definition = createOfficialAccountFollowSyncJobDefinition({
      isConfigured: () => true,
      fetchFollowerOpenIdPage: async () => {
        throw new Error("provider unavailable");
      },
      markOfficialAccountFollowersByOpenIds: async () => 0,
      scheduleNextRun: async () => undefined,
      now: () => followedAt,
    });

    await expect(definition.execute({}, jobContext)).resolves.toEqual({
      disposition: "RETRYABLE_FAILURE",
      reason: "FOLLOW_SYNC_DEPENDENCY_FAILURE",
    });
  });
});
