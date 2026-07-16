import assert from "node:assert/strict";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { scenario } from "../_infra/scenario/scenario";
import {
  givenPRTypeConfig,
  givenPRTypeVisiblePR,
} from "../pr-discovery/_kit/builders/pr-type-config";
import { givenUser } from "./_kit/builders/users";

type PRDetailTypePresentationProbe = {
  core: {
    type: string;
  };
  share: {
    canonical: {
      title: string;
    };
  };
};

const readPRDetail = async (input: {
  prId: number;
  token: string;
}): Promise<PRDetailTypePresentationProbe> =>
  expectJsonResponse<PRDetailTypePresentationProbe>(
    await requestJson(`/api/pr/${input.prId}`, {
      method: "GET",
      token: input.token,
    }),
    200,
  );

scenario("pr_detail_uses_pr_type_as_its_type_presentation_authority", async (ctx) => {
  const creator = await givenUser("pr-detail-type-presentation-creator");
  const prType = await givenPRTypeConfig({ label: "pr-detail-type-presentation" });
  const pr = await givenPRTypeVisiblePR({
    creator,
    prType,
    title: "   ",
  });

  ctx.record("type", prType.type);
  ctx.record("prId", pr.id);

  const detail = await readPRDetail({
    prId: pr.id,
    token: creator.token,
  });

  assert.equal(detail.core.type, prType.type);
  assert.equal(detail.share.canonical.title, prType.type);
});
