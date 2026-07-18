import assert from "node:assert/strict";
import { requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import { WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND } from "../../src/domains/notification";
import { prepareWaitlistAlternativeAvailableNotificationDispatch } from "../../src/domains/notification/services/waitlist-alternative-available-dispatch.service";
import { PartnerRepository } from "../../src/repositories/PartnerRepository";
import { UserNotificationOptRepository } from "../../src/repositories/UserNotificationOptRepository";
import { exitPR } from "./_kit/actions/exit";
import { joinPartnerRequest } from "./_kit/actions/join";
import { bindScenarioWeChatOpenId } from "./_kit/actions/system-state";
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

  await bindScenarioWeChatOpenId({
    user: candidate,
    openId: "openid-cross-alt-candidate",
  });
  await userNotificationOptRepo.addOneWechatNotificationCredit(
    candidate.user.id,
    WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND,
  );

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

  const prepared = await prepareWaitlistAlternativeAvailableNotificationDispatch({
    sourcePrId: sourcePr.id,
    sourcePartnerId,
    candidatePrId: alternativePr.id,
    recipientUserId: candidate.user.id,
  });
  assert.equal(prepared.status, "READY");
  if (prepared.status === "READY") {
    assert.equal(prepared.message.status, "有可加入名额");
    assert.equal(prepared.message.remark, "同类同地点有其它 PR 可加入");
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
  await bindScenarioWeChatOpenId({
    user: candidate,
    openId: "openid-cross-alt-noopt-candidate",
  });
  await userNotificationOptRepo.addOneWechatNotificationCredit(
    candidate.user.id,
    WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND,
  );

  await waitlistPR({ pr: sourcePr, user: candidate });
  const sourceDetail = await getWaitlistDetail({
    pr: sourcePr,
    user: candidate,
  });
  const sourcePartnerId = requirePendingPartnerId(
    sourceDetail.partnerSection.viewer.pendingPartnerId,
  );
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

  const prepared = await prepareWaitlistAlternativeAvailableNotificationDispatch({
    sourcePrId: sourcePr.id,
    sourcePartnerId,
    candidatePrId: alternativePr.id,
    recipientUserId: candidate.user.id,
  });
  assert.equal(prepared.status, "SKIPPED");
  if (prepared.status !== "READY") {
    assert.equal(prepared.errorCode, "SOURCE_WAITLIST_SLOT_NOT_PENDING");
  }
});
