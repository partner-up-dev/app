import assert from "node:assert/strict";
import { test } from "vitest";
import {
  AUTHENTICATED_REQUIRED_CODE,
  isAuthenticatedRequiredResponse,
} from "./auth-required-policy";
test("AUTHENTICATED_REQUIRED policy is a pure status and payload classifier", () => {
  const payload = { code: AUTHENTICATED_REQUIRED_CODE, detail: "Login required" };

  assert.equal(isAuthenticatedRequiredResponse(401, payload), true);
  assert.equal(isAuthenticatedRequiredResponse(403, payload), false);
  assert.equal(isAuthenticatedRequiredResponse(401, { code: "OTHER" }), false);
  assert.equal(isAuthenticatedRequiredResponse(401, null), false);
});
