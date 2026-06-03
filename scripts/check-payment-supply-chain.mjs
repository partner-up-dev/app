import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const lockfilePath = resolve("pnpm-lock.yaml");
const lockfile = readFileSync(lockfilePath, "utf8");

const blockedPatterns = [
  /axios@1\.14\.1\b/,
  /axios@0\.30\.4\b/,
  /plain-crypto-js\b/,
];

const failures = [];

for (const pattern of blockedPatterns) {
  if (pattern.test(lockfile)) {
    failures.push(`Blocked payment supply-chain package matched: ${pattern}`);
  }
}

if (!/axios@1\.16\.1:/.test(lockfile) && !/axios:\n\s+specifier: 1\.16\.1/.test(lockfile)) {
  failures.push("Expected axios@1.16.1 to be pinned in pnpm-lock.yaml");
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`[payment-supply-chain] ${failure}`);
  }
  process.exit(1);
}

console.info("[payment-supply-chain] checks passed");
