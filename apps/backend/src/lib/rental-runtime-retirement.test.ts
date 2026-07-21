import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { ProblemDetailsError } from "./problem-details";
import {
  RENTAL_RUNTIME_RETIRED_CODE,
  throwRentalRuntimeRetired,
} from "./rental-runtime-retirement";

describe("Rental runtime retirement", () => {
  it("returns a stable 410 problem without entering fulfillment", () => {
    assert.throws(
      () => throwRentalRuntimeRetired(),
      (error: unknown) =>
        error instanceof ProblemDetailsError &&
        error.status === 410 &&
        error.code === RENTAL_RUNTIME_RETIRED_CODE,
    );
  });
});
