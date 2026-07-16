import assert from "node:assert/strict";
import { test } from "vitest";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/test";

const { buildWeComPRShareUrl } = await import("./wecom.controller");

test("buildWeComPRShareUrl uses the canonical PR route", () => {
  assert.equal(
    buildWeComPRShareUrl("https://partner-up.test///", 42),
    "https://partner-up.test/pr/42",
  );
});
