# `6-3` Executable Micro-Slice Map

## Ordered Source Work

```text
6-3.1a activity-start recoverable vertical (locally complete)
  → 6-3.1b confirmation recoverable vertical (locally complete)
  → 6-3.1c transaction-bound scheduling foundation + first promoted-handoff proof (core locally complete)
     → 6-3.1c-1 waitlist-cycle causation + stale-task fence (locally complete)
     → 6-3.1c-2 PR active-admission serializability (locally complete)
     → 6-3.1d new-partner atomic vertical (locally complete)
     → 6-3.1e PR-ready atomic vertical (locally complete)
     → 6-3.1f meeting-point atomic vertical (locally complete)
  → 6-3.1g waitlist-alternative pure-query/recovery vertical (locally complete)
  → 6-3.2a-1 PR-message owner/window contract (locally complete)
  → 6-3.2a-2 PR-message atomic persistence source (locally complete)
  → 6-3.2a-3 PR-message producer cutover + legacy drain (locally complete)
  → 6-3.2b-1 cursor + tombstone foundation (locally complete)
     → 6-3.2b-2 generic Job / Notification invalidation foundation (locally complete)
     → 6-3.2b-3 PR-message lifecycle invalidation wiring (locally complete)
        → 6-3.2b-3.1 participant removal release (locally complete)
        → 6-3.1h transaction-bound Notification facade closure (review-found corrective; locally complete)
        → 6-3.2b-3.2 terminal source/dispatch fences (locally complete)
        → 6-3.2b-3.3 admin tombstone + root-delete release (locally complete)
        → 6-3.2b-3.4 PR_MESSAGE subscription-controller conversion (locally complete)
        → 6-3.2b-3.5 lifecycle matrix + durable promotion (locally complete)
  → 6-3.2c visible Web ACK + overlap compatibility proof (locally complete)
  → 6-3.3 legacy state/decoder retirement (locally complete under explicit old-Job/client cut-off)
```

`6-3.1c-1` and `6-3.1c-2` are review-found prerequisite repairs: new-partner
cannot claim atomic direct-join behavior before both close. `6-3.1d`–`6-3.1f`
share the narrow transaction-bound scheduling mechanism but remain sequential
source mutations because their business transitions and failure proofs are
distinct. `6-3.1g` is intentionally after the generic one-shot expansion: its
primary risk is removal of a PR mutation from Notification eligibility/recovery,
not scheduling mechanics.

## Per-Slice Cheapest Credible Verification

| Slice | First failure/behavior proof |
| --- | --- |
| `6-3.1a` | fixed-clock reconciler is idempotent; stale slot dispatch skips; opt-out cancellation works |
| `6-3.1b` | both trigger policies keep their distinct timing/tolerance; rebuild/cancel is idempotent |
| `6-3.1c` | injected transaction-bound writer failure keeps promoted slot pending; success produces one generic causal Job |
| `6-3.1c-1` | a reused slot yields a new causal Job and an old delayed task skips after re-entry/re-promotion |
| `6-3.1c-2` | parallel direct join/promotion leaves active count within capacity and never lets direct join leapfrog an eligible waiter |
| `6-3.1d` | join + writer failure rolls back slot/reliability/status; success freezes intended recipient fan-out |
| `6-3.1e` | manual and temporal READY transition roll back on writer failure; a ready-cycle fence skips status reversal or a later READY re-entry |
| `6-3.1f` | each of three update entrances preserves a distinct causation; failure rolls back that update |
| `6-3.1g` | pure query never calls temporal refresh; reconcile recreates exactly one valid current task |
| `6-3.2a-1` | private message template binds one generic HELD policy; absent channel/context cannot send or hold |
| `6-3.2a-2` | injected reservation failure rolls back message and every target reservation |
| `6-3.2a-3` | three producers write only generic windows; coalesce/terminal-held/stale/covering ACK matrix and old-row drain pass |
| `6-3.2b-1` | delete/tombstone high-water leaves `acknowledgementCursor` monotonic while visible thread hides it |
| `6-3.2b-2` | generic held release serializes private key work; Notification owns semantic mapping |
| `6-3.2b-3.1` | each membership removal releases only the departing recipient; a rejoin never replays old work |
| `6-3.1h` | every source domain hands only its transaction executor to Notification; no source imports or constructs a Job writer |
| `6-3.2b-3.2` | terminal transition releases current recipients, source refuses a new window, and stale dispatch skips |
| `6-3.2b-3.3` | tombstone/root delete release source-linked work before hiding/cascade, including an explicit former-recipient compatibility decision |
| `6-3.2b-3.4` | authenticated subscription and generic `43101` share serialized clear/restore semantics without history replay |
| `6-3.2b-3.5` | full lifecycle matrix and reverse-edge audit prove no changed path writes legacy PR-message state |
| `6-3.2c` | raw GET/hidden render does not ACK; mounted visible route does; failed same-cursor ACK retries |
| `6-3.3` | explicit cut-off + source zero-reference checks; forward table drop and concrete/no-cycle decoder retirement |

## Completion Rule

A child becomes locally complete only when its focused proof and relevant
backend gates pass, its legacy compatibility condition is recorded, and its
parent plan is updated. All three parent sub-tasks and their local runtime gates
are complete; `notification_deliveries` retirement is an explicit Phase 7
handoff rather than an open `6-3` child.
