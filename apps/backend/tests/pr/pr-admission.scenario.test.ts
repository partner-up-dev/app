import assert from "node:assert/strict";
import { requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import { setTestUserStatus } from "../_infra/actions/user-state";
import { promoteWaitlistedPartners } from "../../src/domains/pr/services/waitlist.service";
import { PartnerRepository } from "../../src/repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";
import { UserReliabilityRepository } from "../../src/repositories/UserReliabilityRepository";
import { joinPartnerRequest } from "./_kit/actions/join";
import { waitlistPR } from "./_kit/actions/waitlist";
import {
  buildScenarioFields,
  givenDraftPR,
  givenPersistedPartnerRequest,
  givenPublishedPartnerRequest,
} from "./_kit/builders/partner-requests";
import { givenUser } from "./_kit/builders/users";

const partnerRepo = new PartnerRepository();
const prRepo = new PartnerRequestRepository();
const userReliabilityRepo = new UserReliabilityRepository();

const joinRequest = (input: { prId: number; token: string }): Promise<Response> =>
  requestJson(`/api/pr/${input.prId}/join`, {
    method: "POST",
    token: input.token,
    body: {},
  });

scenario("pr_admission_parallel_direct_joins_preserve_final_capacity", async (ctx) => {
  const creator = await givenUser("admission-race-creator");
  const firstCandidate = await givenUser("admission-race-first");
  const secondCandidate = await givenUser("admission-race-second");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 2,
    title: "Admission parallel direct join",
  });
  ctx.record("prId", pr.id);

  const responses = await Promise.all([
    joinRequest({ prId: pr.id, token: firstCandidate.token }),
    joinRequest({ prId: pr.id, token: secondCandidate.token }),
  ]);
  const statuses = responses.map((response) => response.status).sort((left, right) => left - right);
  assert.deepEqual(statuses, [200, 400]);

  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(pr.id);
  assert.equal(activeParticipants.length, 2);
  const admittedCandidates = activeParticipants.filter(
    (participant) =>
      participant.userId === firstCandidate.user.id ||
      participant.userId === secondCandidate.user.id,
  );
  assert.equal(admittedCandidates.length, 1);
  ctx.record("responseStatuses", statuses);
  ctx.record("admittedUserId", admittedCandidates[0]?.userId ?? null);
});

scenario(
  "pr_admission_pending_eligible_candidate_wins_over_concurrent_direct_join",
  async (ctx) => {
    const creator = await givenUser("admission-priority-creator");
    const filler = await givenUser("admission-priority-filler");
    const pendingCandidate = await givenUser("admission-priority-pending");
    const directCandidate = await givenUser("admission-priority-direct");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 2,
      title: "Admission waitlist priority",
    });
    ctx.record("prId", pr.id);

    await joinPartnerRequest({ pr, user: filler });
    await waitlistPR({ pr, user: pendingCandidate });
    const fillerSlot = await partnerRepo.findActiveByPrIdAndUserId(pr.id, filler.user.id);
    assert.ok(fillerSlot);
    await partnerRepo.updateStatus(fillerSlot.id, "EXITED");

    const [, directResponse] = await Promise.all([
      promoteWaitlistedPartners(pr.id),
      joinRequest({ prId: pr.id, token: directCandidate.token }),
    ]);
    assert.notEqual(directResponse.status, 200);
    assert.ok(directResponse.status === 400 || directResponse.status === 409);

    const pendingSlotAfter = await partnerRepo.findActiveByPrIdAndUserId(
      pr.id,
      pendingCandidate.user.id,
    );
    assert.ok(pendingSlotAfter);
    assert.equal(await partnerRepo.findActiveByPrIdAndUserId(pr.id, directCandidate.user.id), null);
    assert.equal(await partnerRepo.countActiveByPrId(pr.id), 2);
    ctx.record("directResponseStatus", directResponse.status);
    ctx.record("promotedPartnerId", pendingSlotAfter.id);
  },
);

scenario("pr_admission_ineligible_waitlist_head_does_not_block_direct_join", async (ctx) => {
  const creator = await givenUser("admission-ineligible-creator");
  const filler = await givenUser("admission-ineligible-filler");
  const pendingCandidate = await givenUser("admission-ineligible-pending");
  const directCandidate = await givenUser("admission-ineligible-direct");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 2,
    title: "Admission ineligible waitlist head",
  });
  ctx.record("prId", pr.id);

  await joinPartnerRequest({ pr, user: filler });
  await waitlistPR({ pr, user: pendingCandidate });
  await setTestUserStatus({ userId: pendingCandidate.user.id, status: "DISABLED" });
  const fillerSlot = await partnerRepo.findActiveByPrIdAndUserId(pr.id, filler.user.id);
  assert.ok(fillerSlot);
  await partnerRepo.updateStatus(fillerSlot.id, "EXITED");

  const response = await joinRequest({ prId: pr.id, token: directCandidate.token });
  assert.equal(response.status, 200);
  assert.ok(await partnerRepo.findActiveByPrIdAndUserId(pr.id, directCandidate.user.id));
  assert.ok(await partnerRepo.findPendingByPrIdAndUserId(pr.id, pendingCandidate.user.id));
  assert.equal(await partnerRepo.countActiveByPrId(pr.id), 2);
  ctx.record("directResponseStatus", response.status);
});

