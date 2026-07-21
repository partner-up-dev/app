# 5-6A.3.1 Implementation Log

## 2026-07-20 — Explicit Bill, Payment, And Trade Edges

- Bill now exposes final Bill materialisation and retained target reconciliation through `commands`, and the
  payment-state derivation through `queries`.
- Payment exposes the retained refund execution through `commands`.
- Trade exposes the order item-name projection through `queries` and two Bill-facing allocation types through
  `contracts`.
- Bill Detail, Ride final settlement, Trade settlement/detail, and retained Rental termination now import their
  owner category rather than a domain root.
- No Rental runtime guard, provider retry policy, correction/refund product behaviour, or transaction boundary was
  changed. The retained Rental termination implementation merely names its existing owner dependencies.

### Local proof

- `pnpm check:type:backend` — passed.
- `pnpm check:lint:backend` — passed.
- `git diff --check` — passed.

Focused callback and Rental-history scenarios remain part of the combined Phase 5 proof after concurrent category
and test-language batches stabilize.
