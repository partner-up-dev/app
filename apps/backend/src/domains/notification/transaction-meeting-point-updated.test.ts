import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import type { JobTransactionWriter } from "../../infra/jobs/contracts";
import type { UserNotificationOptRepository } from "../../repositories/UserNotificationOptRepository";
import type { UserRepository } from "../../repositories/UserRepository";
import type { TransactionExecutor } from "../../repositories/_executor";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

const recipientUserId = "00000000-0000-4000-8000-000000000001";
const inactiveUserId = "00000000-0000-4000-8000-000000000002";
const updateId = "00000000-0000-4000-8000-000000000042";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test("transaction-bound meeting-point port filters source eligibility and uses only its writer", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-23T02:30:00.000Z"));
  const [
    { UserRepository: UserRepositoryClass },
    { UserNotificationOptRepository: UserNotificationOptRepositoryClass },
    { createMeetingPointUpdatedNotificationPortWithWriter },
  ] = await Promise.all([
    import("../../repositories/UserRepository"),
    import("../../repositories/UserNotificationOptRepository"),
    import("./transaction"),
  ]);
  const userRepoFind = vi.spyOn(UserRepositoryClass.prototype, "findById");
  userRepoFind.mockImplementation(async (userId) => {
    if (userId === inactiveUserId) {
      return {
        id: inactiveUserId,
        status: "DISABLED",
        openId: "inactive-open-id",
      } as Awaited<ReturnType<UserRepository["findById"]>>;
    }
    return {
      id: recipientUserId,
      status: "ACTIVE",
      openId: "meeting-point-open-id",
    } as Awaited<ReturnType<UserRepository["findById"]>>;
  });
  vi.spyOn(
    UserNotificationOptRepositoryClass.prototype,
    "findByUserIdInTransaction",
  ).mockResolvedValue(
    {} as Awaited<ReturnType<UserNotificationOptRepository["findByUserIdInTransaction"]>>,
  );
  vi.spyOn(UserNotificationOptRepositoryClass.prototype, "getSubscriptionSnapshot").mockReturnValue(
    {
      enabled: true,
      optInAt: new Date("2026-07-23T02:00:00.000Z"),
      remainingCount: 1,
    },
  );

  const writes: Array<
    Parameters<Pick<JobTransactionWriter, "scheduleOncePerCause">["scheduleOncePerCause"]>[0]
  > = [];
  const writer: Pick<JobTransactionWriter, "scheduleOncePerCause"> = {
    scheduleOncePerCause: async (input) => {
      writes.push(input);
      return { inserted: true, deduped: false, jobId: 12 };
    },
  };
  const port = createMeetingPointUpdatedNotificationPortWithWriter({
    writer,
    executor: {} as TransactionExecutor,
  });

  assert.deepEqual(
    await port.requestForSourceRecipients({
      prId: 42,
      meetingPointUpdateId: updateId,
      meetingPointDescription: "白云山南门集合",
      updatedAtIso: "2026-07-23T02:30:00.000Z",
      correlationId: "meeting-point:pr-content:00000000-0000-4000-8000-000000000042",
      activeRecipientCandidateUserIds: [recipientUserId, recipientUserId, inactiveUserId],
    }),
    { recipientUserIds: [recipientUserId] },
  );

  assert.deepEqual(writes, [
    {
      jobType: "notification.send.v1",
      jobVersion: 1,
      runAt: new Date("2026-07-23T02:30:00.000Z"),
      resolutionMs: 1_000,
      earlyToleranceUnits: 0,
      lateToleranceUnits: -1,
      creationKey:
        "notification:pr.meeting-point-updated:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42:00000000-0000-4000-8000-000000000042",
      payload: {
        schemaVersion: 1,
        template: "pr.meeting-point-updated",
        recipientUserId,
        channel: "WECHAT_SUBSCRIPTION",
        payload: {
          prId: 42,
          meetingPointUpdateId: updateId,
          meetingPointDescription: "白云山南门集合",
          updatedAtIso: "2026-07-23T02:30:00.000Z",
        },
        aggregate: { type: "partner_request", id: "42" },
        causationId: "partner_request:42:meeting-point:00000000-0000-4000-8000-000000000042",
        correlationId: "meeting-point:pr-content:00000000-0000-4000-8000-000000000042",
      },
    },
  ]);
});
