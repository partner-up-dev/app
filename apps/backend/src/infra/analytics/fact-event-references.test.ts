import assert from "node:assert/strict";
import { test } from "vitest";
import { type FactEventReferenceGroup, getFactEventReferenceIssues } from "./fact-event-references";
import { PR_CREATE_FUNNEL_EVENT_NAMES } from "./pr-create-funnel.model";
import { PR_JOIN_FUNNEL_EVENT_NAMES } from "./pr-join-funnel.model";

const currentFactReferences: FactEventReferenceGroup[] = [
  {
    factName: "fact_pr_join_funnel_event",
    eventNames: PR_JOIN_FUNNEL_EVENT_NAMES,
    requiredBIUsage: "pr_join_funnel",
  },
  {
    factName: "fact_pr_create_funnel_event",
    eventNames: PR_CREATE_FUNNEL_EVENT_NAMES,
    requiredBIUsage: "pr_create_funnel",
  },
];

test("current BI fact event references are registered, active, and usage-declared", () => {
  assert.deepEqual(getFactEventReferenceIssues(currentFactReferences), []);
});

test("fact event reference guardrail reports registry drift", () => {
  assert.deepEqual(
    getFactEventReferenceIssues([
      {
        factName: "fact_test",
        eventNames: ["unknown.event"],
        requiredBIUsage: "test_usage",
      },
      {
        factName: "fact_test",
        eventNames: ["journey.started"],
        requiredBIUsage: "test_usage",
      },
      {
        factName: "fact_test",
        eventNames: ["segment.started"],
      },
    ]),
    [
      {
        factName: "fact_test",
        eventName: "unknown.event",
        eventVersion: 1,
        reason: "unregistered",
      },
      {
        factName: "fact_test",
        eventName: "journey.started",
        eventVersion: 1,
        reason: "missing_bi_usage",
      },
      {
        factName: "fact_test",
        eventName: "segment.started",
        eventVersion: 1,
        reason: "deprecated",
      },
    ],
  );
});
