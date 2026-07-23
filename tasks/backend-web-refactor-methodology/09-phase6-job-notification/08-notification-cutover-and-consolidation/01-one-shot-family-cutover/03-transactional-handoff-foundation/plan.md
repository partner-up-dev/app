# `6-3.1c` Plan

1. Extract generic `ONCE_PER_CAUSE` policy-to-scheduler mapping from the default
   runtime adapter so the identical private policy can target a
   `JobTransactionWriter`.
2. Define one named, non-public transaction-bound Notification scheduling port.
   Its input remains an ordinary semantic `NotificationRequest`; its only
   concrete caller is the PR promotion integration.
3. Add named executor-aware seams for the exact PR slot, reliability and PR
   status operations. Add a PR-row lock and re-read capacity/FIFO facts inside
   the candidate transaction; do not introduce a generic repository executor
   façade or duplicate SQL in waitlist service.
4. Refactor each successful candidate promotion into that short transaction:
   promotion + reliability + status + generic Job write. Keep new-partner,
   activity/confirmation reconciliation and operation log work after commit.
5. Invert the existing `6-2` debt scenario: injected transaction-writer failure
   leaves candidate pending, reliability/status unchanged and no generic Job;
   success proves exactly one `ONCE_PER_CAUSE` Job, with repeat coalescing.

## Cheapest Verification

- fake transaction writer fails → no promotion/reliability/status mutation;
- real Postgres promotion → one slot + one generic task;
- duplicate semantic promotion remains coalesced;
- old promoted Job remains registered for pending legacy rows.

## Delegation And Verification Shape

- Notification-core work owns private policy reuse, the transaction-bound
  scheduler adapter and owner-level fake-writer proof.
- PR transaction work owns executor-aware named repository methods, row lock
  and candidate mutation unit. It does not alter Notification public contracts.
- Integration work owns waitlist composition, post-commit separation and real
  Postgres scenario proof.

The final integrator reruns backend lint/type/build, the focused owner and
waitlist tests, and the real scenario after the independently cheap fake-writer
proof passes.

## Follow-On Gate

Do not begin `6-3.1d` merely because this candidate-level proof is green.
`08-waitlist-cycle-causation` must first make a reused slot's second promotion
a distinct causal task and stale-task fence; `09-pr-admission-serializability`
must then give direct join and publish-time creator admission the same PR lock.
