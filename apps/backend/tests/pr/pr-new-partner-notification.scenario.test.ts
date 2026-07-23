import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { requestNotification } from "../../src/domains/notification";
import { notificationTaskPayloadSchema } from "../../src/domains/notification/owner/task";
import { createPrAdmissionTransactionPort } from "../../src/domains/pr/adapters/pr-admission-transaction";
import { createWaitlistPromotionTransactionPort } from "../../src/domains/pr/adapters/waitlist-promotion-transaction";
import { getNewPartnerNotificationContext } from "../../src/domains/pr/notification-contexts";
import { jobs } from "../../src/entities/job";
import { db } from "../../src/lib/db";
import { createNotificationOwnerRuntime } from "../../src/infra/notifications/notification-owner-runtime";
import { PartnerRepository } from "../../src/repositories/PartnerRepository";
import { UserNotificationOptRepository } from "../../src/repositories/UserNotificationOptRepository";
import { UserReliabilityRepository } from "../../src/repositories/UserReliabilityRepository";
import { scenario } from "../_infra/scenario/scenario";
import { exitPR } from "./_kit/actions/exit";
import { joinPartnerRequest } from "./_kit/actions/join";
import {
  bindScenarioWeChatOpenId,
  configureOpenConfirmationWindow,
} from "./_kit/actions/system-state";
import { waitlistPR } from "./_kit/actions/waitlist";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenUser } from "./_kit/builders/users";

const partnerRepo = new PartnerRepository();
const notificationOptRepo = new UserNotificationOptRepository();
const reliabilityRepo = new UserReliabilityRepository();

const getNewPartnerJobs = async (input: { prId: number; partnerId: number }) => {
  const rows = await db.select().from(jobs).where(eq(jobs.jobType, "notification.send.v1"));
  return rows.flatMap((job) => {
    const parsed = notificationTaskPayloadSchema.safeParse(job.payload);
    if (
      !parsed.success ||
      parsed.data.template !== "pr.new-partner" ||
      parsed.data.payload.prId !== input.prId ||
      parsed.data.payload.partnerId !== input.partnerId
    ) {
      return [];
    }
    return [{ job, task: parsed.data }];
  });
};

const getNewPartnerJobsForPr = async (prId: number) => {
  const rows = await db.select().from(jobs).where(eq(jobs.jobType, "notification.send.v1"));
  return rows.flatMap((job) => {
    const parsed = notificationTaskPayloadSchema.safeParse(job.payload);
    if (!parsed.success || parsed.data.template !== "pr.new-partner") {
      return [];
    }
    return parsed.data.payload.prId === prId ? [{ job, task: parsed.data }] : [];
  });
};

