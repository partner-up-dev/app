# 5-1 Commerce Authority And Idempotency Matrix

## Status

**Complete — Explore/Solidify; no runtime mutation performed.** Sir ratified D1–D3 on 2026-07-20. Their durable
target rules are recorded before this matrix selects any implementation cutover. This slice reduced obscurity before
any behavioral migration.

## Objective

Produce one current/target matrix for Merchandising, Trade, Fulfillment, Bill, Payment, RideHailing, and their
admin adapters. For every cross-owner action, name the authoritative fact, public category, idempotency key or
natural uniqueness rule, current import/transport edge, compatibility status, and proof owner.

## Bounded Plan

1. Re-run the import inventory immediately before work and classify only production edges.
2. Classify each edge as command, canonical query, stable contract, provider/event port, owner-local implementation,
   or an explicit compatibility exception.
3. Record the smallest proposed category entrypoint for every necessary external consumer; do not replace wildcard
   barrels merely by renaming them.
4. Establish the idempotency/recovery matrix for Quote, Order, BillLine execution, payment callback, Rental
   termination, and RideHailing provider sync.
5. Select one narrow cutover family for the following executable slice; no batch export rewrite belongs here unless
   consumer evidence proves it safe.

## Does Not Own

Product behavior, endpoint redesign, payment/provider configuration, schema migration, or deletion of current
compatibility surfaces.

## Exit Evidence

- an exact consumer/producer inventory with current vs target classification;
- explicit exception rows for any retained deep import or broad export;
- a candidate cutover whose focused proof is cheaper than its migration cost.

## Result

The matrices and compatibility ledger meet this exit. See
[`owner-and-surface-matrix.md`](./owner-and-surface-matrix.md),
[`idempotency-matrix.md`](./idempotency-matrix.md), and
[`next-slice-recommendation.md`](./next-slice-recommendation.md). The next
slice remains a decision/authorisation boundary, not an implicit runtime start.
