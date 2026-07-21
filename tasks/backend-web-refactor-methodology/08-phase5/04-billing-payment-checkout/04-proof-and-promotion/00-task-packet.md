# 5-3.4 Proof And Promotion

## Status

**Complete.** The required focused proofs passed and D2 is promoted as current
checkout/recovery behavior in the PRD and ecommerce contract.

## Required Focused Proof

1. Payment provider scenario: provider conflict, failure clearing, retry,
   successful reconciliation, and stale-attempt non-settlement.
2. Web unit tests: session hint and reconciliation-state decisions.
3. One existing browser path: Bill Detail → Checkout → fake provider → Bill.
4. Backend and Web type checks; import inventory only for changed owner edges.

## Promotion Rule

Promote D2 technical wording from Target to Current only after the source and
focused proof demonstrate the same-session return/reload behavior. Preserve
the no-cross-device-return limitation as an explicit boundary.
