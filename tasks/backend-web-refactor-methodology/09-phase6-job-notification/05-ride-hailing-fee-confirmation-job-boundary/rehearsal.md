# D6-F-01 Rehearsal

> Historical rehearsal. Ambiguity/no-replay/operator cases were superseded by
> Sir's 2026-07-23 accepted-risk decision; use the executable `6-4` rehearsal.

## Proof Gates

| Gate | Cheapest credible proof |
| --- | --- |
| settlement and Job handoff cannot split | isolated Postgres failure-injection test around BillLine compare-and-set + Job insertion |
| duplicate callback/reconciliation creates one Job | concurrent exact-payment-tuple scenario with terminal-safe causation uniqueness |
| handler uses authoritative inputs | unit test with typed payload references and reloaded Bill/RideHailing state |
| no intent entity is required | state/use-case ledger showing settlement belongs to Bill, confirmation truth to RideHailing, task mechanics to Job |
| ambiguous outcome cannot auto-retry | fake provider accepts then drops response; RideHailing becomes `UNKNOWN`, handler returns generic `PERMANENT_FAILURE`, later ticks make no provider call |
| crash after provider boundary cannot replay | stale RideHailing `IN_FLIGHT` plus expired Job lease re-enters handler without calling provider |
| operator action cannot repeat settlement | RideHailing reconciliation command changes owner state/creates a new generation Job while BillLine and old Job remain unchanged |
| legacy F-02 gap is recoverable | migration/backfill fixture for settled RideHailing Bills with no FeeConfirmation Job |

## Implementation Evidence Gates Before `6-4`

1. Confirm through provider documentation/runtime evidence whether repeated
   `feeConfirm(order_id)` is idempotent or whether a confirmation-status query
   exists.
2. Determine the semantic source/default and unit contract for both required
   allowance fields. Do not assume that `finalSettlementInput.amountFen` means
   either allowance.
3. Choose the exact causation identity. Candidate: RideHailing order + final
   Bill/payment-completion generation, not a mutable request timestamp.
4. Choose the narrow transaction owner/port that can persist BillLine
   settlement and Job without teaching Bill provider mechanics.
5. Define RideHailing fee-confirmation state retention and operator command
   authorization/audit; Job retention remains a generic task policy.
6. Define how pre-migration settled rows are classified without blindly
   calling the provider.

## Rejected Shortcut

Running `confirmFee` whenever payment reconciliation returns
`ALREADY_SETTLED` is not a recovery design. It can duplicate an already-applied
external consequence and cannot distinguish a missing Job from an ambiguous or
completed one.
