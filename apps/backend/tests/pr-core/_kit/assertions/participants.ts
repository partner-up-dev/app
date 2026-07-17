import assert from "node:assert/strict";
import type { UserId } from "../../../../src/entities/user";
import type { ScenarioPartnerRequest } from "../builders/partner-requests";
import { probeActiveParticipantCount, probeActiveParticipantUserIds } from "../probes/participants";

export async function expectActiveParticipantCount(
  pr: ScenarioPartnerRequest,
  expected: number,
): Promise<void> {
  const actual = await probeActiveParticipantCount(pr.id);
  assert.equal(
    actual,
    expected,
    `Expected PartnerRequest ${pr.id} active participant count ${expected}, got ${actual}`,
  );
}

export async function expectActiveParticipantsInclude(
  pr: ScenarioPartnerRequest,
  expectedUserIds: UserId[],
): Promise<void> {
  const actual = await probeActiveParticipantUserIds(pr.id);
  for (const userId of expectedUserIds) {
    assert.ok(
      actual.includes(userId),
      `Expected PartnerRequest ${pr.id} active participants to include ${userId}; actual=${JSON.stringify(
        actual,
      )}`,
    );
  }
}
