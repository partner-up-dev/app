import assert from "node:assert/strict";
import { test } from "vitest";

test("natural-language PR type candidates keep observed PR types ahead of configured types", async () => {
  const { buildNaturalLanguagePRTypeCandidates, toNaturalLanguagePRTypePromptHints } =
    await import("./pr-type-options");

  const candidates = buildNaturalLanguagePRTypeCandidates({
    observedPRTypes: ["  羽毛球搭子  ", "Badminton"],
    configuredPRTypes: ["羽毛球搭子", "飞盘活动"],
  });

  assert.deepEqual(candidates, [
    { type: "羽毛球搭子", source: "OBSERVED_PR" },
    { type: "Badminton", source: "OBSERVED_PR" },
    { type: "飞盘活动", source: "PR_TYPE_CONFIG" },
  ]);
  assert.deepEqual(toNaturalLanguagePRTypePromptHints(candidates), {
    observedPRTypes: ["羽毛球搭子", "Badminton"],
    configuredPRTypes: ["飞盘活动"],
  });
});

test("natural-language PR type candidates keep canonical labels from the first source", async () => {
  const { buildNaturalLanguagePRTypeCandidates } = await import("./pr-type-options");

  const candidates = buildNaturalLanguagePRTypeCandidates({
    observedPRTypes: ["Board   Game"],
    configuredPRTypes: ["ｂｏａｒｄ game", "  "],
  });

  assert.deepEqual(candidates, [{ type: "Board   Game", source: "OBSERVED_PR" }]);
});

test("natural-language PR type canonicalization preserves known candidate labels", async () => {
  const { buildNaturalLanguagePRTypeCandidates, canonicalizeNaturalLanguagePRType } =
    await import("./pr-type-options");

  const candidates = buildNaturalLanguagePRTypeCandidates({
    observedPRTypes: ["Board Game"],
    configuredPRTypes: ["城市徒步"],
  });

  assert.equal(canonicalizeNaturalLanguagePRType("board   game", candidates), "Board Game");
  assert.equal(canonicalizeNaturalLanguagePRType("ＢＯＡＲＤ　ＧＡＭＥ", candidates), "Board Game");
  assert.equal(canonicalizeNaturalLanguagePRType("城市徒步", candidates), "城市徒步");
  assert.equal(canonicalizeNaturalLanguagePRType("  露营   活动  ", candidates), "露营 活动");
  assert.equal(canonicalizeNaturalLanguagePRType("露营", candidates), "露营");
});
