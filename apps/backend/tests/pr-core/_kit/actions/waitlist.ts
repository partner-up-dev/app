import assert from "node:assert/strict";
import { expectJsonResponse, requestJson } from "../../../_infra/http/backend-app";
import type { ScenarioPartnerRequest } from "../builders/partner-requests";
import type { ScenarioUser } from "../builders/users";

export type WaitlistPRResponse = {
  status: string;
  isViewerWaitlisted: boolean;
  myPendingPartnerId: number | null;
};

export async function waitlistPR(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
  alternativePrReminderOptIn?: boolean;
}): Promise<WaitlistPRResponse> {
  const result = await expectJsonResponse<WaitlistPRResponse>(
    await requestJson(`/api/pr/${input.pr.id}/waitlist`, {
      method: "POST",
      token: input.user.token,
      body: {
        alternativePrReminderOptIn: input.alternativePrReminderOptIn === true,
      },
    }),
    200,
  );
  assert.equal(result.isViewerWaitlisted, true);
  assert.notEqual(result.myPendingPartnerId, null);
  return result;
}

export async function cancelWaitlistPR(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
}): Promise<WaitlistPRResponse> {
  const result = await expectJsonResponse<WaitlistPRResponse>(
    await requestJson(`/api/pr/${input.pr.id}/waitlist/cancel`, {
      method: "POST",
      token: input.user.token,
    }),
    200,
  );
  assert.equal(result.isViewerWaitlisted, false);
  assert.equal(result.myPendingPartnerId, null);
  return result;
}
