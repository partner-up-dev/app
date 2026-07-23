import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";
import type { NotificationRequest } from "../../domains/notification";
import {
  createPRMessageSummaryNotificationInvalidationAdapter,
  createPRMessageSummaryNotificationPortWithWriter,
  createWaitlistPromotionNotificationPortWithWriter,
} from "../../domains/notification/transaction";
import { requestPRMessageSummaryNotification } from "../../domains/notification/owner/notification-owner.service";
import { createNotificationUntilAcknowledgedSchedulerAdapter } from "../../domains/notification/transaction";
import type { JobTransactionWriter } from "../jobs/contracts";
import type { TransactionExecutor } from "../../repositories/_executor";
import type { UserNotificationOptRepository } from "../../repositories/UserNotificationOptRepository";
import type { UserRepository } from "../../repositories/UserRepository";
import { jobRunner } from "../jobs";
import { createNotificationOwnerRuntime } from "./notification-owner-runtime";

vi.mock("../../lib/env", () => ({
  env: {
    DATABASE_URL: "postgresql://unit-test:unit-test@localhost:5432/unit-test",
    DB_CONNECT_TIMEOUT_SECONDS: 1,
    FRONTEND_URL: undefined,
  },
}));

const request: NotificationRequest<"pr.waitlist-promoted"> = {
  template: "pr.waitlist-promoted",
  recipientUserId: "00000000-0000-4000-8000-000000000001",
  channel: "WECHAT_SUBSCRIPTION",
  payload: {
    prId: 42,
    partnerId: 7,
    waitlistCycleId: "00000000-0000-4000-8000-000000000007",
  },
  metadata: {
    aggregate: { type: "partner_request", id: "42" },
    causationId: "partner_request:42:waitlist-promotion:7:00000000-0000-4000-8000-000000000007",
  },
};

