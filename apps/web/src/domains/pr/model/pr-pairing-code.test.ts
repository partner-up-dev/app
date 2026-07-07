import { describe, expect, test } from "vitest";
import type { PRDetailView } from "@/domains/pr/model/types";
import {
  canShowPRPairingCode,
  derivePRPairingCode,
  derivePRPairingIdentity,
} from "@/domains/pr/model/pr-pairing-code";

describe("PR pairing code", () => {
  test("derives a stable four-digit code from PR id", () => {
    const firstCode = derivePRPairingCode(123);
    const secondCode = derivePRPairingCode(123);

    expect(firstCode).toBe(secondCode);
    expect(firstCode).toMatch(/^\d{4}$/);
    expect(derivePRPairingCode(124)).not.toBe(firstCode);
  });

  test("derives a stable visual identity with a color per code", () => {
    const firstIdentity = derivePRPairingIdentity(123);
    const secondIdentity = derivePRPairingIdentity(123);
    const otherIdentity = derivePRPairingIdentity(124);

    expect(firstIdentity).toEqual(secondIdentity);
    expect(firstIdentity.code).toMatch(/^\d{4}$/);
    expect(firstIdentity.backgroundColor).toMatch(
      /^hsl\(\d+\.\d{3}, \d+%, \d+%\)$/,
    );
    expect(firstIdentity.foregroundColor).toMatch(/^#[0-9a-f]{6}$/);
    expect(otherIdentity.code).not.toBe(firstIdentity.code);
    expect(otherIdentity.backgroundColor).not.toBe(
      firstIdentity.backgroundColor,
    );
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
