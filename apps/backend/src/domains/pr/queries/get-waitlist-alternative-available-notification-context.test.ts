import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { PartnerRequest } from "../../../entities/partner-request";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

const { isWaitlistAlternativeCandidateCurrentlyJoinable } =
  await import("./get-waitlist-alternative-available-notification-context");

const candidate = (overrides: Partial<PartnerRequest> = {}): PartnerRequest =>
  ({
    visibilityStatus: "VISIBLE",
    status: "OPEN",
    time: ["2026-07-23T12:00:00.000Z", "2026-07-23T14:00:00.000Z"],
    confirmationEnabled: true,
    confirmationStartOffsetMinutes: null,
    confirmationEndOffsetMinutes: null,
    joinLockOffsetMinutes: null,
    ...overrides,
  }) as PartnerRequest;

describe("waitlist alternative current-state joinability", () => {
  it("treats a raw OPEN candidate after its start as unavailable without temporal mutation", () => {
    assert.equal(
      isWaitlistAlternativeCandidateCurrentlyJoinable(
        candidate(),
        new Date("2026-07-23T11:59:59.000Z"),
      ),
      true,
    );
    assert.equal(
      isWaitlistAlternativeCandidateCurrentlyJoinable(
        candidate(),
        new Date("2026-07-23T12:00:00.000Z"),
      ),
      false,
    );
  });

  it("uses the persisted participation policy join lock when one exists", () => {
    const policyCandidate = candidate({
      confirmationStartOffsetMinutes: 120,
      confirmationEndOffsetMinutes: 30,
      joinLockOffsetMinutes: 30,
    });

    assert.equal(
      isWaitlistAlternativeCandidateCurrentlyJoinable(
        policyCandidate,
        new Date("2026-07-23T11:29:59.000Z"),
      ),
      true,
    );
    assert.equal(
      isWaitlistAlternativeCandidateCurrentlyJoinable(
        policyCandidate,
        new Date("2026-07-23T11:30:00.000Z"),
      ),
      false,
    );
  });
});
