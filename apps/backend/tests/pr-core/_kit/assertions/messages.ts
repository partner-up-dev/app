import assert from "node:assert/strict";
import type { MessageThreadVisibilityProbe } from "../probes/messages";

export function expectMessageThreadVisible(probe: MessageThreadVisibilityProbe): void {
  assert.equal(
    probe.httpStatus,
    200,
    `Expected message thread to be visible, got HTTP ${probe.httpStatus}`,
  );
}

export function expectMessageThreadForbidden(probe: MessageThreadVisibilityProbe): void {
  assert.equal(
    probe.httpStatus,
    403,
    `Expected message thread to be forbidden, got HTTP ${probe.httpStatus}`,
  );
}
