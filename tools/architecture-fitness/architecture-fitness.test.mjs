import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  classifyReport,
  RULES,
  scanArchitecture,
  scanBackendContractFacade,
  stableJson,
} from "./lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(here, "fixtures/repository");
const repositoryRoot = path.resolve(here, "../..");

test("each initial architecture rule has one positive fixture", () => {
  const report = scanArchitecture(fixtureRoot);
  const counts = new Map();
  for (const item of report.findings) counts.set(item.rule, (counts.get(item.rule) ?? 0) + 1);

  assert.deepEqual(
    Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right))),
    Object.fromEntries(
      Object.values(RULES)
        .sort()
        .map((rule) => [rule, 1]),
    ),
  );
});

test("valid owner edges do not produce findings", () => {
  const report = scanArchitecture(fixtureRoot);
  assert.equal(
    report.findings.some((item) => item.source.includes("valid")),
    false,
  );
});

test("unresolved imports are inventoried without becoming findings", () => {
  const report = scanArchitecture(fixtureRoot);
  const source = "apps/backend/src/controllers/unresolved.controller.ts";

  assert.deepEqual(
    report.unresolved.filter((item) => item.source === source),
    [
      {
        line: 1,
        source,
        specifier: "../services/YourService",
      },
    ],
  );
  assert.equal(
    report.findings.some((item) => item.source === source),
    false,
  );
});

test("root-level category entrypoints are public while deep implementation paths remain private", () => {
  const report = scanArchitecture(fixtureRoot);
  assert.equal(
    report.findings.some(
      (item) =>
        item.rule === RULES.BACKEND_CROSS_DOMAIN_PRIVATE &&
        item.source.includes("valid-category-catalog"),
    ),
    false,
  );
  assert.equal(
    report.findings.some(
      (item) =>
        item.rule === RULES.BACKEND_CROSS_DOMAIN_PRIVATE &&
        item.target.endsWith("catalog/services/private.ts"),
    ),
    true,
  );
});

test("reports are byte-identical for an unchanged scope", () => {
  assert.equal(
    stableJson(scanArchitecture(fixtureRoot)),
    stableJson(scanArchitecture(fixtureRoot)),
  );
});

test("a reviewed fingerprint is known and all other findings stay new", () => {
  const report = scanArchitecture(fixtureRoot);
  const reviewed = report.findings[0];
  const classified = classifyReport(report, {
    knownFindings: [reviewed.fingerprint],
    ruleClassifications: {
      [reviewed.rule]: {
        owner: "fixture-owner",
        reason: "fixture compatibility",
        removalCondition: "fixture migration completes",
      },
    },
    scopeDigest: report.scopeDigest,
  });

  assert.equal(classified.classification.known, 1);
  assert.equal(classified.classification.new, report.findings.length - 1);
  assert.equal(classified.findings[0].governance.owner, "fixture-owner");
  assert.equal(classified.baselineScopeDrift, false);
});

test("the Backend package contract facade reaches owner contract leaves only", () => {
  const report = scanBackendContractFacade(repositoryRoot);
  assert.deepEqual(report.violations, []);
});

test("the contract facade guard accepts type-only owner exports and rejects implementation edges", () => {
  assert.deepEqual(scanBackendContractFacade(fixtureRoot).violations, []);
  assert.deepEqual(
    scanBackendContractFacade(fixtureRoot, "apps/backend/src/invalid-contracts.ts").violations.map(
      (item) => item.kind,
    ),
    ["forbidden-contract-dependency"],
  );
});
