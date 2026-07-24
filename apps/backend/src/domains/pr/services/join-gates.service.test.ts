import assert from "node:assert/strict";
import { test } from "vitest";
import type { PRJoinGateConfig } from "../contracts/join-gate";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

const eventGate: PRJoinGateConfig[number] = {
  kind: "JOIN_NOTICE",
  key: "shared-notice",
  version: "v1",
  title: "Event notice",
  source: "PR_TYPE_CONFIG",
  body: "Read type notice",
};

const prGate: PRJoinGateConfig[number] = {
  kind: "JOIN_NOTICE",
  key: "pr-notice",
  version: "v1",
  title: "PR notice",
  source: "PR",
  body: "Read PR notice",
};

test("buildMaterializedPRJoinGateConfig merges type config and PR gates", async () => {
  const { buildMaterializedPRJoinGateConfig } = await import("./join-gates.service");

  const gates = buildMaterializedPRJoinGateConfig({
    prTypeConfig: { joinGateConfig: [eventGate] },
    prGates: [prGate],
  });

  assert.deepEqual(
    gates.map((gate) => `${gate.source}:${gate.key}`),
    ["PR_TYPE_CONFIG:shared-notice", "PR:pr-notice"],
  );
});

test("buildMaterializedPRJoinGateConfig dedupes repeated config gates", async () => {
  const { buildMaterializedPRJoinGateConfig } = await import("./join-gates.service");

  const gates = buildMaterializedPRJoinGateConfig({
    prTypeConfig: {
      joinGateConfig: [eventGate, { ...eventGate, title: "Updated" }],
    },
  });

  assert.equal(gates.length, 1);
  assert.equal(gates[0]?.title, "Updated");
});

test("buildMaterializedPRJoinGateConfig lets an explicit PR gate override config", async () => {
  const { buildMaterializedPRJoinGateConfig } = await import("./join-gates.service");

  const gates = buildMaterializedPRJoinGateConfig({
    prTypeConfig: { joinGateConfig: [eventGate] },
    prGates: [{ ...prGate, key: eventGate.key }],
  });

  assert.deepEqual(gates, [{ ...prGate, key: eventGate.key }]);
});
