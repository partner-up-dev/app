import assert from "node:assert/strict";
import { test } from "vitest";
import { ProblemDetailsError } from "../../../lib/problem-details";
import {
  PARTNER_BOUNDS_ERROR_MESSAGES,
  assertManualPartnerBoundsValid,
  normalizeAutomaticPartnerBounds,
} from "./partner-bounds.service";

const assertThrowsProblemDetails = (fn: () => void, expectedMessage: string): void => {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof ProblemDetailsError);
    assert.equal(error.status, 400);
    assert.equal(error.message, expectedMessage);
    return true;
  });
};

test("assertManualPartnerBoundsValid rejects null and sub-minimum minPartners", () => {
  assertThrowsProblemDetails(
    () => assertManualPartnerBoundsValid(null, null, 0),
    PARTNER_BOUNDS_ERROR_MESSAGES.minPartnersInvalid,
  );
  assertThrowsProblemDetails(
    () => assertManualPartnerBoundsValid(0, null, 0),
    PARTNER_BOUNDS_ERROR_MESSAGES.minPartnersInvalid,
  );
});

test("assertManualPartnerBoundsValid accepts minPartners of 1 without maxPartners", () => {
  assert.doesNotThrow(() => assertManualPartnerBoundsValid(1, null, 0));
});

test("assertManualPartnerBoundsValid rejects maxPartners of 1", () => {
  assertThrowsProblemDetails(
    () => assertManualPartnerBoundsValid(1, 1, 0),
    PARTNER_BOUNDS_ERROR_MESSAGES.maxPartnersInvalid,
  );
});

test("assertManualPartnerBoundsValid rejects maxPartners below minPartners", () => {
  assertThrowsProblemDetails(
    () => assertManualPartnerBoundsValid(3, 2, 0),
    PARTNER_BOUNDS_ERROR_MESSAGES.maxPartnersBelowMin,
  );
});

test("normalizeAutomaticPartnerBounds defaults invalid minPartners to 2", () => {
  assert.deepEqual(normalizeAutomaticPartnerBounds(null, null, 0), {
    minPartners: 2,
    maxPartners: null,
  });
  assert.deepEqual(normalizeAutomaticPartnerBounds(0, 4, 0), {
    minPartners: 2,
    maxPartners: 4,
  });
});

test("normalizeAutomaticPartnerBounds accepts minPartners of 1", () => {
  assert.deepEqual(normalizeAutomaticPartnerBounds(1, null, 0), {
    minPartners: 1,
    maxPartners: null,
  });
});

test("normalizeAutomaticPartnerBounds rejects maxPartners of 1", () => {
  assertThrowsProblemDetails(
    () => normalizeAutomaticPartnerBounds(1, 1, 0),
    PARTNER_BOUNDS_ERROR_MESSAGES.maxPartnersInvalid,
  );
});

test("normalizeAutomaticPartnerBounds validates maxPartners against normalized minimum", () => {
  assertThrowsProblemDetails(
    () => normalizeAutomaticPartnerBounds(3, 2, 0),
    PARTNER_BOUNDS_ERROR_MESSAGES.maxPartnersBelowMin,
  );
});
