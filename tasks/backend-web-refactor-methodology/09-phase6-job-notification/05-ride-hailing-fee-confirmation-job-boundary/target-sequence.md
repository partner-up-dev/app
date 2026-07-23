# D6-F-01 Target Sequence

> Historical sequence. The current sequence is owned by
> [`../09-fee-confirmation-recovery/spec.md`](../09-fee-confirmation-recovery/spec.md);
> its generic retry may repeat a lost-response provider effect, and it has no
> RideHailing `UNKNOWN`/operator-generation branch.

## Normal Path

1. Payment provider callback/reconciliation reports payment success for the
   exact active BillLine execution tuple.
2. One narrow transaction compare-and-sets the BillLine to settled, recomputes
   whether all Bill charge lines are now paid, and on the first qualifying
   transition records RideHailing `feeConfirmation = REQUIRED` with generation
   1 and ensures one typed `ride-hailing.fee-confirm.v1` Job exists for that
   deterministic generation key.
3. The transaction commits. Bill payment truth no longer depends on the
   external fee-confirmation result.
4. JobRunner claims the Job.
5. The handler reloads Bill/RideHailing authoritative state, verifies the
   expected provider binding/generation and resolves the ratified immutable
   allowance inputs. A RideHailing command atomically advances `REQUIRED` to
   `IN_FLIGHT` before provider I/O; other states do not call the provider.
6. The handler calls provider `feeConfirm`.
7. A definite success records RideHailing `CONFIRMED`, then returns generic
   `SUCCEEDED`; JobRunner persists terminal task state and emits telemetry.

## Definite Failure

1. A definitely-not-applied transient failure may return RideHailing to
   `REQUIRED` and return `RETRYABLE_FAILURE` for the **same generation/Job**
   only when the provider result proves non-application and immediate
   repetition is safe.
2. A definite permanent non-application leaves the RideHailing consequence
   `REQUIRED` with its bounded owner/action reason, ends the old Job with generic
   `PERMANENT_FAILURE`, and requires an operator-authorized new generation after
   the cause is corrected.
3. Neither branch mutates or repeats Bill settlement.

## Ambiguous Provider Outcome

1. The provider may have accepted the call, but the response is lost.
2. The handler records RideHailing `UNKNOWN` and returns generic
   `PERMANENT_FAILURE`, which terminally fails the task without teaching Job the
   business meaning. If the process crashes after entering `IN_FLIGHT`, a
   later handler invocation treats stale in-flight state conservatively and
   never repeats provider I/O automatically; it records owner `UNKNOWN` and
   ends the task through the same generic result.
3. A RideHailing operator command receives evidence from an approved provider
   query/console or support channel.
4. Proven application records `CONFIRMED`. Proven non-application plus a safe
   retry rule after `UNKNOWN` advances the owner generation and creates a new
   Job. Ambiguity keeps `UNKNOWN`. The old Job is terminal and is not a
   business recovery surface. This operator path is distinct from a
   definitely-not-applied same-generation infrastructure retry.

## Duplicate Payment Notification

1. Bill reports `ALREADY_SETTLED` for the same payment tuple.
2. The RideHailing confirmation generation and deterministic Job key prove the
   required handoff already exists; no new FeeConfirmation Job and no second
   settlement are created.
3. Legacy settled rows missing the Job require an explicit backfill/recovery
   path, not an unconditional provider replay.
