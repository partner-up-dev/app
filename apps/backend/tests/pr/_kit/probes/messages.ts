import { requestJson } from "../../../_infra/http/backend-app";
import type { ScenarioPartnerRequest } from "../builders/partner-requests";
import type { ScenarioUser } from "../builders/users";

export type MessageThreadVisibilityProbe = {
  httpStatus: number;
};

export async function probeMessageThreadVisibility(input: {
  pr: ScenarioPartnerRequest;
  viewer: ScenarioUser;
}): Promise<MessageThreadVisibilityProbe> {
  const response = await requestJson(`/api/pr/${input.pr.id}/messages`, {
    method: "GET",
    token: input.viewer.token,
  });

  return {
    httpStatus: response.status,
  };
}