scenario("new_partner_atomic_direct_join_freezes_exact_source_recipient_fanout", async (ctx) => {
  const creator = await givenUser("new-partner-direct-creator");
  const eligibleExisting = await givenUser("new-partner-direct-eligible-existing");
  const optedOutExisting = await givenUser("new-partner-direct-opted-out-existing");
  const newcomer = await givenUser("new-partner-direct-newcomer");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 4,
    expectedCreatedStatus: "OPEN",
    title: "New partner atomic direct fanout",
  });
  ctx.record("prId", pr.id);
  await configureOpenConfirmationWindow(pr);

  await Promise.all([
    bindScenarioWeChatOpenId({ user: creator, openId: "openid-new-partner-direct-creator" }),
    bindScenarioWeChatOpenId({
      user: eligibleExisting,
      openId: "openid-new-partner-direct-eligible",
    }),
    bindScenarioWeChatOpenId({
      user: optedOutExisting,
      openId: "openid-new-partner-direct-opted-out",
    }),
  ]);
  await notificationOptRepo.addOneWechatNotificationCredit(creator.user.id, "NEW_PARTNER");
  await notificationOptRepo.addOneWechatNotificationCredit(eligibleExisting.user.id, "NEW_PARTNER");

  await joinPartnerRequest({ pr, user: eligibleExisting });
  await joinPartnerRequest({ pr, user: optedOutExisting });
  await joinPartnerRequest({ pr, user: newcomer });

  const newcomerSlot = await partnerRepo.findActiveByPrIdAndUserId(pr.id, newcomer.user.id);
  assert.ok(newcomerSlot);
  assert.ok(newcomerSlot.admissionCycleId);

  const newPartnerJobs = await getNewPartnerJobs({ prId: pr.id, partnerId: newcomerSlot.id });
  assert.equal(newPartnerJobs.length, 2);
  assert.deepEqual(
    new Set(newPartnerJobs.map(({ task }) => task.recipientUserId)),
    new Set([creator.user.id, eligibleExisting.user.id]),
  );
  for (const { job, task } of newPartnerJobs) {
    assert.equal(job.creationMode, "ONCE_PER_CAUSE");
    assert.equal(task.payload.joinedUserId, newcomer.user.id);
    assert.equal(task.payload.admissionCycleId, newcomerSlot.admissionCycleId);
    assert.ok(Number.isFinite(Date.parse(task.payload.joinedAtIso)));
    assert.equal(
      task.causationId,
      `partner_request:${pr.id}:new-partner:${newcomerSlot.id}:${newcomerSlot.admissionCycleId}`,
    );
  }

  const creatorTask = newPartnerJobs.find(({ task }) => task.recipientUserId === creator.user.id);
  assert.ok(creatorTask);
  const repeated = await requestNotification({
    template: "pr.new-partner",
    recipientUserId: creator.user.id,
    channel: "WECHAT_SUBSCRIPTION",
    payload: creatorTask.task.payload,
    metadata: {
      aggregate: { type: "partner_request", id: String(pr.id) },
      causationId: creatorTask.task.causationId,
    },
  });
  assert.equal(repeated.creation, "COALESCED");
  assert.equal((await getNewPartnerJobs({ prId: pr.id, partnerId: newcomerSlot.id })).length, 2);

  let dispatchedTemplate: string | null = null;
  let dispatchedContent: Record<string, unknown> | null = null;
  let channelCalls = 0;
  const owner = createNotificationOwnerRuntime({
    channel: {
      async send(message) {
        channelCalls += 1;
        dispatchedTemplate = message.template;
        dispatchedContent = message.content;
        return { outcome: "ACCEPTED", providerReference: "new-partner-provider-id" };
      },
    },
  });
  assert.deepEqual(await owner.dispatch(creatorTask.task), {
    disposition: "SUCCEEDED",
    reason: "CHANNEL_ACCEPTED",
    providerReference: "new-partner-provider-id",
  });
  assert.equal(dispatchedTemplate, "pr.new-partner");
  assert.equal(dispatchedContent?.applicantName, newcomer.user.nickname);
  assert.equal(dispatchedContent?.teamName, "New partner atomic direct fanout");
  assert.equal(dispatchedContent?.tip, "有新搭子加入");
  assert.match(String(dispatchedContent?.appliedAt), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  const creatorOptionAfterDispatch = await notificationOptRepo.findByUserId(creator.user.id);
  assert.ok(creatorOptionAfterDispatch);
  assert.equal(creatorOptionAfterDispatch.wechatNewPartnerRemainingCount, 0);
  assert.equal(creatorOptionAfterDispatch.wechatNewPartnerOptIn, true);
  assert.equal(channelCalls, 1);

  const eligibleExistingTask = newPartnerJobs.find(
    ({ task }) => task.recipientUserId === eligibleExisting.user.id,
  );
  assert.ok(eligibleExistingTask);
  await notificationOptRepo.clearWechatNotificationCredits(eligibleExisting.user.id, "NEW_PARTNER");
  assert.deepEqual(await owner.dispatch(eligibleExistingTask.task), {
    disposition: "SKIPPED",
    reason: "NOTIFICATION_PREFERENCE_OR_CREDIT_INELIGIBLE",
  });
  assert.equal(channelCalls, 1);
});

