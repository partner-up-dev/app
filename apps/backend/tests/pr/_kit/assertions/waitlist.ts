import assert from "node:assert/strict";
import type { PartnerStatus } from "../../../../src/entities/partner";
import type { ScenarioPartnerRequest } from "../builders/partner-requests";
import type { ScenarioUser } from "../builders/users";
import {
  getWaitlistDetail,
  probePartnerSlotStatus,
  probePendingWaitlistCount,
} from "../probes/waitlist";

export async function expectViewerWaitlisted(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
  rank: number;
}): Promise<void> {
  const detail = await getWaitlistDetail(input);
  assert.equal(detail.partnerSection.viewer.isWaitlisted, true);
  assert.equal(detail.partnerSection.viewer.waitlistRank, input.rank);
  assert.equal(detail.partnerSection.viewer.slotState, "PENDING");
  assert.equal(detail.partnerSection.viewer.canWaitlist, false);
}

export async function expectPartnerSlotStatus(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
  status: PartnerStatus;
}): Promise<void> {
  const actual = await probePartnerSlotStatus(input);
  assert.equal(actual, input.status);
}

export async function expectPendingWaitlistCount(
  pr: ScenarioPartnerRequest,
  expected: number,
): Promise<void> {
  const actual = await probePendingWaitlistCount(pr);
  assert.equal(actual, expected);
}
