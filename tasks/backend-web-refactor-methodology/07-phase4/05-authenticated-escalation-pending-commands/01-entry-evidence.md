# 4-4 Entry Evidence

## Observed Current Path

```text
protected request
  -> lib/rpc authFetch observes 401 + AUTHENTICATED_REQUIRED
  -> shared policy imports OAuth login and schedules redirect
  -> command receives the same Response
  -> PR command writes pending action
  -> command-side auth-error path asks for OAuth again
  -> OAuth single-flight happens to collapse the duplicate
```

`oauth-login.ts` delays navigation through rAF plus a timer, so the pending write normally wins the race. That is an
implementation accident rather than an owned ordering guarantee. The static path also creates the known runtime SCC:
`lib/rpc -> shared auth policy -> OAuth login -> OAuth trace -> telemetry track -> lib/rpc`.

## Existing Continuation Facts

- Storage is one localStorage entry, validated, TTL-bounded to ten minutes, and currently contains five PR kinds.
- `PR_JOIN` and `PR_WAITLIST` resume their gate/UI; `PR_EXIT`, `PR_CONFIRM`, and `PR_PUBLISH` may run their
  previously confirmed action after eligibility is refreshed.
- Storage is cleared before the handler runs. Handler error does not restore it.
- `PR_WAITLIST` currently loses `alternativePrReminderOptIn` during UI resumption; preserving it is compatible with
  the existing command and does not automatically issue a write.
- PR create performs an explicit preflight and product rules prohibit automatic create replay.

## Evidence Boundaries

Focused frontend tests can prove the response-bound ordering, fallback claim, typed storage, handler readiness and
at-most-once behavior cheaply. A Browser-to-Backend scenario can prove the joined mock path, but cannot claim real
provider-console or distinct-origin production cookies; those remain 4-3.4 evidence.
