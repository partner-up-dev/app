import { describe, expect, test } from "vitest";
import { ProblemDetailsError } from "../../../lib/problem-details";
import type { PRStatus } from "../contracts/partner-request";
import type { AuthRole } from "../../../auth/types";
import { assertPRDraftAccess } from "./draft-access-policy.service";

const operations = [
  "read",
  "content-mutation",
  "status-mutation",
  "publish",
  "participant-flow",
] as const;

const captureProblem = (operation: () => void): ProblemDetailsError => {
  try {
    operation();
  } catch (error) {
    if (error instanceof ProblemDetailsError) return error;
    throw error;
  }
  throw new Error("Expected ProblemDetailsError");
};

describe("assertPRDraftAccess", () => {
  const publicStatuses: PRStatus[] = ["OPEN", "READY", "ACTIVE", "CLOSED", "EXPIRED"];

  test.each(publicStatuses)("allows every operation for %s", (status) => {
    for (const operation of operations) {
      expect(() =>
        assertPRDraftAccess({
          request: { status, createdBy: null },
          actor: { userId: null, roles: ["anonymous"] },
          operation,
        }),
      ).not.toThrow();
    }
  });

  test("allows authenticated owner reads and mutations but never participant flow", () => {
    const actor = { userId: "owner", roles: ["authenticated"] as const };
    for (const operation of ["read", "content-mutation", "status-mutation", "publish"] as const) {
      expect(() =>
        assertPRDraftAccess({
          request: { status: "DRAFT", createdBy: "owner" },
          actor,
          operation,
        }),
      ).not.toThrow();
    }

    expect(() =>
      assertPRDraftAccess({
        request: { status: "DRAFT", createdBy: "owner" },
        actor,
        operation: "participant-flow",
      }),
    ).toThrow(ProblemDetailsError);
  });

  const deniedActors: Array<{ label: string; actor: { userId: string; roles: AuthRole[] } }> = [
    { label: "creatorless authenticated", actor: { userId: "owner", roles: ["authenticated"] } },
    { label: "other authenticated", actor: { userId: "other", roles: ["authenticated"] } },
    { label: "anonymous session", actor: { userId: "owner", roles: ["anonymous"] } },
    { label: "service", actor: { userId: "owner", roles: ["service"] } },
    { label: "analytics", actor: { userId: "owner", roles: ["analytics"] } },
    {
      label: "service plus authenticated",
      actor: { userId: "owner", roles: ["service", "authenticated"] },
    },
  ];

  test.each(deniedActors)("rejects $label without leaking draft details", ({ actor }) => {
    const error = captureProblem(() =>
      assertPRDraftAccess({
        request: { status: "DRAFT", createdBy: null },
        actor,
        operation: "read",
      }),
    );
    expect(error).toMatchObject({ status: 404, code: "PR_NOT_ACCESSIBLE" });
    expect(error.message).not.toContain("DRAFT");
    expect(error.message).not.toContain("owner");
    expect(error.code).not.toContain("DRAFT");
  });
});
