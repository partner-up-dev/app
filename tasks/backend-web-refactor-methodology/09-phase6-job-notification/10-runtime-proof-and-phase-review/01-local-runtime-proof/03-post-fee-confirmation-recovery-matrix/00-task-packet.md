# `6-5.1c` — Post-Fee-Confirmation Recovery Matrix

## Status

**Locally complete on 2026-07-23.**

## Objective

Exercise generic lease/retry/timing behavior against the typed RideHailing
handler without inventing provider-effect business state.

## Scope

- expired lease/stale completion;
- retry exhaustion/missed timing/HELD reservation/ACK; and
- fee-confirmation success, ordinary retry/exhaustion and accepted duplicate
  risk, with no owner `UNKNOWN`/operator branch.

## Exit

The full local recovery matrix is green; future O11y remains explicitly
deferred.
