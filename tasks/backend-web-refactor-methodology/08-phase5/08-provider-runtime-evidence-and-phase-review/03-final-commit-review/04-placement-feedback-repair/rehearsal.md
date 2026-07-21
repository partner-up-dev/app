# 5-7b.3 Rehearsal And Low-Cost Proof

## Evidence Needed Before Editing

- `PRPage` builds a new `placementMatchingContext` from the current PR facts.
- Placement matching and ordering admission both receive that same context.
- `ButtonPlacement` persists while `/pr/:id` changes, so its local flow can
  outlive a context.
- The flow is the single owner of `admissionOutcome`, pending id, handoff, and
  navigation side effects.

All four are confirmed by source inspection.

## Mutation Design

1. Add a local monotonic generation in `usePlacementOrderingEntryFlow`.
2. Expose a reset that advances the generation and clears feedback/pending
   state.
3. Capture the generation per admission request. After an await, discard a
   response or error if its generation is no longer current; only current
   requests may set outcome, handoff, or route.
4. Watch `matchingContext` and `placement.id` in `ButtonPlacement` and invoke
   that reset on change. Do not use an immediate watcher: initial mount has no
   stale feedback to clear.

## Branch Simulation

| Branch | Expected result |
| --- | --- |
| Current context returns `NON_CREATOR` | message appears; no handoff/navigation |
| Current context returns `CREATOR_ELIGIBLE` | existing handoff and `/order/new` navigation remain unchanged |
| Context changes after a completed response | message disappears without remount |
| Context changes while request is pending | response returns no outcome and cannot write message/handoff/navigation |
| Placement changes within one context | prior feedback disappears; next click uses backend again |
| Current request errors | existing error behavior remains visible to the caller; only stale errors are suppressed |

## Cheap Verification

1. Extend the flow unit test with a deferred admission response, invalidate it,
   resolve it, and assert no outcome/router/handoff mutation.
2. Mount `ButtonPlacement` once under a reactive parent context. Produce
   `NON_CREATOR`, update context without unmounting, and assert the exact same
   button node remains while the feedback disappears.
3. Run only these two files under the frontend Vitest project, then changed
   Web lint/type checks.

## Unexpected Results

- If a context change does not trigger the watcher, verify the prop reference
  is actually replaced by `PRPage`; do not fall back to serializing unknown
  context without first identifying the stable owner-provided identity.
- If a late response still writes a side effect, move the generation check
  before every side effect inside the flow rather than adding UI-only guards.
- If the test needs a full route/browser harness to prove non-remount, retain
  the source guard and add the smallest existing page-route harness; do not
  add a new E2E framework for this slice.