const expectedJobConfig = {
  jobType: "notification.send.v1",
  jobVersion: 1,
  runAt: new Date("2026-07-22T10:00:00.000Z"),
  resolutionMs: 1_000,
  earlyToleranceUnits: 0,
  lateToleranceUnits: -1,
  creationKey:
    "notification:pr.waitlist-promoted:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42:7:00000000-0000-4000-8000-000000000007",
  payload: {
    schemaVersion: 1,
    template: "pr.waitlist-promoted",
    recipientUserId: "00000000-0000-4000-8000-000000000001",
    channel: "WECHAT_SUBSCRIPTION",
    payload: {
      prId: 42,
      partnerId: 7,
      waitlistCycleId: "00000000-0000-4000-8000-000000000007",
    },
    aggregate: { type: "partner_request", id: "42" },
    causationId: "partner_request:42:waitlist-promotion:7:00000000-0000-4000-8000-000000000007",
  },
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Notification owner runtime scheduling", () => {
  it("keeps the ordinary request path on the shared generic Job mapping", async () => {
    const schedule = vi.spyOn(jobRunner, "scheduleOncePerCause").mockResolvedValue({
      inserted: true,
      deduped: false,
      jobId: 12,
    });
    const owner = createNotificationOwnerRuntime({
      now: () => new Date("2026-07-22T10:00:00.000Z"),
    });

    assert.deepEqual(await owner.request(request), { creation: "CREATED" });
    assert.deepEqual(schedule.mock.calls, [[expectedJobConfig]]);
  });

  it("uses only the supplied transaction writer for the named atomic port", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T10:00:00.000Z"));
    const globalSchedule = vi
      .spyOn(jobRunner, "scheduleOncePerCause")
      .mockRejectedValue(new Error("GLOBAL_JOB_RUNNER_MUST_NOT_BE_USED"));
    const writes: Array<
      Parameters<Pick<JobTransactionWriter, "scheduleOncePerCause">["scheduleOncePerCause"]>[0]
    > = [];
    const writer: Pick<JobTransactionWriter, "scheduleOncePerCause"> = {
      scheduleOncePerCause: async (input) => {
        writes.push(input);
        return { inserted: false, deduped: true, jobId: 12 };
      },
    };
    const port = createWaitlistPromotionNotificationPortWithWriter(writer);

    assert.deepEqual(await port.request(request), { creation: "COALESCED" });
    assert.deepEqual(writes, [expectedJobConfig]);
    assert.equal(globalSchedule.mock.calls.length, 0);
  });

  it("maps a message-summary window to the supplied transaction writer only", async () => {
    const globalSchedule = vi
      .spyOn(jobRunner, "scheduleUntilAcknowledged")
      .mockRejectedValue(new Error("GLOBAL_JOB_RUNNER_MUST_NOT_BE_USED"));
    const writes: Array<
      Parameters<
        Pick<JobTransactionWriter, "scheduleUntilAcknowledged">["scheduleUntilAcknowledged"]
      >[0]
    > = [];
    const writer: Pick<JobTransactionWriter, "scheduleUntilAcknowledged"> = {
      scheduleUntilAcknowledged: async (input) => {
        writes.push(input);
        return { inserted: false, deduped: true, jobId: 12 };
      },
    };

    assert.deepEqual(
      await requestPRMessageSummaryNotification({
        request: {
          template: "pr.message-summary",
          recipientUserId: "00000000-0000-4000-8000-000000000001",
          channel: "WECHAT_SUBSCRIPTION",
          payload: { prId: 42 },
          metadata: {
            aggregate: { type: "partner_request", id: "42" },
            causationId: "partner_request:42:message-window:101",
          },
        },
        windowStartCursor: 101,
        windowOpenedAt: new Date("2026-07-22T10:00:00.000Z"),
        scheduler: createNotificationUntilAcknowledgedSchedulerAdapter(writer),
      }),
      { creation: "COALESCED" },
    );
    assert.deepEqual(writes, [
      {
        jobType: "notification.send.v1",
        jobVersion: 1,
        runAt: new Date("2026-07-22T10:05:00.000Z"),
        resolutionMs: 1_000,
        earlyToleranceUnits: 0,
        lateToleranceUnits: -1,
        creationKey:
          "notification:pr.message-summary:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42",
        windowStartCursor: 101,
        highWaterCursor: 101,
        payload: {
          schemaVersion: 1,
          template: "pr.message-summary",
          recipientUserId: "00000000-0000-4000-8000-000000000001",
          channel: "WECHAT_SUBSCRIPTION",
          payload: { prId: 42 },
          aggregate: { type: "partner_request", id: "42" },
          causationId: "partner_request:42:message-window:101",
        },
      },
    ]);
    assert.equal(globalSchedule.mock.calls.length, 0);
  });

  it("maps semantic message-window invalidation to a supplied transaction writer only", async () => {
    const globalRelease = vi
      .spyOn(jobRunner, "releaseHeldReservation")
      .mockRejectedValue(new Error("GLOBAL_JOB_RUNNER_MUST_NOT_BE_USED"));
    const exactWrites: Array<
      Parameters<Pick<JobTransactionWriter, "releaseHeldReservation">["releaseHeldReservation"]>[0]
    > = [];
    const prefixWrites: Array<
      Parameters<
        Pick<
          JobTransactionWriter,
          "releaseHeldReservationsByCreationKeyPrefix"
        >["releaseHeldReservationsByCreationKeyPrefix"]
      >[0]
    > = [];
    const writer: Pick<
      JobTransactionWriter,
      "releaseHeldReservation" | "releaseHeldReservationsByCreationKeyPrefix"
    > = {
      releaseHeldReservation: async (input) => {
        exactWrites.push(input);
        return { jobId: 12, released: true, canceled: true };
      },
      releaseHeldReservationsByCreationKeyPrefix: async (input) => {
        prefixWrites.push(input);
        return { released: 2, canceled: 1, jobIds: [12, 13] };
      },
    };
    const port = createPRMessageSummaryNotificationInvalidationAdapter(writer);

    assert.deepEqual(
      await port.invalidateForRecipientAndAggregate({
        prId: 42,
        recipientUserId: "00000000-0000-4000-8000-000000000001",
      }),
      { released: 1, canceled: 1 },
    );
    assert.deepEqual(
      await port.invalidateForRecipient({
        recipientUserId: "00000000-0000-4000-8000-000000000001",
      }),
      { released: 2, canceled: 1 },
    );
    assert.deepEqual(exactWrites, [
      {
        jobType: "notification.send.v1",
        creationKey:
          "notification:pr.message-summary:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42",
      },
    ]);
    assert.deepEqual(prefixWrites, [
      {
        jobType: "notification.send.v1",
        creationKeyPrefix:
          "notification:pr.message-summary:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:",
      },
    ]);
    assert.equal(globalRelease.mock.calls.length, 0);
  });

  it("maps runtime semantic invalidation to the generic Job runner without exposing Job identity", async () => {
    const releaseExact = vi.spyOn(jobRunner, "releaseHeldReservation").mockResolvedValue({
      jobId: 12,
      released: true,
      canceled: true,
    });
    const releasePrefix = vi
      .spyOn(jobRunner, "releaseHeldReservationsByCreationKeyPrefix")
      .mockResolvedValue({ released: 2, canceled: 1, jobIds: [12, 13] });
    const owner = createNotificationOwnerRuntime();

    assert.deepEqual(
      await owner.invalidate({
        template: "pr.message-summary",
        recipientUserId: "00000000-0000-4000-8000-000000000001",
        scope: { kind: "AGGREGATE", aggregate: { type: "partner_request", id: "42" } },
      }),
      { released: 1, canceled: 1 },
    );
    assert.deepEqual(
      await owner.invalidate({
        template: "pr.message-summary",
        recipientUserId: "00000000-0000-4000-8000-000000000001",
        scope: { kind: "RECIPIENT" },
      }),
      { released: 2, canceled: 1 },
    );
    assert.deepEqual(releaseExact.mock.calls, [
      [
        {
          jobType: "notification.send.v1",
          creationKey:
            "notification:pr.message-summary:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42",
        },
      ],
    ]);
    assert.deepEqual(releasePrefix.mock.calls, [
      [
        {
          jobType: "notification.send.v1",
          creationKeyPrefix:
            "notification:pr.message-summary:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:",
        },
      ],
    ]);
  });

  it("creates no held message window while its channel is unavailable", async () => {
    let writerCalls = 0;
    const writer: Pick<JobTransactionWriter, "scheduleUntilAcknowledged"> = {
      scheduleUntilAcknowledged: async () => {
        writerCalls += 1;
        return { inserted: true, deduped: false, jobId: 12 };
      },
    };
    const port = createPRMessageSummaryNotificationPortWithWriter({
      writer,
      // Availability is checked before any repository use, so this sentinel
      // deliberately proves the no-channel path has no transaction reads.
      executor: null as unknown as TransactionExecutor,
      isChannelConfigured: async () => false,
    });

    assert.deepEqual(
      await port.requestForSourceRecipients({
        prId: 42,
        authorUserId: "00000000-0000-4000-8000-000000000001",
        windowStartCursor: 101,
        windowOpenedAt: new Date("2026-07-22T10:00:00.000Z"),
        activeRecipientCandidateUserIds: [
          "00000000-0000-4000-8000-000000000001",
          "00000000-0000-4000-8000-000000000002",
        ],
      }),
      { recipientUserIds: [] },
    );
    assert.equal(writerCalls, 0);
  });

  it("locks the PR-message option row before deciding source-time eligibility", async () => {
    const [
      { UserNotificationOptRepository: UserNotificationOptRepositoryClass },
      { UserRepository: UserRepositoryClass },
    ] = await Promise.all([
      import("../../repositories/UserNotificationOptRepository"),
      import("../../repositories/UserRepository"),
    ]);
    const lockedOption = vi
      .spyOn(UserNotificationOptRepositoryClass.prototype, "findByUserIdForUpdateInTransaction")
      .mockResolvedValue({
        wechatPrMessageOptIn: true,
        wechatPrMessageRemainingCount: 1,
      } as Awaited<
        ReturnType<UserNotificationOptRepository["findByUserIdForUpdateInTransaction"]>
      >);
    const unlockedOption = vi
      .spyOn(UserNotificationOptRepositoryClass.prototype, "findByUserIdInTransaction")
      .mockRejectedValue(new Error("UNLOCKED_OPTION_READ_MUST_NOT_BE_USED"));
    vi.spyOn(UserRepositoryClass.prototype, "findById").mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000002",
      status: "ACTIVE",
      openId: "message-window-open-id",
    } as Awaited<ReturnType<UserRepository["findById"]>>);
    const writes: Array<
      Parameters<
        Pick<JobTransactionWriter, "scheduleUntilAcknowledged">["scheduleUntilAcknowledged"]
      >[0]
    > = [];
    const writer: Pick<JobTransactionWriter, "scheduleUntilAcknowledged"> = {
      scheduleUntilAcknowledged: async (input) => {
        writes.push(input);
        return { inserted: true, deduped: false, jobId: 12 };
      },
    };
    const port = createPRMessageSummaryNotificationPortWithWriter({
      writer,
      executor: {} as TransactionExecutor,
      isChannelConfigured: async () => true,
    });

    assert.deepEqual(
      await port.requestForSourceRecipients({
        prId: 42,
        authorUserId: "00000000-0000-4000-8000-000000000001",
        windowStartCursor: 101,
        windowOpenedAt: new Date("2026-07-22T10:00:00.000Z"),
        activeRecipientCandidateUserIds: [
          "00000000-0000-4000-8000-000000000002",
          "00000000-0000-4000-8000-000000000002",
        ],
      }),
      { recipientUserIds: ["00000000-0000-4000-8000-000000000002"] },
    );
    assert.equal(lockedOption.mock.calls.length, 1);
    assert.equal(unlockedOption.mock.calls.length, 0);
    assert.equal(writes.length, 1);
  });
});
