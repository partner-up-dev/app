import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  derivePRStatusFromPartnerCount,
  isPRExitAllowedStatus,
  isPRJoinableStatus,
  isPROrderAttachableStatus,
  shouldRecalculatePRCapacityStatus,
} from "./status-rules";

describe("PR status rules", () => {
  it("keeps direct join and exit limited to OPEN", () => {
    assert.equal(isPRJoinableStatus("OPEN"), true);
    assert.equal(isPRJoinableStatus("READY"), false);
    assert.equal(isPRJoinableStatus("ACTIVE"), false);

    assert.equal(isPRExitAllowedStatus("OPEN"), true);
    assert.equal(isPRExitAllowedStatus("READY"), false);
    assert.equal(isPRExitAllowedStatus("ACTIVE"), false);
  });

  it("does not derive durable formed or full status from partner count", () => {
    assert.equal(derivePRStatusFromPartnerCount(1, 1, 2), "OPEN");
    assert.equal(derivePRStatusFromPartnerCount(2, 1, 2), "OPEN");
  });

  it("does not recalculate creator-owned READY from capacity changes", () => {
    assert.equal(shouldRecalculatePRCapacityStatus("OPEN"), true);
    assert.equal(shouldRecalculatePRCapacityStatus("READY"), false);
  });

  it("allows PR-attached ordering for READY and ACTIVE only", () => {
    assert.equal(isPROrderAttachableStatus("OPEN"), false);
    assert.equal(isPROrderAttachableStatus("READY"), true);
    assert.equal(isPROrderAttachableStatus("ACTIVE"), true);
    assert.equal(isPROrderAttachableStatus("CLOSED"), false);
  });
});
