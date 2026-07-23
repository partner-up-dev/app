import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import { createWaitlistPromotionTransactionPort } from "../../src/domains/pr/adapters/waitlist-promotion-transaction";
import {
  getWaitlistAlternativeAvailableNotificationContext,
  getWaitlistPromotedNotificationContext,
} from "../../src/domains/pr/notification-contexts";
import { requestNotification } from "../../src/domains/notification";
import type { NotificationChannelPort } from "../../src/domains/notification/owner/ports";
import { jobs } from "../../src/entities/job";
import { db } from "../../src/lib/db";
import { createNotificationOwnerRuntime } from "../../src/infra/notifications/notification-owner-runtime";
import { PartnerRepository } from "../../src/repositories/PartnerRepository";
import { UserNotificationOptRepository } from "../../src/repositories/UserNotificationOptRepository";
import { UserReliabilityRepository } from "../../src/repositories/UserReliabilityRepository";
import { exitPR } from "./_kit/actions/exit";
import { joinPartnerRequest } from "./_kit/actions/join";
import { bindScenarioWeChatOpenId } from "./_kit/actions/system-state";
import { setTestUserStatus } from "../_infra/actions/user-state";
import { cancelWaitlistPR, waitlistPR } from "./_kit/actions/waitlist";
import {
  expectMessageThreadForbidden,
  expectMessageThreadVisible,
} from "./_kit/assertions/messages";
import {
  expectActiveParticipantCount,
  expectActiveParticipantsInclude,
} from "./_kit/assertions/participants";
import { expectPartnerRequestStatus } from "./_kit/assertions/partner-requests";
import {
  expectPartnerSlotStatus,
  expectPendingWaitlistCount,
  expectViewerWaitlisted,
} from "./_kit/assertions/waitlist";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenUser } from "./_kit/builders/users";
import { probeMessageThreadVisibility } from "./_kit/probes/messages";
import { getWaitlistDetail, probePartnerSlotStatus } from "./_kit/probes/waitlist";

const partnerRepo = new PartnerRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const userReliabilityRepo = new UserReliabilityRepository();

function requirePendingPartnerId(value: number | null): number {
  if (value === null) {
    throw new Error("Expected pending partner id");
  }
  return value;
}

scenario("waitlist_response_exposes_public_pr_fields_and_access_token_header", async (ctx) => {
  const creator = await givenUser("waitlist-response-creator");
  const joiner = await givenUser("waitlist-response-joiner");
  const candidate = await givenUser("waitlist-response-candidate");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
    title: "Waitlist response public fields",
  });

  ctx.record("prId", pr.id);
  ctx.record("candidateUserId", candidate.user.id);

  await joinPartnerRequest({ pr, user: joiner });

  const response = await requestJson(`/api/pr/${pr.id}/waitlist`, {
    method: "POST",
    token: candidate.token,
    body: {
      alternativePrReminderOptIn: false,
    },
  });
  assert.equal(response.status, 200);
  assert.ok(response.headers.get("x-access-token"));

  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(body.id, pr.id);
  assert.equal(body.status, "OPEN");
  assert.equal(body.title, "Waitlist response public fields");
  assert.ok(Array.isArray(body.partners));
  assert.equal(body.partners.length, 2);
  assert.equal(
    body.partners.every((partnerId) => typeof partnerId === "number"),
    true,
  );
  assert.equal(body.myPartnerId, null);
  assert.equal(typeof body.myPendingPartnerId, "number");
  assert.equal(body.isViewerWaitlisted, true);
  assert.equal(body.isViewerReleased, false);

  for (const key of ["auth", "accessToken", "role", "userId"] as const) {
    assert.equal(Object.prototype.hasOwnProperty.call(body, key), false);
  }
});

