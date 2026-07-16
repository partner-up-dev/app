import assert from "node:assert/strict";
import { test } from "vitest";
import { toDiscoveryCandidate, toDiscoveryListRecord } from "./contracts";

test("candidate projection exposes the canonical PR identity", () => {
  const candidate = toDiscoveryCandidate(
    {
      id: 7,
      title: "Study",
      type: "study",
      location: "Library",
      route: null,
      time: ["2038-01-01T00:00:00.000Z", "2038-01-01T01:00:00.000Z"],
      minPartners: 2,
      maxPartners: 4,
      preferences: ["quiet"],
      notes: null,
      createdAt: new Date("2037-01-01T00:00:00.000Z"),
    },
    1,
  );
  assert.equal(candidate.prId, 7);
  assert.equal(candidate.canonicalPath, "/pr/7");
});

test("LIST projection preserves lifecycle status without becoming a candidate", () => {
  const record = toDiscoveryListRecord(
    {
      id: 8,
      title: "Study",
      type: "study",
      location: "Library",
      route: null,
      time: ["2038-01-01T00:00:00.000Z", "2038-01-01T01:00:00.000Z"],
      status: "CLOSED",
      minPartners: 2,
      maxPartners: 4,
      preferences: [],
      notes: null,
      createdAt: new Date("2037-01-01T00:00:00.000Z"),
    },
    2,
  );
  assert.equal(record.prId, 8);
  assert.equal(record.status, "CLOSED");
  assert.equal(record.partnerCount, 2);
});
