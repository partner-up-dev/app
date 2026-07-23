# `6-3.2c` Plan

1. **`6-3.2c-1` semantic contract — complete.** Added the named Notification
   acknowledgement surface and its private generic-Job adapter; add the
   PR-owned active-participant/all-row-cursor use case and the narrow
   `POST /acknowledgement` transport route. The command returns only
   semantic success, not Job state.
2. **`6-3.2c-2` visible Web route — complete.** Retired the new client's automatic
   read-marker mutation. A PR-domain visible-ack workflow waits for component
   render commit and `document.visibilityState === "visible"`; only the
   dedicated messages route opts in. It attempts one same-cursor retry after a
   transient failure and permits a later visibility event or response cursor
   to retry again.
3. **`6-3.2c-3` proof and promotion — complete.** Added a focused real-Postgres HTTP
   scenario for raw GET/read-marker/nonparticipant/tombstone/stale/covering
   semantics; add a happy-dom Web workflow proof and one Playwright
   Web → backend → Postgres route scenario. Then promote the exact route and
   removed client compatibility projection to durable contracts.

## Implementation Order And Dependencies

`c-1` must land before the typed Web mutation can compile. `c-2` must not
remove the server compatibility route, because older deployed Web bundles can
still drive historical concrete-job/inbox drain. `c-3` may add its backend and
Web tests alongside the preceding children, but it is not complete until the
system scenario observes a held generic reservation released only after the
visible route is rendered.

## Cheapest Verification

- happy-dom workflow test for next-tick + hidden-document fence + exact
  same-cursor retry;
- focused backend scenario for all-row cursor validation plus stale/covered
  semantic ACK;
- one system scenario opens page, observes held → released → later-message
  reopen state;
- overlap fixture proves raw GET and legacy marker leave a generic window held.