scenario("full_pr_waitlist_promotes_earliest_pending_after_exit", async (ctx) => {
  const creator = await givenUser("waitlist-creator");
  const joiner = await givenUser("waitlist-joiner");
  const firstCandidate = await givenUser("waitlist-first");
  const secondCandidate = await givenUser("waitlist-second");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
  });

  ctx.record("prId", pr.id);
  ctx.record("firstCandidateUserId", firstCandidate.user.id);
  ctx.record("secondCandidateUserId", secondCandidate.user.id);

  const joined = await joinPartnerRequest({ pr, user: joiner });
  assert.equal(joined.status, "OPEN");
  await expectPartnerRequestStatus(pr, "OPEN");
  await expectActiveParticipantCount(pr, 2);

  const firstWaitlist = await waitlistPR({ pr, user: firstCandidate });
  assert.equal(firstWaitlist.status, "OPEN");

  const secondWaitlist = await waitlistPR({ pr, user: secondCandidate });
  assert.equal(secondWaitlist.isViewerWaitlisted, true);

  await expectViewerWaitlisted({ pr, user: firstCandidate, rank: 1 });
  await expectActiveParticipantCount(pr, 2);
  await expectPendingWaitlistCount(pr, 2);
  expectMessageThreadForbidden(await probeMessageThreadVisibility({ pr, viewer: firstCandidate }));

  await exitPR({ pr, user: joiner });

  await expectPartnerRequestStatus(pr, "OPEN");
  await expectActiveParticipantCount(pr, 2);
  await expectActiveParticipantsInclude(pr, [creator.user.id, firstCandidate.user.id]);
  await expectPartnerSlotStatus({
    pr,
    user: firstCandidate,
    status: "JOINED",
  });

  const promotedPartner = await partnerRepo.findActiveByPrIdAndUserId(
    pr.id,
    firstCandidate.user.id,
  );
  assert.ok(promotedPartner, "Expected promoted partner slot");
  assert.ok(promotedPartner.waitlistCycleId, "Expected promoted waitlist cycle id");
  const expectedCausationId = `partner_request:${pr.id}:waitlist-promotion:${promotedPartner.id}:${promotedPartner.waitlistCycleId}`;
  const pendingNotificationJobs = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.jobType, "notification.send.v1"), eq(jobs.status, "PENDING")));
  const promotedJob = pendingNotificationJobs.find(
    (job) => job.payload.causationId === expectedCausationId,
  );
  assert.ok(promotedJob, "Expected a pending generic waitlist notification job");
  assert.equal(promotedJob.jobVersion, 1);
  assert.equal(promotedJob.creationMode, "ONCE_PER_CAUSE");
  assert.deepEqual(promotedJob.payload, {
    schemaVersion: 1,
    template: "pr.waitlist-promoted",
    recipientUserId: firstCandidate.user.id,
    channel: "WECHAT_SUBSCRIPTION",
    payload: {
      prId: pr.id,
      partnerId: promotedPartner.id,
      waitlistCycleId: promotedPartner.waitlistCycleId,
    },
    aggregate: { type: "partner_request", id: String(pr.id) },
    causationId: expectedCausationId,
  });

  const repeatedNotification = await requestNotification({
    template: "pr.waitlist-promoted",
    recipientUserId: firstCandidate.user.id,
    channel: "WECHAT_SUBSCRIPTION",
    payload: {
      prId: pr.id,
      partnerId: promotedPartner.id,
      waitlistCycleId: promotedPartner.waitlistCycleId,
    },
    metadata: {
      aggregate: { type: "partner_request", id: String(pr.id) },
      causationId: expectedCausationId,
    },
  });
  assert.equal(repeatedNotification.creation, "COALESCED");

  const jobsForPromotionCause = (
    await db.select().from(jobs).where(eq(jobs.jobType, "notification.send.v1"))
  ).filter((job) => job.payload.causationId === expectedCausationId);
  assert.equal(jobsForPromotionCause.length, 1);
  assert.equal(jobsForPromotionCause[0]?.creationMode, "ONCE_PER_CAUSE");

  const secondDetail = await getWaitlistDetail({
    pr,
    user: secondCandidate,
  });
  assert.equal(secondDetail.partnerSection.viewer.isWaitlisted, true);
  assert.equal(secondDetail.partnerSection.viewer.waitlistRank, 1);
  assert.equal(secondDetail.partnerSection.viewer.slotState, "PENDING");

  expectMessageThreadVisible(await probeMessageThreadVisibility({ pr, viewer: firstCandidate }));
  expectMessageThreadForbidden(await probeMessageThreadVisibility({ pr, viewer: secondCandidate }));
});

scenario("waitlist_promotion_skips_ineligible_candidate_without_blocking_fifo", async (ctx) => {
  const creator = await givenUser("waitlist-ineligible-creator");
  const joiner = await givenUser("waitlist-ineligible-joiner");
  const ineligibleCandidate = await givenUser("waitlist-ineligible-first");
  const eligibleCandidate = await givenUser("waitlist-ineligible-second");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
  });
  ctx.record("prId", pr.id);

  await joinPartnerRequest({ pr, user: joiner });
  await waitlistPR({ pr, user: ineligibleCandidate });
  await waitlistPR({ pr, user: eligibleCandidate });
  await setTestUserStatus({
    userId: ineligibleCandidate.user.id,
    status: "DISABLED",
  });

  await exitPR({ pr, user: joiner });

  await expectPartnerSlotStatus({
    pr,
    user: ineligibleCandidate,
    status: "PENDING",
  });
  await expectPartnerSlotStatus({
    pr,
    user: eligibleCandidate,
    status: "JOINED",
  });
  await expectActiveParticipantsInclude(pr, [creator.user.id, eligibleCandidate.user.id]);
  await expectPendingWaitlistCount(pr, 1);
});

