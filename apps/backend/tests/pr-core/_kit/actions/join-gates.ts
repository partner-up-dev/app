import {
  expectJsonResponse,
  requestJson,
} from "../../../_infra/http/backend-app";
import type { ScenarioPartnerRequest } from "../builders/partner-requests";
import type { ScenarioUser } from "../builders/users";

export type JoinGateProjectionResponse = {
  gates: Array<{
    key: string;
    kind: "JOIN_NOTICE";
    version: string;
    resolved: boolean;
  }>;
};

export async function getJoinGateProjection(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
}): Promise<JoinGateProjectionResponse> {
  return expectJsonResponse<JoinGateProjectionResponse>(
    await requestJson(`/api/pr/${input.pr.id}/join-gates`, {
      method: "GET",
      token: input.user.token,
    }),
    200,
  );
}

export async function resolveJoinNoticeGate(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
  gateKey: string;
  version: string;
  accepted: boolean;
}): Promise<JoinGateProjectionResponse> {
  return expectJsonResponse<JoinGateProjectionResponse>(
    await requestJson(`/api/pr/${input.pr.id}/join-gates/${input.gateKey}/resolve`, {
      method: "POST",
      token: input.user.token,
      body: {
        kind: "JOIN_NOTICE",
        version: input.version,
        accepted: input.accepted,
      },
    }),
    200,
  );
}
