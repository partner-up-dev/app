import assert from "node:assert/strict";
import { scenario } from "../_infra/scenario/scenario";
import { exitPR } from "./_kit/actions/exit";
import { joinPartnerRequest } from "./_kit/actions/join";
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
  buildScenarioFields,
  givenPublishedPartnerRequest,
  type ScenarioPartnerRequest,
} from "./_kit/builders/partner-requests";
import { givenUser } from "./_kit/builders/users";
import { probeMessageThreadVisibility } from "./_kit/probes/messages";
import { probePartnerRequestCreationState } from "./_kit/probes/partner-requests";
import { PartnerRequestRepository } from "../../src/repositories/PartnerRequestRepository";
import { initializeSlotsForPR } from "../../src/domains/pr-core/services/slot-management.service";

const prRepo = new PartnerRequestRepository();

async function givenCreatorlessOpenPartnerRequest(
  title: string,
): Promise<ScenarioPartnerRequest> {
  const fields = buildScenarioFields(title);
  const request = await prRepo.create({
    title: fields.title,
    type: fields.type,
    time: fields.time,
    location: fields.location,
    route: fields.route,
    minPartners: fields.minPartners,
    maxPartners: fields.maxPartners,
    budget: fields.budget,
    preferences: fields.preferences,
    notes: fields.notes,
    meetingPoint: fields.meetingPoint ?? null,
    joinGateConfig: [],
    status: "OPEN",
    createdBy: null,
  });
  await initializeSlotsForPR(request.id, null);
  return { id: request.id };
}

scenario("open_pr_join_keeps_pr_open_after_min_partners", async (ctx) => {
  const creator = await givenUser("creator");
  const joiner = await givenUser("joiner");
  const outsider = await givenUser("outsider");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 2,
    maxPartners: null,
  });

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("joinerUserId", joiner.user.id);
  ctx.record("outsiderUserId", outsider.user.id);
  ctx.record("prId", pr.id);

  await expectPartnerRequestStatus(pr, "OPEN");
  await expectActiveParticipantCount(pr, 1);
  await expectActiveParticipantsInclude(pr, [creator.user.id]);

  const joined = await joinPartnerRequest({ pr, user: joiner });
  ctx.record("joinResponseStatus", joined.status);
  ctx.record("joinResponsePartners", joined.partners);

  assert.equal(
    joined.status,
    "OPEN",
    `Expected join response to expose OPEN, got ${joined.status}`,
  );
  await expectPartnerRequestStatus(pr, "OPEN");
  await expectActiveParticipantCount(pr, 2);
  await expectActiveParticipantsInclude(pr, [creator.user.id, joiner.user.id]);

  const duplicateJoin = await joinPartnerRequest({ pr, user: joiner });
  ctx.record("duplicateJoinResponsePartners", duplicateJoin.partners);
  await expectActiveParticipantCount(pr, 2);

  expectMessageThreadVisible(
    await probeMessageThreadVisibility({ pr, viewer: creator }),
  );
  expectMessageThreadVisible(
    await probeMessageThreadVisibility({ pr, viewer: joiner }),
  );
  expectMessageThreadForbidden(
    await probeMessageThreadVisibility({ pr, viewer: outsider }),
  );
});

scenario("min_one_pr_publishes_open_with_creator_slot", async (ctx) => {
  const creator = await givenUser("min-one-creator");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: null,
    expectedCreatedStatus: "OPEN",
  });

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("prId", pr.id);

  await expectPartnerRequestStatus(pr, "OPEN");
  await expectActiveParticipantCount(pr, 1);
  await expectActiveParticipantsInclude(pr, [creator.user.id]);
});

scenario("creatorless_open_pr_first_join_claims_current_creator", async (ctx) => {
  const joiner = await givenUser("creatorless-first-joiner");
  const pr = await givenCreatorlessOpenPartnerRequest(
    "Creatorless first join current creator",
  );

  ctx.record("joinerUserId", joiner.user.id);
  ctx.record("prId", pr.id);

  const beforeJoin = await probePartnerRequestCreationState(pr.id);
  assert.equal(beforeJoin.createdBy, null);

  const joined = await joinPartnerRequest({ pr, user: joiner });
  assert.equal(joined.createdBy, joiner.user.id);
  await expectActiveParticipantCount(pr, 1);

  const afterJoin = await probePartnerRequestCreationState(pr.id);
  assert.equal(afterJoin.createdBy, joiner.user.id);
});

scenario("current_creator_exit_hands_off_to_earliest_remaining_active", async (ctx) => {
  const creator = await givenUser("creator-handoff-creator");
  const joiner = await givenUser("creator-handoff-joiner");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: null,
    expectedCreatedStatus: "OPEN",
  });

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("joinerUserId", joiner.user.id);
  ctx.record("prId", pr.id);

  await joinPartnerRequest({ pr, user: joiner });
  await exitPR({ pr, user: creator });

  await expectActiveParticipantCount(pr, 1);
  await expectActiveParticipantsInclude(pr, [joiner.user.id]);

  const afterExit = await probePartnerRequestCreationState(pr.id);
  assert.equal(afterExit.createdBy, joiner.user.id);
});

scenario("last_current_creator_exit_clears_created_by", async (ctx) => {
  const joiner = await givenUser("creatorless-last-exit-joiner");
  const pr = await givenCreatorlessOpenPartnerRequest(
    "Creatorless last current creator exit",
  );

  ctx.record("joinerUserId", joiner.user.id);
  ctx.record("prId", pr.id);

  await joinPartnerRequest({ pr, user: joiner });
  await exitPR({ pr, user: joiner });

  await expectActiveParticipantCount(pr, 0);

  const afterExit = await probePartnerRequestCreationState(pr.id);
  assert.equal(afterExit.createdBy, null);
});