scenario("waitlist_reentry_creates_new_cause_and_fences_stale_promotion_task", async (ctx) => {
  const creator = await givenUser("waitlist-cycle-creator");
  const firstFiller = await givenUser("waitlist-cycle-first-filler");
  const candidate = await givenUser("waitlist-cycle-candidate");
  const secondFiller = await givenUser("waitlist-cycle-second-filler");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
    title: "Waitlist cycle identity",
  });
  ctx.record("prId", pr.id);

  await joinPartnerRequest({ pr, user: firstFiller });
  await waitlistPR({ pr, user: candidate });
  await exitPR({ pr, user: firstFiller });

  const firstPromotion = await partnerRepo.findActiveByPrIdAndUserId(pr.id, candidate.user.id);
  assert.ok(firstPromotion);
  assert.ok(firstPromotion.waitlistCycleId);
  const firstCycleId = firstPromotion.waitlistCycleId;
  const firstCausationId = `partner_request:${pr.id}:waitlist-promotion:${firstPromotion.id}:${firstCycleId}`;

  await exitPR({ pr, user: candidate });
  await joinPartnerRequest({ pr, user: secondFiller });
  await waitlistPR({ pr, user: candidate });

  const reentered = await partnerRepo.findPendingByPrIdAndUserId(pr.id, candidate.user.id);
  assert.ok(reentered);
  assert.equal(reentered.id, firstPromotion.id, "Expected historical slot reuse");
  assert.ok(reentered.waitlistCycleId);
  assert.notEqual(reentered.waitlistCycleId, firstCycleId);
  const secondCycleId = reentered.waitlistCycleId;

  await exitPR({ pr, user: secondFiller });

  const secondPromotion = await partnerRepo.findActiveByPrIdAndUserId(pr.id, candidate.user.id);
  assert.ok(secondPromotion);
  assert.equal(secondPromotion.id, firstPromotion.id);
  assert.equal(secondPromotion.waitlistCycleId, secondCycleId);
  const secondCausationId = `partner_request:${pr.id}:waitlist-promotion:${secondPromotion.id}:${secondCycleId}`;

  const promotionJobs = (
    await db.select().from(jobs).where(eq(jobs.jobType, "notification.send.v1"))
  ).filter(
    (job) =>
      job.payload.causationId === firstCausationId || job.payload.causationId === secondCausationId,
  );
  assert.equal(promotionJobs.length, 2);
  assert.notEqual(promotionJobs[0]?.creationKey, promotionJobs[1]?.creationKey);

  const staleContext = await getWaitlistPromotedNotificationContext({
    prId: pr.id,
    partnerId: firstPromotion.id,
    recipientUserId: candidate.user.id,
    waitlistCycleId: firstCycleId,
  });
  assert.deepEqual(staleContext, {
    state: "SKIPPED",
    reason: "WAITLIST_CYCLE_SUPERSEDED",
  });
  const currentContext = await getWaitlistPromotedNotificationContext({
    prId: pr.id,
    partnerId: secondPromotion.id,
    recipientUserId: candidate.user.id,
    waitlistCycleId: secondCycleId,
  });
  assert.equal(currentContext.state, "READY");
});

