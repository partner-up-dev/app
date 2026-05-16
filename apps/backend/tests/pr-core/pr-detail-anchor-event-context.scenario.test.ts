import assert from "node:assert/strict";
import { scenario } from "../_infra/scenario/scenario";
import {
  expectJsonResponse,
  requestJson,
} from "../_infra/http/backend-app";
import {
  givenAnchorEvent,
  givenAnchorEventVisiblePR,
} from "../anchor-event/_kit/builders/anchor-events";
import { givenUser } from "./_kit/builders/users";

type PRDetailAnchorEventContextProbe = {
  anchorEventContext: {
    id: number;
    title: string;
    betaGroupQrCode: string | null;
  } | null;
};

const readPRDetail = async (input: {
  prId: number;
  token: string;
}): Promise<PRDetailAnchorEventContextProbe> =>
  expectJsonResponse<PRDetailAnchorEventContextProbe>(
    await requestJson(`/api/pr/${input.prId}`, {
      method: "GET",
      token: input.token,
    }),
    200,
  );

scenario("pr_detail_projects_anchor_event_beta_group_context", async (ctx) => {
  const creator = await givenUser("pr-detail-beta-group-creator");
  const event = await givenAnchorEvent({
    label: "pr-detail-beta-group",
    betaGroupQrCode: "https://example.com/event-beta-group.png",
  });
  const pr = await givenAnchorEventVisiblePR({
    creator,
    event,
    title: "Scenario PR with beta group context",
  });

  ctx.record("eventId", event.id);
  ctx.record("prId", pr.id);

  const detail = await readPRDetail({
    prId: pr.id,
    token: creator.token,
  });

  assert.deepEqual(detail.anchorEventContext, {
    id: event.id,
    title: event.title,
    betaGroupQrCode: "https://example.com/event-beta-group.png",
  });
});
