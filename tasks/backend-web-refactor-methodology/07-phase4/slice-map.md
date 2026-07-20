# Phase 4 Slice Map

## Topological Order

```text
4-0 inventory and characterization                              Complete
  -> 4-1 credentialed CORS / return-target containment           locally complete; rollout header observation pending
  -> 4-2 session and identity authority                          Complete locally; public session contract promoted
  -> 4-3 OAuth handoff and callback compatibility                local semantics complete; provider-console confirmation still required before topology change
  -> 4-4 authenticated escalation and pending commands           locally complete; focused proof/promotions complete, canonical-host limitation recorded
  -> 4-5 conditional compatibility closure                       Complete locally; route promise and private facade closure verified
  -> completion review                                            Complete; P1 stale-navigation and P2 whitespace-openid repairs verified
```

## 4-3 Internal Order

1. 4-3.1 Backend terminal-handoff semantics.
2. 4-3.2 Web terminal recovery and direct-callback compatibility.
3. 4-3.3 Focused, topology-honest journey proof.
4. 4-3.4 Callback authority and rollout evidence. This remains an external stop branch, not a pretext to block
   the local contract work or manufacture production proof.

The packet, ownership, decision record, rehearsals, and proof matrix are under
[04-oauth-handoff-callback-compatibility](./04-oauth-handoff-callback-compatibility/).

## 4-4 Internal Order

1. Establish a transport-to-process escalation boundary without a static `lib/rpc` to OAuth-process import.
2. Make the pending-action protocol explicit: typed intent, bounded lifetime, command-owned claim, and
   at-most-once continuation.
3. Reconcile the five existing PR continuations, including the waitlist preference payload, while keeping create
   and intentionally no-replay commands outside the protocol.
4. Attempt one real Browser-to-Backend mocked-OAuth journey, then promote only the stable contract. If canonical
   host/cookie scope prevents faithful continuation, record that limitation and the strongest lower proof rather
   than forging browser state.

The packet, rehearsals, and proof matrix are under
[05-authenticated-escalation-pending-commands](./05-authenticated-escalation-pending-commands/).

`4-5` was intentionally conditional rather than a cleanup bucket. Sir supplied the `/bills` route-entry promise;
the bounded local consumer inventory then cleared the two named private facades. The result does not convert
protected routes without explicit policy into route-login routes, nor does it close external deployment history.

4-3.1–4-3.3 now have focused Backend/Web proof, type/lint/build validation, and a compact OAuth Unit TDD
promotion. The system harness remains intentionally unmodified because its proxy topology cannot establish
distinct-origin cookie behavior. 4-3.4 is still an external evidence stop branch, not an unfinished local code
slice.

## Per-Slice Packet Requirement

Before execution, each slice receives its own poly-file folder with:

1. task packet and precise owned paths;
2. entry delta and protected-path audit;
3. execution plan and mental rehearsal, including branch/rollback points;
4. evidence index and low-cost verification plan;
5. durable-doc promotion plan and exit evidence.

`4-1`, `4-2`, 4-4, and 4-5 are complete locally under their own packets. 4-3 stays inside its packet with an external
topology stop branch. The completion review verifies that Phase 4 has no remaining local implementation slice open;
the named rollout, provider, edge, and topology observations remain external evidence branches.