scenario(
  "waitlist_promotion_transaction_rolls_back_candidate_when_job_write_fails",
  async (ctx) => {
    const creator = await givenUser("waitlist-handoff-debt-creator");
    const joiner = await givenUser("waitlist-handoff-debt-joiner");
    const candidate = await givenUser("waitlist-handoff-debt-candidate");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 2,
      expectedCreatedStatus: "OPEN",
    });

    ctx.record("prId", pr.id);
    ctx.record("candidateUserId", candidate.user.id);

    await joinPartnerRequest({ pr, user: joiner });
    await waitlistPR({ pr, user: candidate });
    await expectPendingWaitlistCount(pr, 1);

    const joinedSlot = await partnerRepo.findActiveByPrIdAndUserId(pr.id, joiner.user.id);
    assert.ok(joinedSlot);
    await partnerRepo.updateStatus(joinedSlot.id, "EXITED");
    const candidateSlot = await partnerRepo.findPendingByPrIdAndUserId(pr.id, candidate.user.id);
    assert.ok(candidateSlot);
    const reliabilityBefore = await userReliabilityRepo.findByUserId(candidate.user.id);

    const promotion = createWaitlistPromotionTransactionPort({
      createNotificationPort: () => ({
        request: async () => {
          throw new Error("INJECTED_TRANSACTION_NOTIFICATION_WRITE_FAILURE");
        },
      }),
    });
    await assert.rejects(
      promotion.promote({
        prId: pr.id,
        partnerId: candidateSlot.id,
        userId: candidate.user.id,
      }),
      /INJECTED_TRANSACTION_NOTIFICATION_WRITE_FAILURE/,
    );

    await expectPartnerSlotStatus({
      pr,
      user: candidate,
      status: "PENDING",
    });
    const candidateAfterRollback = await partnerRepo.findPendingByPrIdAndUserId(
      pr.id,
      candidate.user.id,
    );
    assert.ok(candidateAfterRollback);
    assert.equal(candidateAfterRollback.waitlistCycleId, candidateSlot.waitlistCycleId);
    const reliabilityAfter = await userReliabilityRepo.findByUserId(candidate.user.id);
    assert.deepEqual(reliabilityAfter, reliabilityBefore);
    assert.ok(candidateSlot.waitlistCycleId);
    const failedCause = `partner_request:${pr.id}:waitlist-promotion:${candidateSlot.id}:${candidateSlot.waitlistCycleId}`;
    const failedJobs = (
      await db.select().from(jobs).where(eq(jobs.jobType, "notification.send.v1"))
    ).filter((job) => job.payload.causationId === failedCause);
    assert.equal(failedJobs.length, 0);
  },
);

scenario("waitlist_promoted_credit_consumption_preserves_preference_until_cleared", async (ctx) => {
  const user = await givenUser("waitlist-credit-transition");
  ctx.record("userId", user.user.id);

  await userNotificationOptRepo.addOneWechatNotificationCredit(user.user.id, "WAITLIST_PROMOTED");
  const optedIn = await userNotificationOptRepo.findByUserId(user.user.id);
  assert.ok(optedIn);
  assert.equal(optedIn.wechatWaitlistPromotedRemainingCount, 1);
  assert.equal(optedIn.wechatWaitlistPromotedOptIn, true);

  const consumed =
    await userNotificationOptRepo.consumeOneWechatWaitlistPromotedCreditPreservingPreference(
      user.user.id,
    );
  assert.equal(consumed.consumed, true);
  assert.equal(consumed.remainingCount, 0);

  const preserved = await userNotificationOptRepo.findByUserId(user.user.id);
  assert.ok(preserved);
  assert.equal(preserved.wechatWaitlistPromotedRemainingCount, 0);
  assert.equal(preserved.wechatWaitlistPromotedOptIn, true);

  await userNotificationOptRepo.clearWechatNotificationCredits(user.user.id, "WAITLIST_PROMOTED");
  const cleared = await userNotificationOptRepo.findByUserId(user.user.id);
  assert.ok(cleared);
  assert.equal(cleared.wechatWaitlistPromotedRemainingCount, 0);
  assert.equal(cleared.wechatWaitlistPromotedOptIn, false);
});

