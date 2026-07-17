import { expectJsonResponse, requestJson } from "../../../_infra/http/backend-app";
import type { PublicPR } from "../../../../src/domains/pr/read-models/public-pr-view.service";
import type { ScenarioPartnerRequest } from "../builders/partner-requests";
import type { ScenarioUser } from "../builders/users";

export async function joinPartnerRequest(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
}): Promise<PublicPR> {
  const response = await requestJson(`/api/pr/${input.pr.id}/join`, {
    method: "POST",
    token: input.user.token,
    body: {},
  });

  return expectJsonResponse<PublicPR>(response, 200);
}
