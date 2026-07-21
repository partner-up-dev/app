import { describe, expect, it } from "vitest";
import type { CreateOrderAttempt } from "../../../entities/create-order-attempt";
import { ProblemDetailsError } from "../../../lib/problem-details";
import {
  buildCreateOrderCommandFingerprint,
  replayCreateOrderAttempt,
} from "./create-order-idempotency";

const buildAttempt = (overrides: Partial<CreateOrderAttempt> = {}): CreateOrderAttempt => ({
  id: "00000000-0000-0000-0000-000000000010" as CreateOrderAttempt["id"],
  actorUserId: "00000000-0000-0000-0000-000000000011" as CreateOrderAttempt["actorUserId"],
  commandFingerprint: "fingerprint",
  completedAt: null,
  createdAt: new Date("2030-01-01T00:00:00.000Z"),
  dispatchSeed: {
    externalOrderId: "rh1",
    providerInstanceId: "00000000-0000-0000-0000-000000000012",
    providerType: "CAOCAO",
    submissionMode: "SINGLE_CANDIDATE",
    submittedAt: "2030-01-01T00:00:00.000Z",
    submittedCandidates: [],
  },
  externalOrderId: "rh1",
  idempotencyKey: "key-1",
  offerId: 1 as CreateOrderAttempt["offerId"],
  orderId: "00000000-0000-0000-0000-000000000013" as CreateOrderAttempt["orderId"],
  prId: 1 as CreateOrderAttempt["prId"],
  providerInstanceId:
    "00000000-0000-0000-0000-000000000012" as CreateOrderAttempt["providerInstanceId"],
  providerOrderId: null,
  providerRequestStartedAt: new Date("2030-01-01T00:00:00.000Z"),
  replayExpiresAt: null,
  responseStatus: null,
  resultSnapshot: null,
  status: "SUBMITTING",
  updatedAt: new Date("2030-01-01T00:00:00.000Z"),
  ...overrides,
});

describe("create-order idempotency", () => {
  it("canonicalizes choice-set quote identity as a set", () => {
    const left = buildCreateOrderCommandFingerprint({
      prId: 9,
      items: [
        {
          kind: "CHOICE_SET",
          candidateQuoteIds: ["quote-b", "quote-a", "quote-a"],
        },
      ],
    });
    const right = buildCreateOrderCommandFingerprint({
      prId: 9,
      items: [{ kind: "CHOICE_SET", candidateQuoteIds: ["quote-a", "quote-b"], quantity: 1 }],
    });
    expect(left).toBe(right);
  });

  it("replays processing without creating a new result", () => {
    expect(
      replayCreateOrderAttempt({ attempt: buildAttempt(), commandFingerprint: "fingerprint" }),
    ).toEqual({
      outcome: "PROCESSING",
      attemptId: "00000000-0000-0000-0000-000000000010",
      orderId: "00000000-0000-0000-0000-000000000013",
    });
  });

  it("rejects a changed command under the same key", () => {
    expect(() =>
      replayCreateOrderAttempt({ attempt: buildAttempt(), commandFingerprint: "changed" }),
    ).toThrowError(ProblemDetailsError);
  });

  it("does not silently reuse an expired completed key", () => {
    expect(() =>
      replayCreateOrderAttempt({
        attempt: buildAttempt({ replayExpiresAt: new Date("2030-01-02T00:00:00.000Z") }),
        commandFingerprint: "fingerprint",
        now: new Date("2030-01-03T00:00:00.000Z"),
      }),
    ).toThrowError(ProblemDetailsError);
  });
});
