# Phase 4 Slice Map

## Topological Order

```text
4-0 inventory and characterization                              Complete
  -> 4-1 credentialed CORS / return-target containment           locally complete; rollout header observation pending
  -> 4-2 session and identity authority                          Complete locally; public session contract promoted
  -> 4-3 OAuth handoff and callback compatibility                local semantics complete; provider-console confirmation still required before topology change
  -> 4-4 authenticated escalation and pending commands           depends on 4-3
  -> 4-5 conditional compatibility closure                       named product/consumer decisions
```

## 4-3 Internal Order

1. 4-3.1 Backend terminal-handoff semantics.
2. 4-3.2 Web terminal recovery and direct-callback compatibility.
3. 4-3.3 Focused, topology-honest journey proof.
4. 4-3.4 Callback authority and rollout evidence. This remains an external stop branch, not a pretext to block
   the local contract work or manufacture production proof.

The packet, ownership, decision record, rehearsals, and proof matrix are under
[04-oauth-handoff-callback-compatibility](./04-oauth-handoff-callback-compatibility/).

`4-5` is intentionally conditional rather than a cleanup bucket. It can begin only with a specific decision about
route auto-login or a consumer-proven legacy facade; it does not block the security/session/handoff path unless
evidence shows a dependency.

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

`4-1` and `4-2` are complete locally under their own packets. 4-3 is explicitly authorized and must stay inside
its packet; 4-4 and 4-5 remain proposals and this map is not authorization to edit their runtime code.
