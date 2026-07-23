import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { createTransactionBoundPRMessageSummaryNotificationPort } from "../../src/domains/notification";
import {
  notificationTaskPayloadSchema,
  type PRMessageSummaryNotificationTask,
} from "../../src/domains/notification/owner/task";
import { createPRMessagePersistenceTransactionPort } from "../../src/domains/pr/adapters/pr-message-persistence-transaction";
import { jobs, type JobRow } from "../../src/entities/job";
import { db } from "../../src/lib/db";
import { PRMessageRepository } from "../../src/repositories/PRMessageRepository";
import { UserNotificationOptRepository } from "../../src/repositories/UserNotificationOptRepository";
import { scenario } from "../_infra/scenario/scenario";
import { bindScenarioWeChatOpenId } from "./_kit/actions/system-state";
import { joinPartnerRequest } from "./_kit/actions/join";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenUser } from "./_kit/builders/users";

type PRMessageSummaryJob = {
  job: JobRow;
  task: PRMessageSummaryNotificationTask;
};

const messageRepo = new PRMessageRepository();
const notificationOptRepo = new UserNotificationOptRepository();

const getPRMessageSummaryJobs = async (prId: number): Promise<PRMessageSummaryJob[]> => {
  const rows = await db.select().from(jobs).where(eq(jobs.jobType, "notification.send.v1"));
  const matched: PRMessageSummaryJob[] = [];
  for (const job of rows) {
    const parsed = notificationTaskPayloadSchema.safeParse(job.payload);
    if (
      parsed.success &&
      parsed.data.template === "pr.message-summary" &&
      parsed.data.payload.prId === prId
    ) {
      matched.push({ job, task: parsed.data });
    }
  }
  return matched;
};

const createConfiguredMessagePersistencePort = () =>
  createPRMessagePersistenceTransactionPort({
    createNotificationPort: (input) =>
      createTransactionBoundPRMessageSummaryNotificationPort({
        ...input,
        isChannelConfigured: async () => true,
      }),
  });

scenario("pr_message_atomic_source_commits_message_and_one_generic_window", async (ctx) => {
  const creator = await givenUser("message-atomic-creator");
  const eligibleRecipient = await givenUser("message-atomic-eligible");
  const noCreditRecipient = await givenUser("message-atomic-no-credit");
  const outsider = await givenUser("message-atomic-outsider");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 4,
    expectedCreatedStatus: "OPEN",
    title: "PR message atomic persistence",
  });
  ctx.record("prId", pr.id);
  await Promise.all([
    bindScenarioWeChatOpenId({
      user: eligibleRecipient,
      openId: "openid-message-atomic-eligible",
    }),
    bindScenarioWeChatOpenId({
      user: noCreditRecipient,
      openId: "openid-message-atomic-no-credit",
    }),
    notificationOptRepo.addOneWechatNotificationCredit(eligibleRecipient.user.id, "PR_MESSAGE"),
  ]);
  await joinPartnerRequest({ pr, user: eligibleRecipient });
  await joinPartnerRequest({ pr, user: noCreditRecipient });

  const persistence = createConfiguredMessagePersistencePort();
  const rejected = await persistence.persist({
    prId: pr.id,
    authorUserId: outsider.user.id,
    body: "This must not be persisted",
    authorKind: "ACTIVE_PARTICIPANT",
  });
  assert.deepEqual(rejected, { outcome: "AUTHOR_NOT_ACTIVE_PARTICIPANT" });
  assert.equal((await messageRepo.listByPrId(pr.id)).length, 0);
  assert.equal((await getPRMessageSummaryJobs(pr.id)).length, 0);

  const persisted = await persistence.persist({
    prId: pr.id,
    authorUserId: creator.user.id,
    body: "Atomic message window source",
    authorKind: "ACTIVE_PARTICIPANT",
  });
  assert.equal(persisted.outcome, "CREATED");
  if (persisted.outcome !== "CREATED") return;
  assert.equal(persisted.message.prId, pr.id);
  assert.equal(persisted.message.authorUserId, creator.user.id);
  assert.equal(persisted.message.body, "Atomic message window source");

  const scheduled = await getPRMessageSummaryJobs(pr.id);
  assert.equal(scheduled.length, 1);
  const job = scheduled[0];
  assert.ok(job);
  assert.equal(job.task.recipientUserId, eligibleRecipient.user.id);
  assert.equal(job.task.payload.prId, pr.id);
  assert.equal(
    job.task.causationId,
    `partner_request:${pr.id}:message-window:${persisted.message.id}`,
  );
  assert.equal(job.job.creationMode, "UNTIL_ACKNOWLEDGED");
  assert.equal(job.job.reservationState, "HELD");
  assert.equal(job.job.windowStartCursor, persisted.message.id);
  assert.equal(job.job.highWaterCursor, persisted.message.id);
  assert.equal(
    job.job.creationKey,
    `notification:pr.message-summary:WECHAT_SUBSCRIPTION:${eligibleRecipient.user.id}:${pr.id}`,
  );
});

