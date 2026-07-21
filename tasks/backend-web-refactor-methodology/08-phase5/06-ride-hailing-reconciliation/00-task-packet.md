# 5-5 RideHailing Reconciliation And Recovery

## Status

**Complete.** Order Detail is a pure local projection and an explicit, controlled RideHailing reconciliation command
owns provider observation, monotonic durable execution updates, and conditional terminal-Bill consequence.
Callback, browser observation, and cancellation preflight converge on it. The narrow RideHailing transaction Port
keeps provider I/O outside locks and returns `correctionRequired` rather than rewriting settled history. D3
adjustment/refund remains a separate product/reliability slice.

## Objective

Make callback and polling converge on one provider-detail reconciliation path, retain provider detail as execution
truth, and apply a separately idempotent final-bill consequence only from committed terminal settlement input.

The executable packet is intentionally split by responsibility:

1. [`01-command-and-projection/`](./01-command-and-projection/) — backend command, pure Detail contract, and
   concurrency semantics;
2. [`02-web-controlled-observation/`](./02-web-controlled-observation/) — controlled browser trigger and one
   transient observation cache;
3. [`03-concurrency-and-bill-proof/`](./03-concurrency-and-bill-proof/) — terminal/cancellation proof and D3
   non-rewrite boundary.

## Guardrails

- callback payload authenticates/routes/locates; it does not become execution or final-settlement truth;
- provider detail owns driver/vehicle/execution facts; high-frequency live geometry remains a projection concern;
- final Bill derives only after authoritative final settlement input is committed;
- provider cancellation-fee preview remains a pre-cancel decision, never a final bill source.
- no generic provider retry scheduler, durable outbox, refund-policy redesign, or settlement-correction feature is
  added merely to close a structural import.
