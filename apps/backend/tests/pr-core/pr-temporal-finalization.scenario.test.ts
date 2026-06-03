import assert from "node:assert/strict";
import { scenario } from "../_infra/scenario/scenario";
import {
  expectJsonResponse,
  requestJson,
} from "../_infra/http/backend-app";
import type { PRStatus } from "../../src/entities";
import {
  configureEndedEvent,
  configurePRStatus,
} from "./_kit/actions/system-state";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenUser } from "./_kit/builders/users";
import { probePartnerRequestStatus } from "./_kit/probes/partner-requests";

type PRStatusProbe = {
  status: PRStatus;
};

const readPRStatus = async (input: {
  prId: number;
  token: string;
}): Promise<PRStatus> => {
  const body = await expectJsonResponse<PRStatusProbe>(
    await requestJson(`/api/pr/${input.prId}`, {
      method: "GET",
      token: input.token,
    }),
    200,
  );
  return body.status;
};

scenario(
  "active_pr_auto_closes_after_close_time_when_min_participants_are_met",
  async (ctx) => {
    const creator = await givenUser("temporal-close-creator");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: null,
      expectedCreatedStatus: "OPEN",
      title: "Scenario temporal auto close",
    });

    await configurePRStatus({ pr, status: "ACTIVE" });
    await configureEndedEvent(pr);

    ctx.record("prId", pr.id);
    ctx.record("creatorUserId", creator.user.id);

    const publicStatus = await readPRStatus({
      prId: pr.id,
      token: creator.token,
    });
    assert.equal(publicStatus, "CLOSED");
    assert.equal(await probePartnerRequestStatus(pr.id), "CLOSED");
  },
);

scenario(
  "pr_auto_expires_after_close_time_when_min_participants_are_not_met",
  async (ctx) => {
    const creator = await givenUser("temporal-expire-creator");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 2,
      maxPartners: null,
      expectedCreatedStatus: "OPEN",
      title: "Scenario temporal auto expire",
    });

    await configurePRStatus({ pr, status: "ACTIVE" });
    await configureEndedEvent(pr);

    ctx.record("prId", pr.id);
    ctx.record("creatorUserId", creator.user.id);

    const publicStatus = await readPRStatus({
      prId: pr.id,
      token: creator.token,
    });
    assert.equal(publicStatus, "EXPIRED");
    assert.equal(await probePartnerRequestStatus(pr.id), "EXPIRED");
  },
);
