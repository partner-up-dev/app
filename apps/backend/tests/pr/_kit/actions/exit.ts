import { expectJsonResponse, requestJson } from "../../../_infra/http/backend-app";
import type { ScenarioPartnerRequest } from "../builders/partner-requests";
import type { ScenarioUser } from "../builders/users";

export async function exitPR(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
}): Promise<void> {
  await expectJsonResponse(
    await requestJson(`/api/pr/${input.pr.id}/exit`, {
      method: "POST",
      token: input.user.token,
    }),
    200,
  );
}
