# C0.1 — Ride Lifecycle And Fact Authority

## Objective

Model the actual RideHailing lifecycle across browser, backend, provider, callback, persistence, Bill, and Payment.
The model must distinguish a provider observation from a durable local transition and a buyer payment settlement.

## Evidence Standard

Each primary path is triangulated through at least three of controller/entry, use-case, entity/repository, scenario,
or provider-adapter test. The current evidence covers create, poll, callback, final settlement, payment, and cancel.

## Key Finding

`GET /orders/:id` is not currently a pure read: it can call provider sync, persist execution snapshots, resolve a
choice set, commit final settlement input, and lead to final Bill materialization. Callback, detail polling, and
cancellation pre-sync are therefore concurrent triggers of one lifecycle, not unrelated features.

See [`ride-sequence.md`](./ride-sequence.md), [`fact-authority-ledger.md`](./fact-authority-ledger.md), and
[`decision-record.md`](./decision-record.md).
