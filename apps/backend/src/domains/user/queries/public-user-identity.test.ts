import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "vitest";
import type { UserRole, UserStatus } from "../../../entities/user";
import { classifyCurrentPublicUser } from "./public-user-identity";

type IdentityInput = {
  id: string;
  status: UserStatus;
  role: readonly UserRole[];
};

const user = (input: Partial<IdentityInput> = {}): IdentityInput => ({
  id: randomUUID(),
  status: "ACTIVE" as const,
  role: ["anonymous"],
  ...input,
});

test("classifies active anonymous and authenticated users", () => {
  const anonymous = user();
  assert.deepEqual(classifyCurrentPublicUser(anonymous), {
    userId: anonymous.id,
    role: "anonymous",
  });

  const authenticated = user({ role: ["authenticated"] });
  assert.deepEqual(classifyCurrentPublicUser(authenticated), {
    userId: authenticated.id,
    role: "authenticated",
  });
});

test("rejects disabled and operator-bearing users from public identity", () => {
  assert.equal(classifyCurrentPublicUser(user({ status: "DISABLED" })), null);
  assert.equal(classifyCurrentPublicUser(user({ role: ["service"] })), null);
  assert.equal(classifyCurrentPublicUser(user({ role: ["analytics"] })), null);
  assert.equal(classifyCurrentPublicUser(user({ role: ["authenticated", "analytics"] })), null);
});