scenario("waitlist_promoted_owner_dispatch_consumes_or_clears_real_credit", async (ctx) => {
  const creator = await givenUser("waitlist-owner-dispatch-creator");
  const joiner = await givenUser("waitlist-owner-dispatch-joiner");
  const candidate = await givenUser("waitlist-owner-dispatch-candidate");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
    title: "Owner dispatch waitlist promotion",
  });
  ctx.record("prId", pr.id);
  ctx.record("candidateUserId", candidate.user.id);

  await bindScenarioWeChatOpenId({
    user: candidate,
    openId: "openid-waitlist-owner-dispatch-candidate",
  });
  await userNotificationOptRepo.addOneWechatNotificationCredit(
    candidate.user.id,
    "WAITLIST_PROMOTED",
  );
  await joinPartnerRequest({ pr, user: joiner });
  await waitlistPR({ pr, user: candidate });
  await exitPR({ pr, user: joiner });
  await expectPartnerSlotStatus({ pr, user: candidate, status: "JOINED" });

  const promotedPartner = await partnerRepo.findActiveByPrIdAndUserId(pr.id, candidate.user.id);
  assert.ok(promotedPartner);
  assert.ok(promotedPartner.waitlistCycleId);
  const task = {
    schemaVersion: 1,
    template: "pr.waitlist-promoted",
    recipientUserId: candidate.user.id,
    channel: "WECHAT_SUBSCRIPTION",
    payload: {
      prId: pr.id,
      partnerId: promotedPartner.id,
      waitlistCycleId: promotedPartner.waitlistCycleId,
    },
    aggregate: { type: "partner_request", id: String(pr.id) },
    causationId: `partner_request:${pr.id}:waitlist-promotion:${promotedPartner.id}:${promotedPartner.waitlistCycleId}`,
  } as const;

  let acceptedMessage: Parameters<NotificationChannelPort["send"]>[0] | null = null;
  const acceptedOwner = createNotificationOwnerRuntime({
    channel: {
      async send(message) {
        acceptedMessage = message;
        return { outcome: "ACCEPTED", providerReference: "fake-provider-accepted" };
      },
    },
  });
  const accepted = await acceptedOwner.dispatch(task);
  assert.equal(accepted.disposition, "SUCCEEDED");
  assert.equal(accepted.reason, "CHANNEL_ACCEPTED");
  assert.equal(accepted.providerReference, "fake-provider-accepted");
  assert.ok(acceptedMessage);
  assert.equal(acceptedMessage.channel, "WECHAT_SUBSCRIPTION");
  assert.equal(acceptedMessage.template, "pr.waitlist-promoted");
  assert.equal(acceptedMessage.recipientChannelAddress, "openid-waitlist-owner-dispatch-candidate");
  assert.equal(acceptedMessage.content.title, "Owner dispatch waitlist promotion");
  assert.equal(acceptedMessage.content.status, "候补成功");
  assert.equal(acceptedMessage.content.remark, "已为你保留名额");
  assert.equal(typeof acceptedMessage.content.page, "string");
  assert.equal(acceptedMessage.content.page?.endsWith(`/pr/${pr.id}`), true);

  const consumed = await userNotificationOptRepo.findByUserId(candidate.user.id);
  assert.ok(consumed);
  assert.equal(consumed.wechatWaitlistPromotedRemainingCount, 0);
  assert.equal(consumed.wechatWaitlistPromotedOptIn, true);

  await userNotificationOptRepo.addOneWechatNotificationCredit(
    candidate.user.id,
    "WAITLIST_PROMOTED",
  );
  const revokedOwner = createNotificationOwnerRuntime({
    channel: {
      async send() {
        return {
          outcome: "RECIPIENT_PERMISSION_REVOKED",
          errorCode: "43101",
          errorMessage: "fake revoked recipient permission",
        };
      },
    },
  });
  const revoked = await revokedOwner.dispatch(task);
  assert.equal(revoked.disposition, "PERMANENT_FAILURE");
  assert.equal(revoked.reason, "RECIPIENT_PERMISSION_REVOKED");

  const cleared = await userNotificationOptRepo.findByUserId(candidate.user.id);
  assert.ok(cleared);
  assert.equal(cleared.wechatWaitlistPromotedRemainingCount, 0);
  assert.equal(cleared.wechatWaitlistPromotedOptIn, false);
});

scenario("waitlist_cancel_removes_pending_slot_from_fifo_promotion", async (ctx) => {
  const creator = await givenUser("waitlist-cancel-creator");
  const joiner = await givenUser("waitlist-cancel-joiner");
  const firstCandidate = await givenUser("waitlist-cancel-first");
  const secondCandidate = await givenUser("waitlist-cancel-second");
  const thirdCandidate = await givenUser("waitlist-cancel-third");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
  });

  ctx.record("prId", pr.id);
  ctx.record("firstCandidateUserId", firstCandidate.user.id);
  ctx.record("secondCandidateUserId", secondCandidate.user.id);
  ctx.record("thirdCandidateUserId", thirdCandidate.user.id);

  const joined = await joinPartnerRequest({ pr, user: joiner });
  assert.equal(joined.status, "OPEN");
  await expectPartnerRequestStatus(pr, "OPEN");
  await expectActiveParticipantCount(pr, 2);

  await waitlistPR({ pr, user: firstCandidate });
  await waitlistPR({ pr, user: secondCandidate });
  await waitlistPR({ pr, user: thirdCandidate });

  await expectViewerWaitlisted({ pr, user: firstCandidate, rank: 1 });
  await expectViewerWaitlisted({ pr, user: secondCandidate, rank: 2 });
  await expectViewerWaitlisted({ pr, user: thirdCandidate, rank: 3 });
  await expectPendingWaitlistCount(pr, 3);

  const cancelResult = await cancelWaitlistPR({
    pr,
    user: firstCandidate,
  });
  assert.equal(cancelResult.status, "OPEN");

  const firstAfterCancel = await getWaitlistDetail({
    pr,
    user: firstCandidate,
  });
  assert.equal(firstAfterCancel.partnerSection.viewer.isWaitlisted, false);
  assert.equal(firstAfterCancel.partnerSection.viewer.waitlistRank, null);
  assert.equal(firstAfterCancel.partnerSection.viewer.slotState, "NOT_JOINED");
  assert.equal(firstAfterCancel.partnerSection.viewer.pendingPartnerId, null);
  assert.equal(firstAfterCancel.partnerSection.viewer.canWaitlist, true);
  await expectPartnerSlotStatus({
    pr,
    user: firstCandidate,
    status: "CANCELLED",
  });
  await expectViewerWaitlisted({ pr, user: secondCandidate, rank: 1 });
  await expectViewerWaitlisted({ pr, user: thirdCandidate, rank: 2 });
  await expectPendingWaitlistCount(pr, 2);
  expectMessageThreadForbidden(await probeMessageThreadVisibility({ pr, viewer: firstCandidate }));

  await exitPR({ pr, user: joiner });

  await expectPartnerRequestStatus(pr, "OPEN");
  await expectActiveParticipantCount(pr, 2);
  await expectActiveParticipantsInclude(pr, [creator.user.id, secondCandidate.user.id]);
  await expectPartnerSlotStatus({
    pr,
    user: firstCandidate,
    status: "CANCELLED",
  });
  await expectPartnerSlotStatus({
    pr,
    user: secondCandidate,
    status: "JOINED",
  });
  await expectPartnerSlotStatus({
    pr,
    user: thirdCandidate,
    status: "PENDING",
  });
  await expectViewerWaitlisted({ pr, user: thirdCandidate, rank: 1 });
  expectMessageThreadVisible(await probeMessageThreadVisibility({ pr, viewer: secondCandidate }));
  expectMessageThreadForbidden(await probeMessageThreadVisibility({ pr, viewer: firstCandidate }));
  expectMessageThreadForbidden(await probeMessageThreadVisibility({ pr, viewer: thirdCandidate }));
});

