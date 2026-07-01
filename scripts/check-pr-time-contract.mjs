import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(path), "utf8");

const checks = [
  {
    file: "apps/backend/src/entities/partner-request.ts",
    message: "PR time schema must allow offset datetime instants.",
    pass: (content) =>
      content.includes("const instantDateTimeSchema = z.string().datetime({ offset: true });"),
  },
  {
    file: "apps/backend/src/entities/partner-request.ts",
    message: "Persisted PR time schema must not use date-or-datetime union.",
    pass: (content) => !content.includes("isoDateOrDateTimeSchema"),
  },
  {
    file: "apps/frontend/src/lib/validation.ts",
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
    file: "apps/frontend/src/domains/event/model/form-mode.ts",
    message: "Form Mode all-day windows must end at the next product-local midnight.",
    pass: (content) =>
      content.includes('{ label: "全天", value: "ALL_DAY", startTime: "00:00", endTime: "00:00" }'),
  },
  {
    file: "apps/backend/src/controllers/anchor-event.controller.ts",
    message: "Anchor Event PR time-window inputs must allow offset datetime instants.",
    pass: (content) =>
      content.includes("const instantDateTimeSchema = z.string().datetime({ offset: true });") &&
      !content.includes("z.string().datetime(), z.string().datetime()"),
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
