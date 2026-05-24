import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  deriveStatusFromPartnerCount,
  isExitAllowedStatus,
  isJoinableStatus,
  shouldRecalculateCapacityStatus,
} from "./status-rules";

describe("PR status rules", () => {
  it("keeps direct join and exit limited to OPEN", () => {
    assert.equal(isJoinableStatus("OPEN"), true);
    assert.equal(isJoinableStatus("READY"), false);
    assert.equal(isJoinableStatus("ACTIVE"), false);

    assert.equal(isExitAllowedStatus("OPEN"), true);
    assert.equal(isExitAllowedStatus("READY"), false);
    assert.equal(isExitAllowedStatus("ACTIVE"), false);
  });

  it("does not derive durable READY or FULL from partner count", () => {
    assert.equal(deriveStatusFromPartnerCount(1, 1, 2), "OPEN");
    assert.equal(deriveStatusFromPartnerCount(2, 1, 2), "OPEN");
  });

  it("does not recalculate creator-owned READY from capacity changes", () => {
    assert.equal(shouldRecalculateCapacityStatus("OPEN"), true);
    assert.equal(shouldRecalculateCapacityStatus("READY"), false);
  });
});
