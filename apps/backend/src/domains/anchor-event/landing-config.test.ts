import assert from "node:assert/strict";
import { test } from "vitest";
import {
  assignAnchorEventLandingModeFromConfig,
  normalizeAnchorEventLandingConfig,
  parseAnchorEventLandingConfig,
} from "./landing-config";

test("default landing config keeps LIST out of assignment until configured", () => {
  const config = normalizeAnchorEventLandingConfig(null);

  assert.equal(assignAnchorEventLandingModeFromConfig(config, 0.25), "FORM");
  assert.equal(assignAnchorEventLandingModeFromConfig(config, 0.75), "CARD_RICH");
});

test("landing config accepts LIST as a weighted assignment mode", () => {
  const config = normalizeAnchorEventLandingConfig({
    variantRatioOverride: {
      FORM: 20,
      CARD_RICH: 30,
      LIST: 50,
    },
    assignmentRevision: 2,
  });

  assert.deepEqual(config.variantRatioOverride, {
    FORM: 20,
    CARD_RICH: 30,
    LIST: 50,
  });
  assert.equal(assignAnchorEventLandingModeFromConfig(config, 0.1), "FORM");
  assert.equal(assignAnchorEventLandingModeFromConfig(config, 0.35), "CARD_RICH");
  assert.equal(assignAnchorEventLandingModeFromConfig(config, 0.75), "LIST");
});

test("legacy two-mode landing config normalizes LIST to zero", () => {
  const config = parseAnchorEventLandingConfig(
    JSON.stringify({
      variantRatioOverride: {
        FORM: 70,
        CARD_RICH: 30,
      },
      assignmentRevision: 3,
    }),
  );

  assert.deepEqual(config.variantRatioOverride, {
    FORM: 70,
    CARD_RICH: 30,
    LIST: 0,
  });
  assert.equal(assignAnchorEventLandingModeFromConfig(config, 0.95), "CARD_RICH");
});

test("all-zero landing override resolves to LIST fallback", () => {
  const config = normalizeAnchorEventLandingConfig({
    variantRatioOverride: {
      FORM: 0,
      CARD_RICH: 0,
      LIST: 0,
    },
    assignmentRevision: 1,
  });

  assert.equal(assignAnchorEventLandingModeFromConfig(config, 0.95), "LIST");
});

test("landing assignment clamps random one to the last positive mode", () => {
  const config = normalizeAnchorEventLandingConfig({
    variantRatioOverride: {
      FORM: 50,
      CARD_RICH: 50,
      LIST: 0,
    },
    assignmentRevision: 1,
  });

  assert.equal(assignAnchorEventLandingModeFromConfig(config, 1), "CARD_RICH");
});
