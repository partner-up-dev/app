# `6-3.1a` Rehearsal

- A rebuilt task must not preserve an obsolete start time merely because an old
  terminal causal task exists; mutable reminder work uses owner-private active
  replacement, not permanent causal dedupe.
- Two reconciliation requests for the same recipient/PR may overlap. Their
  replacement must serialize on the stable active identity so at most the
  latest pending/retry task remains; a stale `RUNNING` task is allowed to
  finish only because dispatch revalidates its semantic activity time.
- Recipient-scope opt-out and aggregate-scope reconciliation may overlap. Both
  operations must serialize on the same recipient/template/channel coordination
  identity even though the aggregate operation selects only one PR prefix;
  otherwise an opt-out can race a replacement back into `PENDING`.
- Preference/credit may turn ineligible after request-time validation but
  before the serialized replacement commits. The request path rechecks that
  state after scheduling and performs serialized aggregate invalidation when
  it changed; if it changes after that recheck, the opt-out's serialized
  recipient invalidation is ordered after the replacement instead.
- A user exits after reconciliation but before dispatch: current slot check
  skips and credit remains unchanged.
- Credit becomes positive again: user-level rebuild invokes the same reconciler
  rather than a separate concrete scheduler.
- A user opts out after stale or no-longer-active generic work exists: semantic
  recipient invalidation removes every pending/retry generic activity task,
  not only tasks whose current PR slot happens to be enumerable. Rebuild then
  uses only current active PR facts.
- If a pure reconciliation cannot derive activity time without mutating PR,
  stop; do not call temporal refresh from Notification.
