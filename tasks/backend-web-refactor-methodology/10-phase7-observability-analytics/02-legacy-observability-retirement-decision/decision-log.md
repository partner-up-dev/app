# `7-1` Decision Log

| ID | State | Decision / recommendation | Consequence |
| --- | --- | --- | --- |
| D7-01 | **Ratified by Sir** | Existing SLS queries and structured output are historical convenience errors, not target observability | They are deletion inputs, never compatibility requirements |
| D7-02 | **Ratified by Sir** | Remove repository FC/SLS coupling completely: `s.yaml` log variables/config, CI variables, validator requirements and durable claims | Current SLS log/request/instance-metric convenience disappears; deployment must still validate |
| D7-03 | **Ratified by Sir** | Remove production request/debug/structured diagnostic output selected by the ledger; retain CLI/dev/test terminal UX | Clean baseline without destructive repository-wide `console.*` churn |
| D7-04 | **Closed by Sir on 2026-07-23** | SLS has no configured saved queries/dashboard; no further platform-artifact inventory or cleanup is required for this Phase | Records operator evidence/decision without claiming an environment audit or deletion by Codex |
| D7-05 | **Ratified by Sir** | Retire `operation_logs`, all production writers and stale guidance through a forward migration | Historical rows are intentionally deleted; no replacement audit/O11y mechanism is introduced |
| D7-06 | **Ratified with the boundary** | Keep `notification_deliveries` for the future professional replacement/data decision | Phase 7 cannot claim replacement proof |
| D7-07 | **Ratified by Sir** | Do not implement the professional replacement in Phase 7; hand it requirements and a clean baseline | Avoids turning cleanup into another premature architecture choice |
| D7-08 | Retained invariant | User telemetry remains separate and non-authoritative | Analytics refactoring cannot fill the program-O11y gap |
| D7-09 | Retained invariant | Preserve consent/collection behavior and defer undefined metric formulas | Structural work cannot invent product policy |

## `7-2` Entry Result

D7-01 through D7-09 are closed. D7-04 was initially isolated as an external
gate and is now closed by Sir's operator evidence/decision. Application and
deployment mutation was explicitly started with the remainder of Phase 7.