scenario("cross_pr_waitlist_alternative_dispatch_requires_slot_opt_in", async (ctx) => {
  const sourceCreator = await givenUser("cross-alt-source-creator");
  const sourceJoiner = await givenUser("cross-alt-source-joiner");
  const alternativeCreator = await givenUser("cross-alt-alt-creator");
  const candidate = await givenUser("cross-alt-candidate");
  const sourcePr = await givenPublishedPartnerRequest({
    creator: sourceCreator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
    title: "Cross alternative source",
  });
  const alternativePr = await givenPublishedPartnerRequest({
    creator: alternativeCreator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
    title: "Cross alternative candidate",
  });

  ctx.record("sourcePrId", sourcePr.id);
  ctx.record("alternativePrId", alternativePr.id);
  ctx.record("candidateUserId", candidate.user.id);

  const joined = await joinPartnerRequest({
    pr: sourcePr,
    user: sourceJoiner,
  });
  assert.equal(joined.status, "OPEN");

  await waitlistPR({
    pr: sourcePr,
    user: candidate,
    alternativePrReminderOptIn: true,
  });
  const sourceDetail = await getWaitlistDetail({
    pr: sourcePr,
    user: candidate,
  });
  const sourcePartnerId = requirePendingPartnerId(
    sourceDetail.partnerSection.viewer.pendingPartnerId,
  );
  const sourceSlot = await partnerRepo.findById(sourcePartnerId);
  assert.ok(sourceSlot?.waitlistCycleId, "Expected current source waitlist cycle");
  ctx.record("sourcePartnerId", sourcePartnerId);

  const sourceSlots = await partnerRepo.listPendingAlternativeReminderSlotsByTypeAndLocation({
    type: "badminton",
    location: "Scenario Court",
    excludePrId: alternativePr.id,
  });
  assert.ok(
    sourceSlots.some((slot) => slot.partnerId === sourcePartnerId),
    "Expected opted-in waitlist slot to be eligible as an alternative reminder source",
  );

  const context = await getWaitlistAlternativeAvailableNotificationContext({
    sourcePrId: sourcePr.id,
    sourcePartnerId,
    sourceWaitlistCycleId: sourceSlot.waitlistCycleId,
    candidatePrId: alternativePr.id,
    recipientUserId: candidate.user.id,
  });
  assert.equal(context.state, "READY");
  if (context.state === "READY") {
    assert.equal(context.title, "Cross alternative candidate");
  }

  await joinPartnerRequest({ pr: alternativePr, user: candidate });

  await expectPartnerSlotStatus({
    pr: sourcePr,
    user: candidate,
    status: "CANCELLED",
  });
  await expectPartnerSlotStatus({
    pr: alternativePr,
    user: candidate,
    status: "JOINED",
  });
  assert.equal(await probePartnerSlotStatus({ pr: sourcePr, user: candidate }), "CANCELLED");
});

