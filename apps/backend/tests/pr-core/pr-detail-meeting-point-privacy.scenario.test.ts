import assert from "node:assert/strict";
import { scenario } from "../_infra/scenario/scenario";
import {
  expectJsonResponse,
  requestJson,
} from "../_infra/http/backend-app";
import type { PRMeetingPointVisibility } from "../../src/domains/pr/read-models/get-pr-detail";
import type { EffectiveMeetingPoint } from "../../src/domains/pr/services";
import type { PRStatus } from "../../src/entities";
import {
  configurePRMeetingPoint,
  configurePRStatus,
} from "./_kit/actions/system-state";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenUser } from "./_kit/builders/users";

type PRDetailMeetingPointProbe = {
  status: PRStatus;
  core: {
    meetingPoint: EffectiveMeetingPoint | null;
    meetingPointVisibility: PRMeetingPointVisibility;
  };
};

const readPRDetail = async (input: {
  prId: number;
  token: string;
}): Promise<PRDetailMeetingPointProbe> =>
  expectJsonResponse<PRDetailMeetingPointProbe>(
    await requestJson(`/api/pr/${input.prId}`, {
      method: "GET",
      token: input.token,
    }),
    200,
  );

scenario(
  "active_pr_meeting_point_is_private_to_active_participants",
  async (ctx) => {
    const creator = await givenUser("meeting-point-private-creator");
    const outsider = await givenUser("meeting-point-private-outsider");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: null,
      expectedCreatedStatus: "OPEN",
      title: "Scenario private meeting point",
    });

    await configurePRMeetingPoint({
      pr,
      meetingPoint: {
        description: "Court 3 glass door",
        imageUrl: "https://example.com/court-3-door.png",
      },
    });
    await configurePRStatus({ pr, status: "ACTIVE" });

    ctx.record("prId", pr.id);
    ctx.record("creatorUserId", creator.user.id);
    ctx.record("outsiderUserId", outsider.user.id);

    const activeParticipantDetail = await readPRDetail({
      prId: pr.id,
      token: creator.token,
    });
    assert.equal(activeParticipantDetail.status, "ACTIVE");
    assert.equal(
      activeParticipantDetail.core.meetingPointVisibility,
      "VISIBLE",
    );
    assert.equal(
      activeParticipantDetail.core.meetingPoint?.description,
      "Court 3 glass door",
    );
    assert.equal(
      activeParticipantDetail.core.meetingPoint?.imageUrl,
      "https://example.com/court-3-door.png",
    );

    const outsiderDetail = await readPRDetail({
      prId: pr.id,
      token: outsider.token,
    });
    assert.equal(outsiderDetail.status, "ACTIVE");
    assert.equal(
      outsiderDetail.core.meetingPointVisibility,
      "ACTIVE_PARTICIPANTS_ONLY",
    );
    assert.equal(outsiderDetail.core.meetingPoint, null);
  },
);
