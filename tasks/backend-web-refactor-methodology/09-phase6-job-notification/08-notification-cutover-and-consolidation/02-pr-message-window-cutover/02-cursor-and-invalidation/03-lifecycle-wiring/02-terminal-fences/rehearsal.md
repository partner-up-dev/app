# `6-3.2b-3.2` Rehearsal

- A terminal check only at source loses a race against an already-created job;
  a dispatch check only leaves a held reservation around. Both are required.
- The named terminal port must lock `PR → active roster` before it changes
  status. If a message source wins that lock, terminal release sees and
  releases its just-committed window; if terminal wins, source observes the
  terminal status and persists compatibility content without scheduling.
- Temporal expiry currently counts participants before a direct status update.
  The new port must recalculate the terminal target after taking the PR lock,
  so a concurrent admission cannot select the wrong `CLOSED` versus `EXPIRED`
  state between count and write.
- Deriving a nonterminal capacity status is not necessarily a terminal
  transition. Touch only `CLOSED` / `EXPIRED` paths unless evidence proves a
  different product policy.
- Capture recipients before changing/cascading state and release inside the
  transaction. Do not use a generic Job query to reconstruct the roster.
- The old concrete handler is a drain compatibility path. Preserve it; add a
  narrow terminal guard: its current `preparePRMessageNotificationDispatch`
  checks PR existence and membership but not `CLOSED` / `EXPIRED`, so it can
  otherwise produce an external effect after terminal state. This guard must
  not add any new legacy source write.
