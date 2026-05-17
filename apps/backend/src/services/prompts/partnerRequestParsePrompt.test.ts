import assert from "node:assert/strict";
import { test } from "vitest";
import { DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT } from "./partnerRequestParsePrompt";

test("default PR parse prompt explains type candidate priority", () => {
  assert.equal(
    DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT.includes(
      "typeSelection.existingPRTypes",
    ),
    true,
  );
  assert.equal(
    DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT.includes(
      "typeSelection.anchorEventTypes",
    ),
    true,
  );
  assert.equal(
    DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT.includes(
      "候选缺少匹配时，概括一个新的活动类型",
    ),
    true,
  );
});
