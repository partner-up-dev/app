import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(path), "utf8");

const checks = [
  {
    file: "apps/backend/src/domains/pr/contracts/partner-request.ts",
    message: "PR time schema must allow offset datetime instants.",
    pass: (content) =>
      content.includes("const instantDateTimeSchema = z.string().datetime({ offset: true });"),
  },
  {
    file: "apps/backend/src/domains/pr/contracts/partner-request.ts",
    message: "Persisted PR time schema must not use date-or-datetime union.",
    pass: (content) => !content.includes("isoDateOrDateTimeSchema"),
  },
  {
    file: "apps/backend/src/entities/partner-request.ts",
    message: "PR entity compatibility must re-export the owner time contract.",
    pass: (content) =>
      content.includes('from "../domains/pr/contracts/partner-request"') &&
      content.includes("partnerRequestFieldsSchema"),
  },
  {
    file: "apps/web/src/lib/validation.ts",
    message: "Frontend PR form time validation must allow offset datetime instants.",
    pass: (content) =>
      content.includes("const instantDateTimeSchema = z.string().datetime({ offset: true });"),
  },
  {
    file: "apps/backend/src/services/prompts/partnerRequestParsePrompt.ts",
    message: "NL prompt must not ask the model to output date-only PR time values.",
    pass: (content) => !content.includes('time: ["2026-02-08", null]'),
  },
  {
    file: "apps/web/src/domains/pr/model/pr-discovery-form.ts",
    message: "PR Discovery time options must be normalized datetime instants.",
    pass: (content) =>
      content.includes("buildProductLocalIso") && content.includes(".toISOString()"),
  },
  {
    file: "apps/web/src/domains/pr/ui/PRDiscoveryPanel.vue",
    message: "PR Discovery must hand Authoring its normalized time window.",
    pass: (content) => content.includes("time: [timeWindow.startAt, timeWindow.endAt ?? null]"),
  },
  {
    file: "apps/backend/src/controllers/pr-discovery.controller.ts",
    message: "PR Discovery recommendation windows must allow offset datetime instants.",
    pass: (content) =>
      content.includes("const instantDateTimeSchema = z.string().datetime({ offset: true });") &&
      content.includes("startAt: instantDateTimeSchema") &&
      content.includes("endAt: instantDateTimeSchema"),
  },
];

const failures = [];

for (const check of checks) {
  const content = read(check.file);
  if (!check.pass(content)) {
    failures.push(`[pr-time-contract] ${check.file}: ${check.message}`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}

console.info("[pr-time-contract] checks passed");
