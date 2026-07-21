# 5-3.2 Provider Observation And Settlement

## Status

**Complete.** Bill's persistence transition now compares the exact active
`(paymentProviderInstanceId, attemptCount)` pair and returns `STALE` rather
than mutating a newer attempt.

## Objective

Treat provider poll and callback as observations of the same canonical
BillLine attempt, with exact tuple matching and an explicit stale outcome.

## Exit

- an old provider observation cannot settle a later attempt;
- callback/poll convergence never creates a second immediate settlement
  consequence invocation;
- focused fake-provider proof covers failed attempt, retry, and stale success.