scenario(
  "pr_admission_parallel_publish_has_one_creator_slot_and_reliability_delta",
  async (ctx) => {
    const creator = await givenUser("admission-publish-creator");
    const pr = await givenDraftPR({ creator, title: "Admission atomic publish" });
    ctx.record("prId", pr.id);

    const responses = await Promise.all([
      requestJson(`/api/pr/${pr.id}/publish`, { method: "POST", token: creator.token }),
      requestJson(`/api/pr/${pr.id}/publish`, { method: "POST", token: creator.token }),
    ]);
    const statuses = responses
      .map((response) => response.status)
      .sort((left, right) => left - right);
    assert.deepEqual(statuses, [200, 400]);

    const persisted = await prRepo.findById(pr.id);
    assert.ok(persisted);
    assert.equal(persisted.status, "OPEN");
    assert.equal(persisted.createdBy, creator.user.id);
    const creatorSlot = await partnerRepo.findActiveByPrIdAndUserId(pr.id, creator.user.id);
    assert.ok(creatorSlot);
    assert.equal(await partnerRepo.countActiveByPrId(pr.id), 1);
    const reliability = await userReliabilityRepo.findByUserId(creator.user.id);
    assert.ok(reliability);
    assert.equal(reliability.reliabilityJoinCount, 1);
    ctx.record("responseStatuses", statuses);
    ctx.record("creatorSlotId", creatorSlot.id);
  },
);

scenario("pr_admission_atomic_reliability_deltas_retain_parallel_increments", async (ctx) => {
  const user = await givenUser("admission-reliability-race");
  await Promise.all([
    userReliabilityRepo.applyDelta(user.user.id, { joined: 1, confirmed: 1 }),
    userReliabilityRepo.applyDelta(user.user.id, { joined: 1, confirmed: 1 }),
  ]);

  const reliability = await userReliabilityRepo.findByUserId(user.user.id);
  assert.ok(reliability);
  assert.equal(reliability.reliabilityJoinCount, 2);
  assert.equal(reliability.reliabilityConfirmCount, 2);
  assert.equal(reliability.joinToConfirmRatio, 1);
  ctx.record("userId", user.user.id);
});

scenario("pr_content_release_promotes_waitlist_after_persisting_the_new_time", async (ctx) => {
  const creator = await givenUser("admission-content-creator");
  const joinedParticipant = await givenUser("admission-content-joined");
  const pendingCandidate = await givenUser("admission-content-pending");
  const conflictCreator = await givenUser("admission-content-conflict-creator");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: 2,
    title: "Admission content release source",
  });
  await joinPartnerRequest({ pr, user: joinedParticipant });
  await waitlistPR({ pr, user: pendingCandidate });

  const conflictFields = {
    ...buildScenarioFields("Admission content conflict"),
    time: ["2030-01-02T10:00:00.000Z", "2030-01-02T12:00:00.000Z"] as [string, string],
    minPartners: 1,
    maxPartners: null,
  };
  const conflictPr = await givenPersistedPartnerRequest({
    creator: conflictCreator,
    fields: conflictFields,
    status: "OPEN",
  });
  await joinPartnerRequest({ pr: conflictPr, user: joinedParticipant });

  const response = await requestJson(`/api/pr/${pr.id}/content`, {
    method: "PATCH",
    token: creator.token,
    body: {
      allowRelease: true,
      fields: {
        title: "Admission content release source",
        time: conflictFields.time,
        location: "Scenario Court",
        route: null,
        minPartners: 1,
        maxPartners: 2,
        partners: [],
        budget: null,
        preferences: [],
        notes: null,
        meetingPoint: null,
      },
    },
  });
  assert.equal(response.status, 200);

  const releasedSlot = await partnerRepo.findByPrId(pr.id);
  assert.equal(
    releasedSlot.find((slot) => slot.userId === joinedParticipant.user.id)?.status,
    "RELEASED",
  );
  assert.ok(await partnerRepo.findActiveByPrIdAndUserId(pr.id, pendingCandidate.user.id));
  assert.equal(await partnerRepo.countActiveByPrId(pr.id), 2);
  ctx.record("prId", pr.id);
  ctx.record("conflictPrId", conflictPr.id);
});