scenario("cross_pr_waitlist_alternative_dispatch_skips_without_slot_opt_in", async (ctx) => {
  const sourceCreator = await givenUser("cross-alt-noopt-source-creator");
  const sourceJoiner = await givenUser("cross-alt-noopt-source-joiner");
  const alternativeCreator = await givenUser("cross-alt-noopt-alt-creator");
  const candidate = await givenUser("cross-alt-noopt-candidate");
  const sourcePr = await givenPublishedPartnerRequest({
    creator: sourceCreator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
    title: "Cross alternative no opt source",
  });
  const alternativePr = await givenPublishedPartnerRequest({
    creator: alternativeCreator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
    title: "Cross alternative no opt candidate",
  });

  ctx.record("sourcePrId", sourcePr.id);
  ctx.record("alternativePrId", alternativePr.id);
  ctx.record("candidateUserId", candidate.user.id);

  await joinPartnerRequest({ pr: sourcePr, user: sourceJoiner });
  await waitlistPR({ pr: sourcePr, user: candidate });
  const sourceDetail = await getWaitlistDetail({
    pr: sourcePr,
    user: candidate,
  });
  const sourcePartnerId = requirePendingPartnerId(
    sourceDetail.partnerSection.viewer.pendingPartnerId,
  );
  const sourceSlot = await partnerRepo.findById(sourcePartnerId);
  assert.ok(sourceSlot?.waitlistCycleId, "Expected current source waitlist cycle");
  ctx.record("sourcePartnerId", sourcePartnerId);

  const sourceSlots = await partnerRepo.listPendingAlternativeReminderSlotsByTypeAndLocation({
    type: "badminton",
    location: "Scenario Court",
    excludePrId: alternativePr.id,
  });
  assert.equal(
    sourceSlots.some((slot) => slot.partnerId === sourcePartnerId),
    false,
  );

  const context = await getWaitlistAlternativeAvailableNotificationContext({
    sourcePrId: sourcePr.id,
    sourcePartnerId,
    sourceWaitlistCycleId: sourceSlot.waitlistCycleId,
    candidatePrId: alternativePr.id,
    recipientUserId: candidate.user.id,
  });
  assert.equal(context.state, "SKIPPED");
  if (context.state !== "READY") {
    assert.equal(context.reason, "SOURCE_WAITLIST_SLOT_NOT_PENDING");
  }
});