scenario("new_partner_admission_cycle_separates_reentry_and_fences_stale_dispatch", async (ctx) => {
  const creator = await givenUser("new-partner-cycle-creator");
  const newcomer = await givenUser("new-partner-cycle-newcomer");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
    title: "New partner admission cycle",
  });
  ctx.record("prId", pr.id);
  await configureOpenConfirmationWindow(pr);

  await bindScenarioWeChatOpenId({
    user: creator,
    openId: "openid-new-partner-cycle-creator",
  });
  await notificationOptRepo.addOneWechatNotificationCredit(creator.user.id, "NEW_PARTNER");

  await joinPartnerRequest({ pr, user: newcomer });
  const firstAdmission = await partnerRepo.findActiveByPrIdAndUserId(pr.id, newcomer.user.id);
  assert.ok(firstAdmission);
  assert.ok(firstAdmission.admissionCycleId);
  const firstCycleId = firstAdmission.admissionCycleId;

  await exitPR({ pr, user: newcomer });
  await joinPartnerRequest({ pr, user: newcomer });
  const secondAdmission = await partnerRepo.findActiveByPrIdAndUserId(pr.id, newcomer.user.id);
  assert.ok(secondAdmission);
  assert.equal(secondAdmission.id, firstAdmission.id);
  assert.ok(secondAdmission.admissionCycleId);
  assert.notEqual(secondAdmission.admissionCycleId, firstCycleId);

  const newPartnerJobs = await getNewPartnerJobs({ prId: pr.id, partnerId: secondAdmission.id });
  assert.equal(newPartnerJobs.length, 2);
  assert.deepEqual(
    new Set(newPartnerJobs.map(({ task }) => task.payload.admissionCycleId)),
    new Set([firstCycleId, secondAdmission.admissionCycleId]),
  );
  assert.notEqual(newPartnerJobs[0]?.job.creationKey, newPartnerJobs[1]?.job.creationKey);

  assert.deepEqual(
    await getNewPartnerNotificationContext({
      prId: pr.id,
      partnerId: firstAdmission.id,
      joinedUserId: newcomer.user.id,
      recipientUserId: creator.user.id,
      admissionCycleId: firstCycleId,
    }),
    { state: "SKIPPED", reason: "NEW_PARTNER_ADMISSION_SUPERSEDED" },
  );
  assert.equal(
    (
      await getNewPartnerNotificationContext({
        prId: pr.id,
        partnerId: secondAdmission.id,
        joinedUserId: newcomer.user.id,
        recipientUserId: creator.user.id,
        admissionCycleId: secondAdmission.admissionCycleId,
      })
    ).state,
    "READY",
  );
});

scenario(
  "new_partner_direct_admission_rolls_back_when_atomic_notification_handoff_fails",
  async (ctx) => {
    const creator = await givenUser("new-partner-direct-rollback-creator");
    const newcomer = await givenUser("new-partner-direct-rollback-newcomer");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 2,
      expectedCreatedStatus: "OPEN",
    });
    ctx.record("prId", pr.id);
    await configureOpenConfirmationWindow(pr);

    const reliabilityBefore = await reliabilityRepo.findByUserId(newcomer.user.id);
    const admission = createPrAdmissionTransactionPort({
      createNewPartnerNotificationPort: () => ({
        requestForSourceRecipients: async () => {
          throw new Error("INJECTED_NEW_PARTNER_HANDOFF_FAILURE");
        },
      }),
    });
    await assert.rejects(
      admission.admitDirect({ prId: pr.id, userId: newcomer.user.id }),
      /INJECTED_NEW_PARTNER_HANDOFF_FAILURE/,
    );

    assert.equal(await partnerRepo.findActiveByPrIdAndUserId(pr.id, newcomer.user.id), null);
    assert.deepEqual(await reliabilityRepo.findByUserId(newcomer.user.id), reliabilityBefore);
    assert.equal((await getNewPartnerJobsForPr(pr.id)).length, 0);
  },
);

