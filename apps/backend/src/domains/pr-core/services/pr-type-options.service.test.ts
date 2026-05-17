import assert from "node:assert/strict";
import { test } from "vitest";

test("natural-language PR type candidates keep existing PR types ahead of anchor event types", async () => {
  const {
    buildNaturalLanguagePRTypeCandidates,
    toNaturalLanguagePRTypePromptHints,
  } = await import("./pr-type-options");

  const candidates = buildNaturalLanguagePRTypeCandidates({
    existingPRTypes: ["  羽毛球搭子  ", "Badminton"],
    anchorEventTypes: ["羽毛球搭子", "飞盘活动"],
  });

  assert.deepEqual(candidates, [
    { type: "羽毛球搭子", source: "PARTNER_REQUEST" },
    { type: "Badminton", source: "PARTNER_REQUEST" },
    { type: "飞盘活动", source: "ANCHOR_EVENT" },
  ]);
  assert.deepEqual(toNaturalLanguagePRTypePromptHints(candidates), {
    existingPRTypes: ["羽毛球搭子", "Badminton"],
    anchorEventTypes: ["飞盘活动"],
  });
});

test("natural-language PR type candidates keep canonical labels from the first source", async () => {
  const { buildNaturalLanguagePRTypeCandidates } = await import(
    "./pr-type-options"
  );

  const candidates = buildNaturalLanguagePRTypeCandidates({
    existingPRTypes: ["Board   Game"],
    anchorEventTypes: ["ｂｏａｒｄ game", "  "],
  });

  assert.deepEqual(candidates, [
    { type: "Board   Game", source: "PARTNER_REQUEST" },
  ]);
});

test("natural-language PR type canonicalization preserves known candidate labels", async () => {
  const {
    buildNaturalLanguagePRTypeCandidates,
    canonicalizeNaturalLanguagePRType,
  } = await import("./pr-type-options");

  const candidates = buildNaturalLanguagePRTypeCandidates({
    existingPRTypes: ["Board Game"],
    anchorEventTypes: ["城市徒步"],
  });

  assert.equal(
    canonicalizeNaturalLanguagePRType("board   game", candidates),
    "Board Game",
  );
  assert.equal(
    canonicalizeNaturalLanguagePRType("ＢＯＡＲＤ　ＧＡＭＥ", candidates),
    "Board Game",
  );
  assert.equal(
    canonicalizeNaturalLanguagePRType("城市徒步", candidates),
    "城市徒步",
  );
  assert.equal(
    canonicalizeNaturalLanguagePRType("  露营   活动  ", candidates),
    "露营 活动",
  );
  assert.equal(
    canonicalizeNaturalLanguagePRType("露营", candidates),
    "露营",
  );
});
