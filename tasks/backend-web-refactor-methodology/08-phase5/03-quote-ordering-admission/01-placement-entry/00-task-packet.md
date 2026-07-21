# 5-2.1 Placement Entry

## Objective

Make ratified D1 observable at the entry boundary without trusting Web-only role checks.

## Scope

- backend-authoritative outcome for creator/no-order, participant/existing-order, and non-creator/no-order;
- Web routing from that outcome;
- preserve the create-order creator guard as defense in depth.

## Rehearsal And Proof

An active non-creator with an existing matching order opens Order Detail. Without one, that user sees no new-order
route. A creator with no active matching order proceeds normally. Prove those three branches with focused frontend
and browser scenarios; do not use Rental fulfillment behavior as evidence.

## Gate

Rental runtime retirement is already selected. This subtask does not implement it and must not use Rental behavior as
entry proof.
