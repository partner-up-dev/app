import { describe, expect, test } from "vitest";
import type { PRDetailView } from "@/domains/pr/model/types";
import {
  canShowPRPairingCode,
  derivePRPairingCode,
} from "@/domains/pr/model/pr-pairing-code";

describe("PR pairing code", () => {
  test("derives a stable four-digit code from PR id", () => {
    const firstCode = derivePRPairingCode(123);
    const secondCode = derivePRPairingCode(123);

    expect(firstCode).toBe(secondCode);
    expect(firstCode).toMatch(/^\d{4}$/);
    expect(derivePRPairingCode(124)).not.toBe(firstCode);
  });

  test("is visible only for READY active participants", () => {
    expect(
      canShowPRPairingCode(
        buildPRDetail({ status: "READY", isParticipant: true }),
      ),
    ).toBe(true);
    expect(
      canShowPRPairingCode(
        buildPRDetail({ status: "OPEN", isParticipant: true }),
      ),
    ).toBe(false);
    expect(
      canShowPRPairingCode(
        buildPRDetail({ status: "READY", isParticipant: false }),
      ),
    ).toBe(false);
  });
});

const buildPRDetail = ({
  status,
  isParticipant,
}: {
  status: "OPEN" | "READY";
  isParticipant: boolean;
}): PRDetailView =>
  ({
    status,
    partnerSection: {
      viewer: {
        isParticipant,
      },
    },
  }) as PRDetailView;
