import assert from "node:assert/strict";
import { test } from "vitest";
import {
  resolveConfiguredFrontendOrigin,
  resolveConfiguredFrontendReturnTo,
  resolveCredentialedCorsOrigin,
} from "./frontend-origin";

const FRONTEND_URL = "https://app.partner-up.cn";

test("resolves only the configured frontend origin for credentialed CORS", () => {
  assert.equal(resolveConfiguredFrontendOrigin(FRONTEND_URL), FRONTEND_URL);
  assert.equal(resolveCredentialedCorsOrigin(FRONTEND_URL, FRONTEND_URL), FRONTEND_URL);
  assert.equal(resolveCredentialedCorsOrigin("https://test.app.partner-up.cn", FRONTEND_URL), null);
  assert.equal(resolveCredentialedCorsOrigin("https://topology-probe.invalid", FRONTEND_URL), null);
  assert.equal(resolveCredentialedCorsOrigin("", FRONTEND_URL), null);
});

test("resolves OAuth return targets against the configured frontend origin only", () => {
  assert.equal(
    resolveConfiguredFrontendReturnTo("https://app.partner-up.cn/pr/42?tab=detail", FRONTEND_URL),
    "https://app.partner-up.cn/pr/42?tab=detail",
  );
  assert.equal(
    resolveConfiguredFrontendReturnTo("/pr/42?tab=detail", FRONTEND_URL),
    "https://app.partner-up.cn/pr/42?tab=detail",
  );
  assert.equal(
    resolveConfiguredFrontendReturnTo(undefined, FRONTEND_URL),
    "https://app.partner-up.cn/",
  );
});

test("rejects request-derived or unconfigured OAuth return targets", () => {
  assert.throws(
    () => resolveConfiguredFrontendReturnTo("https://topology-probe.invalid/pr/42", FRONTEND_URL),
    /returnTo origin is not allowed/,
  );
  assert.throws(
    () => resolveConfiguredFrontendReturnTo("//topology-probe.invalid/pr/42", FRONTEND_URL),
    /returnTo origin is not allowed/,
  );
  assert.throws(
    () => resolveConfiguredFrontendReturnTo("javascript:alert(1)", FRONTEND_URL),
    /Invalid returnTo protocol/,
  );
  assert.throws(
    () => resolveConfiguredFrontendReturnTo("/pr/42", undefined),
    /OAuth returnTo is not configured/,
  );
});