scenario(
  "pr_message_atomic_source_commits_message_without_reservation_when_channel_is_unavailable",
  async (ctx) => {
    const creator = await givenUser("message-atomic-no-channel-creator");
    const recipient = await givenUser("message-atomic-no-channel-recipient");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 3,
      expectedCreatedStatus: "OPEN",
      title: "PR message atomic no channel",
    });
    ctx.record("prId", pr.id);
    await Promise.all([
      bindScenarioWeChatOpenId({
        user: recipient,
        openId: "openid-message-atomic-no-channel-recipient",
      }),
      notificationOptRepo.addOneWechatNotificationCredit(recipient.user.id, "PR_MESSAGE"),
    ]);
    await joinPartnerRequest({ pr, user: recipient });

    const noChannelPersistence = createPRMessagePersistenceTransactionPort({
      createNotificationPort: (input) =>
        createTransactionBoundPRMessageSummaryNotificationPort({
          ...input,
          isChannelConfigured: async () => false,
        }),
    });
    const persisted = await noChannelPersistence.persist({
      prId: pr.id,
      authorUserId: creator.user.id,
      body: "The source message must not depend on provider configuration",
      authorKind: "ACTIVE_PARTICIPANT",
    });

    assert.equal(persisted.outcome, "CREATED");
    assert.equal((await messageRepo.listByPrId(pr.id)).length, 1);
    assert.equal((await getPRMessageSummaryJobs(pr.id)).length, 0);
  },
);

scenario(
  "pr_message_atomic_source_rolls_back_message_and_already_written_generic_window_on_failure",
  async (ctx) => {
    const creator = await givenUser("message-atomic-rollback-creator");
    const recipient = await givenUser("message-atomic-rollback-recipient");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 3,
      expectedCreatedStatus: "OPEN",
      title: "PR message atomic rollback",
    });
    ctx.record("prId", pr.id);
    await Promise.all([
      bindScenarioWeChatOpenId({
        user: recipient,
        openId: "openid-message-atomic-rollback-recipient",
      }),
      notificationOptRepo.addOneWechatNotificationCredit(recipient.user.id, "PR_MESSAGE"),
    ]);
    await joinPartnerRequest({ pr, user: recipient });

    let reservationWasWrittenBeforeFailure = false;
    const failingPersistence = createPRMessagePersistenceTransactionPort({
      createNotificationPort: (input) => {
        const realPort = createTransactionBoundPRMessageSummaryNotificationPort({
          ...input,
          isChannelConfigured: async () => true,
        });
        return {
          async requestForSourceRecipients(request) {
            await realPort.requestForSourceRecipients(request);
            reservationWasWrittenBeforeFailure = true;
            throw new Error("INJECTED_PR_MESSAGE_RESERVATION_FAILURE");
          },
        };
      },
    });
    await assert.rejects(
      failingPersistence.persist({
        prId: pr.id,
        authorUserId: creator.user.id,
        body: "This transaction must roll back",
        authorKind: "ACTIVE_PARTICIPANT",
      }),
      /INJECTED_PR_MESSAGE_RESERVATION_FAILURE/,
    );

    assert.equal(reservationWasWrittenBeforeFailure, true);
    assert.equal((await messageRepo.listByPrId(pr.id)).length, 0);
    assert.equal((await getPRMessageSummaryJobs(pr.id)).length, 0);
  },
);
