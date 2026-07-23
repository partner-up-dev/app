# Phase 6 Ratified Slice Map

## Dependency Shape

```text
6-0 evidence / authority inventory
 └─ D6-N-01 Notification dispatch-model decision (ratified)
 └─ D6-J-02 windowed-creation / future-O11y decision (corrected)
 └─ D6-F-01 FeeConfirmation boundary (simplified by 2026-07-23 decisions)
       |
      6-1 JobRunner execution + creation-reservation foundation
       ├─ 6-2 Notification owner surface + representative vertical cutover
       |    └─ 6-3 remaining Notification cutover + state consolidation
       └─ 6-4 F-02 atomic fee-confirmation Job handoff
                    \                    /
                     6-5 local runtime proof + compatibility retirement + review
```

This is a dependency graph, not permission to execute every successor.
`D6-N-01` is a pre-execution discussion packet, not a source slice: its revised
proposal chooses a stable business-template surface, Job-as-Notification-Task,
and a business-template/channel binding. D6-J-02 places wave semantics in a Job
creation mode and removes PR inbox persistence from the target. Attempt
telemetry belongs to future real observability infrastructure, not a Phase 6
console sink. The corrected fee-confirmation decision uses one generic Job,
with no duplicate RideHailing ambiguity state. Official CaoCao docs make both
allowances optional; Sir accepts lost-response duplicate-effect risk and a
forward-only historic-row cut-over.

All source slices are locally complete. `6-3` closed the named handoff debt and
retired opportunity/wave/inbox, concrete per-kind decoders and no-cycle generic
compatibility under Sir's explicit forward cut-off. `6-4` atomically creates a
typed fee-confirmation Job from qualifying RideHailing settlement and uses only
generic Job dispositions. `6-5` proved the injectable request-tail/tick seam,
protected aggregate diagnostic, scoped console cleanup and full regression
matrix.

The graph above remains the durable dependency explanation; it is no longer an
execution queue. Real O11y and `notification_deliveries` retirement are Phase 7
work.

## Entry Gates

| Slice | Information required before source edits | Cheapest credible verification |
| --- | --- | --- |
| `6-1` | injectable JobRunner/store seams; versioned definitions and legacy adapter; `ONCE`, terminal-safe `ONCE_PER_CAUSE` and `UNTIL_ACKNOWLEDGED`; per-claim lease token/CAS; structured dispositions with generic `SKIPPED`/`CANCELED`; no business state or console telemetry sink | pure state/outcome/timing/stale-claim tests plus isolated Postgres transaction, insert/coalesce/terminal-held/stale-ACK/concurrent schedule-versus-ACK proof |
| `6-2` | complete business-template vocabulary and typed payload correlation; private template/channel binding; logical limited/unlimited credit without speculative WeChat null migration; dispatch-time authoritative reload; conservative ambiguous-provider classification; WAITLIST_PROMOTED owner-surface exemplar | import ledger + compile-time template fixtures + handler disposition/credit matrix + focused exemplar regression; handoff reliability remains named `6-3` debt |
| `6-3` | named per-template atomic-or-recoverable handoff; atomic PR-message commit + HELD/high-water; mounted/rendered/visible-thread ACK with retry; opportunity/wave/inbox migration/retirement under explicit old-Job/client cut-off | named transaction rollback proof + forward migration/source-reference audit + full Notification kind matrix + cross-unit PR-message open/coalesce/terminal-held/stale-ACK/covering-ACK/reopen scenarios |
| `6-4` | official `order_id`-only contract; exact payment-tuple/all-zero settlement + terminal-safe Job transaction; RideHailing-internal handler; ordinary generic retry; no owner state/operator/backfill | transaction topology + generic writer rollback and uniqueness proof + exact replay/all-zero fixtures + adapter serialization and generic handler disposition tests |
| `6-5` | local runtime/recovery proof; remove console/stdout diagnostics; final legacy-state retirement and Phase review; retain `notification_deliveries` and defer real O11y | full static/unit/backend/system gates + authenticated tick/request-tail seam + zero current-source references to retired state |

## Deliberate Non-Goals

- Do not equate a historical `outbox_events` table with a current outbox.
- Do not migrate every existing notification kind in a big bang.
- Do not generalize the explicit CaoCao duplicate-effect risk acceptance into a
  cross-provider retry rule.
- Do not let a frontend cache, FC timer, or request-tail kick become durable
  delivery authority.