scenario("cross_pr_waitlist_alternative_uses_generic_active_job_cycle", async (ctx) => {
  const sourceCreator = await givenUser("cross-alt-generic-source-creator");
  const sourceJoiner = await givenUser("cross-alt-generic-source-joiner");
  const alternativeCreator = await givenUser("cross-alt-generic-alternative-creator");
  const candidate = await givenUser("cross-alt-generic-candidate");
  const sourcePr = await givenPublishedPartnerRequest({
    creator: sourceCreator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
    title: "Generic alternative source",
  });
  const alternativePr = await givenPublishedPartnerRequest({
    creator: alternativeCreator,
    minPartners: 1,
    maxPartners: 2,
    expectedCreatedStatus: "OPEN",
    title: "Generic alternative candidate",
  });
  ctx.record("sourcePrId", sourcePr.id);
  ctx.record("alternativePrId", alternativePr.id);
  ctx.record("candidateUserId", candidate.user.id);

  await joinPartnerRequest({ pr: sourcePr, user: sourceJoiner });
  await bindScenarioWeChatOpenId({
    user: candidate,
    openId: "openid-cross-alt-generic-candidate",
  });
  await userNotificationOptRepo.addOneWechatNotificationCredit(
    candidate.user.id,
    "WAITLIST_ALTERNATIVE_AVAILABLE",
  );

  await waitlistPR({
    pr: sourcePr,
    user: candidate,
    alternativePrReminderOptIn: true,
  });
  const firstSlot = await partnerRepo.findPendingByPrIdAndUserId(sourcePr.id, candidate.user.id);
  assert.ok(firstSlot);
  assert.ok(firstSlot.waitlistCycleId);
  const firstCycleId = firstSlot.waitlistCycleId;
  const firstCause = `partner_request:${sourcePr.id}:waitlist-alternative:${firstSlot.id}:${firstCycleId}:${alternativePr.id}`;

  const firstJobs = (
    await db.select().from(jobs).where(eq(jobs.jobType, "notification.send.v1"))
  ).filter((job) => job.payload.causationId === firstCause);
  assert.equal(firstJobs.length, 1);
  const firstJob = firstJobs[0];
  assert.ok(firstJob);
  assert.equal(firstJob.creationMode, "ONCE");
  assert.equal(firstJob.creationKey, null);
  assert.equal(
    firstJob.dedupeKey,
    `notification-active:pr.waitlist-alternative-available:WECHAT_SUBSCRIPTION:${candidate.user.id}:${firstSlot.id}:${firstCycleId}:${alternativePr.id}:`,
  );
  assert.deepEqual(firstJob.payload, {
    schemaVersion: 1,
    template: "pr.waitlist-alternative-available",
    recipientUserId: candidate.user.id,
    channel: "WECHAT_SUBSCRIPTION",
    payload: {
      sourcePrId: sourcePr.id,
      sourcePartnerId: firstSlot.id,
      sourceWaitlistCycleId: firstCycleId,
      candidatePrId: alternativePr.id,
    },
    aggregate: { type: "partner_request", id: String(sourcePr.id) },
    causationId: firstCause,
  });
  const repeated = await requestNotification({
    template: "pr.waitlist-alternative-available",
    recipientUserId: candidate.user.id,
    channel: "WECHAT_SUBSCRIPTION",
    payload: {
      sourcePrId: sourcePr.id,
      sourcePartnerId: firstSlot.id,
      sourceWaitlistCycleId: firstCycleId,
      candidatePrId: alternativePr.id,
    },
    metadata: {
      aggregate: { type: "partner_request", id: String(sourcePr.id) },
      causationId: firstCause,
    },
  });
  assert.equal(repeated.creation, "COALESCED");

  await cancelWaitlistPR({ pr: sourcePr, user: candidate });
  await waitlistPR({
    pr: sourcePr,
    user: candidate,
    alternativePrReminderOptIn: true,
  });
  const reentered = await partnerRepo.findPendingByPrIdAndUserId(sourcePr.id, candidate.user.id);
  assert.ok(reentered);
  assert.equal(reentered.id, firstSlot.id);
  assert.ok(reentered.waitlistCycleId);
  assert.notEqual(reentered.waitlistCycleId, firstCycleId);
  const secondCycleId = reentered.waitlistCycleId;
  const secondCause = `partner_request:${sourcePr.id}:waitlist-alternative:${reentered.id}:${secondCycleId}:${alternativePr.id}`;
  const cycleJobs = (
    await db.select().from(jobs).where(eq(jobs.jobType, "notification.send.v1"))
  ).filter(
    (job) => job.payload.causationId === firstCause || job.payload.causationId === secondCause,
  );
  assert.equal(cycleJobs.length, 2);

  let staleChannelCalls = 0;
  const staleOwner = createNotificationOwnerRuntime({
    channel: {
      async send() {
        staleChannelCalls += 1;
        return { outcome: "ACCEPTED", providerReference: "unexpected-stale-send" };
      },
    },
  });
  assert.deepEqual(await staleOwner.dispatch(firstJob.payload), {
    disposition: "SKIPPED",
    reason: "SOURCE_WAITLIST_CYCLE_SUPERSEDED",
  });
  assert.equal(staleChannelCalls, 0);
  const preservedCredit = await userNotificationOptRepo.findByUserId(candidate.user.id);
  assert.ok(preservedCredit);
  assert.equal(preservedCredit.wechatWaitlistAlternativeAvailableRemainingCount, 1);

  const currentJob = cycleJobs.find((job) => job.payload.causationId === secondCause);
  assert.ok(currentJob);
  let acceptedMessage: Parameters<NotificationChannelPort["send"]>[0] | null = null;
  const acceptedOwner = createNotificationOwnerRuntime({
    channel: {
      async send(message) {
        acceptedMessage = message;
        return { outcome: "ACCEPTED", providerReference: "generic-alternative-provider-id" };
      },
    },
  });
  assert.deepEqual(await acceptedOwner.dispatch(currentJob.payload), {
    disposition: "SUCCEEDED",
    reason: "CHANNEL_ACCEPTED",
    providerReference: "generic-alternative-provider-id",
  });
  assert.ok(acceptedMessage);
  assert.equal(acceptedMessage.template, "pr.waitlist-alternative-available");
  assert.equal(acceptedMessage.content.title, "Generic alternative candidate");
  assert.equal(acceptedMessage.content.status, "有可加入名额");
  assert.equal(acceptedMessage.content.remark, "同类同地点有其它 PR 可加入");
  assert.equal(acceptedMessage.content.page?.endsWith(`/pr/${alternativePr.id}`), true);

  const consumedCredit = await userNotificationOptRepo.findByUserId(candidate.user.id);
  assert.ok(consumedCredit);
  assert.equal(consumedCredit.wechatWaitlistAlternativeAvailableRemainingCount, 0);
  assert.equal(consumedCredit.wechatWaitlistAlternativeAvailableOptIn, true);
});
