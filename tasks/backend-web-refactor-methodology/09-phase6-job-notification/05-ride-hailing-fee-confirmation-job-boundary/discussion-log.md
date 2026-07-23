# D6-F-01 Discussion Log

## Sir's Objections

1. A RideHailing fee-confirmation intent appears to duplicate the durable Job,
   just as Notification Intent duplicated the Notification Job task.
2. The wording “operator replay acts on the intent and never replays Bill
   settlement” obscures the real order: fee confirmation happens only after
   settlement.

Both objections are supported by the current source trace.

## Sir's Reconciliation-Owner Correction

Sir then rejected `RECONCILIATION_REQUIRED` as a Job state. That correction is
also accepted: provider-effect uncertainty is RideHailing business truth. Job
is an execution container and must not interpret or own its payload's business
outcome.

## Corrected Interpretation

“Do not replay settlement” was intended as a recovery-scope guardrail, not a
claim that fee confirmation precedes settlement. A less misleading statement
is:

> BillLine payment settlement commits first and atomically creates, or
> atomically records RideHailing `feeConfirmation = REQUIRED` and creates one
> FeeConfirmation Job. Recovery reconciles RideHailing provider state; it never
> invokes the settled transition again or converts Job into the business owner.

The operator does not replay an intent or directly repair a Job. A RideHailing
command applies provider evidence:

- provider definitely applied confirmation → RideHailing becomes `CONFIRMED`;
- provider definitely did not apply it and retry is safe → RideHailing advances
  generation to `REQUIRED` and creates a new Job;
- evidence remains ambiguous → RideHailing stays `UNKNOWN`; no Job is replayed.

## Why An Intent Does Not Help

- Atomicity: an intent plus Job still must be written atomically or handed off
  recoverably; one extra row does not close the settlement-to-work gap.
- Ambiguity: a local intent cannot prove whether the provider accepted a lost
  response.
- Dedupe: Job can own one terminal-safe task key per RideHailing-owned
  confirmation generation.
- Recovery: RideHailing state decides whether repetition is safe; Job only
  performs a generic task transition.
- Business truth: “required / in flight / confirmed / unknown” belongs on the
  RideHailing owner, not in Job or a standalone intent ledger.

## Important Vocabulary Distinction

The Commerce system contains two different “settlement” concepts:

1. provider final-fare observation, which supplies the final Bill amount; and
2. BillLine payment settlement, which proves the user payment obligation was
   paid.

`feeConfirm` is downstream of the second one.
