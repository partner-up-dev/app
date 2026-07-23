# `6-3.2b-3.2` Plan

1. **Preflight complete:** the only manual terminal entry is
   `updatePRStatus(..., "CLOSED")` (including its admin delegation); temporal
   finalization selects `CLOSED` or `EXPIRED` in `refreshTemporalStatus`.
2. Add a named `pr-terminal-transition-transaction` rather than widening an
   existing generic status helper. It locks PR → active roster, computes the
   temporal target under that lock when applicable, updates status, then fans
   out exact Notification invalidation using the same executor.
3. Replace only the direct terminal status writes with that port. Preserve
   post-commit operation logs/telemetry/reconciliation and existing nonterminal
   status paths.
4. Add a source-time terminal branch in the locked PR-message persistence
   transaction before Notification hand-off. It still writes the compatible
   message but opens no attention window.
5. Add `PR_TERMINAL` to the generic PR-message context / Notification dispatch
   union. Add the same narrow terminal check to the concrete legacy handler's
   current PR lookup; it remains a drain handler and writes no new legacy state.
6. Prove manual and temporal transitions with real Postgres held windows;
   prove generic and legacy dispatch skip before channel I/O.
