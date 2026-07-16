import assert from "node:assert/strict";
import { test } from "vitest";
import { DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT } from "./partnerRequestParsePrompt";

test("default PR parse prompt explains type candidate priority", () => {
  assert.equal(
    DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT.includes("typeSelection.observedPRTypes"),
    true,
  );
  assert.equal(
    DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT.includes("typeSelection.configuredPRTypes"),
    true,
  );
  assert.equal(
    DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT.includes("候选缺少匹配时，概括一个新的活动类型"),
    true,
  );
});

test("default PR parse prompt maps date-only input to all-day instants", () => {
  assert.equal(
    DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT.includes("start 为该日期 00:00，end 为次日 00:00"),
    true,
  );
  assert.equal(DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT.includes('["2026-02-08", null]'), false);
});
