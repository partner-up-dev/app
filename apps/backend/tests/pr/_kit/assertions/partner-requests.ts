import assert from "node:assert/strict";
import type { PRStatus } from "../../../../src/entities/partner-request";
import type { ScenarioPartnerRequest } from "../builders/partner-requests";
import { probePartnerRequestStatus } from "../probes/partner-requests";

export async function expectPartnerRequestStatus(
  pr: ScenarioPartnerRequest,
  expected: PRStatus,
): Promise<void> {
  const actual = await probePartnerRequestStatus(pr.id);
  assert.equal(
    actual,
    expected,
    `Expected PartnerRequest ${pr.id} status ${expected}, got ${actual}`,
  );
}
