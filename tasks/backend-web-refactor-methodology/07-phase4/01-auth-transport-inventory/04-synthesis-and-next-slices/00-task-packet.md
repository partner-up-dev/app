# 4-0D — Synthesis And Next-Slice Design

## Status

Complete. The outcome is [`synthesis.md`](./synthesis.md), with decisions and risk state in
[`decision-risk-register.md`](./decision-risk-register.md).

## Entry

Consumes only the three evidence maps under this `01-auth-transport-inventory/` packet.

## Deliverable

Produce an evidence-indexed target state, candidate implementation slices, path ownership, decision branches,
verification matrix, durable promotion candidates and explicit deferrals. The resulting order may replace the initial
Phase 4 proposal; it must not silently turn exploration assumptions into facts.

## Stop Conditions

- A proposed slice requires a new auth transport channel, callback URL/cookie contract, JWT claim, or schema change
  without a separately framed decision.
- Product wording conflicts with desired replay or identity semantics.
- Source/test evidence cannot distinguish an intended compatibility seam from duplicated truth.
