# Phase 4 Slice Map

## Topological Order

```text
4-0 inventory and characterization                              Complete
  -> 4-1 credentialed CORS / return-target containment           locally complete; rollout header observation pending
  -> 4-2 session and identity authority                          public-role decision first
  -> 4-3 OAuth handoff and callback compatibility                depends on 4-1 + 4-2; provider-console confirmation before topology change
  -> 4-4 authenticated escalation and pending commands           depends on 4-3
  -> 4-5 conditional compatibility closure                       named product/consumer decisions
```

`4-5` is intentionally conditional rather than a cleanup bucket. It can begin only with a specific decision about
route auto-login or a consumer-proven legacy facade; it does not block the security/session/handoff path unless
evidence shows a dependency.

## Per-Slice Packet Requirement

Before execution, each slice receives its own poly-file folder with:

1. task packet and precise owned paths;
2. entry delta and protected-path audit;
3. execution plan and mental rehearsal, including branch/rollback points;
4. evidence index and low-cost verification plan;
5. durable-doc promotion plan and exit evidence.

`4-1A` received its own explicit authorization and is the sole executed runtime slice in this map. All later slices
remain proposals; this map is not authorization to edit their runtime code.