scenario(
  "new_partner_promotion_handoff_rolls_back_waitlist_job_and_later_exit_skips_dispatch",
  async (ctx) => {
    const creator = await givenUser("new-partner-promotion-creator");
    const filler = await givenUser("new-partner-promotion-filler");
    const candidate = await givenUser("new-partner-promotion-candidate");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 2,
      expectedCreatedStatus: "OPEN",
      title: "New partner promotion handoff",
    });
    ctx.record("prId", pr.id);
    await configureOpenConfirmationWindow(pr);

    await bindScenarioWeChatOpenId({
      user: creator,
      openId: "openid-new-partner-promotion-creator",
    });
    await notificationOptRepo.addOneWechatNotificationCredit(creator.user.id, "NEW_PARTNER");
    await joinPartnerRequest({ pr, user: filler });
    await waitlistPR({ pr, user: candidate });

    const fillerSlot = await partnerRepo.findActiveByPrIdAndUserId(pr.id, filler.user.id);
    const candidateSlot = await partnerRepo.findPendingByPrIdAndUserId(pr.id, candidate.user.id);
    assert.ok(fillerSlot);
    assert.ok(candidateSlot);
    assert.ok(candidateSlot.waitlistCycleId);
    await partnerRepo.updateStatus(fillerSlot.id, "EXITED");
    const reliabilityBefore = await reliabilityRepo.findByUserId(candidate.user.id);

    const failingPromotion = createWaitlistPromotionTransactionPort({
      createNewPartnerNotificationPort: () => ({
        requestForSourceRecipients: async () => {
          throw new Error("INJECTED_PROMOTION_NEW_PARTNER_HANDOFF_FAILURE");
        },
      }),
    });
    await assert.rejects(
      failingPromotion.promote({
        prId: pr.id,
        partnerId: candidateSlot.id,
        userId: candidate.user.id,
      }),
      /INJECTED_PROMOTION_NEW_PARTNER_HANDOFF_FAILURE/,
    );
    const candidateAfterRollback = await partnerRepo.findPendingByPrIdAndUserId(
      pr.id,
      candidate.user.id,
    );
    assert.ok(candidateAfterRollback);
    assert.equal(candidateAfterRollback.waitlistCycleId, candidateSlot.waitlistCycleId);
    assert.deepEqual(await reliabilityRepo.findByUserId(candidate.user.id), reliabilityBefore);
    const waitlistCause = `partner_request:${pr.id}:waitlist-promotion:${candidateSlot.id}:${candidateSlot.waitlistCycleId}`;
    const failedPromotionJobs = (await db.select().from(jobs)).filter(
      (job) => job.payload.causationId === waitlistCause,
    );
    assert.equal(failedPromotionJobs.length, 0);

    const successfulPromotion = await createWaitlistPromotionTransactionPort().promote({
      prId: pr.id,
      partnerId: candidateSlot.id,
      userId: candidate.user.id,
    });
    assert.equal(successfulPromotion.outcome, "PROMOTED");
    const promoted = await partnerRepo.findActiveByPrIdAndUserId(pr.id, candidate.user.id);
    assert.ok(promoted);
    const tasks = await getNewPartnerJobs({ prId: pr.id, partnerId: promoted.id });
    const creatorTask = tasks.find(({ task }) => task.recipientUserId === creator.user.id);
    assert.ok(creatorTask);

    await exitPR({ pr, user: creator });
    let channelCalls = 0;
    const owner = createNotificationOwnerRuntime({
      channel: {
        async send() {
          channelCalls += 1;
          return { outcome: "ACCEPTED", providerReference: "unexpected" };
        },
      },
    });
    assert.deepEqual(await owner.dispatch(creatorTask.task), {
      disposition: "SKIPPED",
      reason: "RECIPIENT_NOT_ACTIVE_PARTICIPANT",
    });
    assert.equal(channelCalls, 0);
    const creatorOpt = await notificationOptRepo.findByUserId(creator.user.id);
    assert.ok(creatorOpt);
    assert.equal(creatorOpt.wechatNewPartnerRemainingCount, 1);
  },
);
