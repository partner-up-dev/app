import assert from "node:assert/strict";
import { type PartnerRequestFields, partnerRequests } from "../../src/entities";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import { scenario } from "../_infra/scenario/scenario";
import { givenUser } from "./_kit/builders/users";

type ProblemDetailsResponse = {
  code?: string;
};

const buildPastTimeWindow = (): [string, string] => {
  const startAt = new Date(Date.now() - 60 * 60 * 1000);
  const endAt = new Date(Date.now() + 60 * 60 * 1000);
  return [startAt.toISOString(), endAt.toISOString()];
};

const buildFields = (): PartnerRequestFields => ({
  title: "Scenario past PR create",
  type: "badminton",
  time: buildPastTimeWindow(),
  location: "Scenario Past Court",
  route: null,
  minPartners: 2,
  maxPartners: null,
  partners: [],
  budget: null,
  preferences: [],
  notes: null,
  meetingPoint: null,
});

scenario("structured_pr_create_rejects_past_start_time", async (ctx) => {
  const creator = await givenUser("past-create-creator");
  const before = await getTestDb().select().from(partnerRequests);
  ctx.record("creatorUserId", creator.user.id);

  const response = await requestJson("/api/pr/new/form", {
    method: "POST",
    token: creator.token,
    body: {
      fields: buildFields(),
      createSource: "STRUCTURED_FORM",
    },
  });

  assert.match(response.headers.get("content-type") ?? "", /^application\/problem\+json/);
  const body = await expectJsonResponse<ProblemDetailsResponse>(response, 400);
  assert.equal(body.code, "PR_START_TIME_PASSED");

  const after = await getTestDb().select().from(partnerRequests);
  assert.equal(after.length, before.length);
});
