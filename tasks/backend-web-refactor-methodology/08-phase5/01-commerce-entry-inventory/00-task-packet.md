# 5-0 Commerce Entry Inventory

## Objective

Map the current Commerce topology and determine the smallest safe starting slice for Phase 5.

## Read Scope

- Durable PRD and Product TDD Commerce contracts.
- Backend families: `merchandising`, `trade`, `fulfillment`, `bill`, `payment`, `ride-hailing`, and their admin
  adapters only where they consume those owners.
- Web Commerce/Payment/admin adapters and browser scenarios.
- Existing static, unit, backend-scenario, and system-scenario verification seams.

## Questions

1. Does each durable decision have one effective implementation owner?
2. Which public surfaces are curated versus deep-import compatibility edges?
3. Where do quote creation, order creation, termination, bill reconciliation, payment execution, and provider sync
   cross owner boundaries?
4. Which currently observable journeys can prove a candidate migration cheaply?

## Non-Goals

- No source edits, no test rewrites, no provider calls, no production probing, and no schema migration.
- No promotion of exploration hypotheses to durable documentation.

## Completion Evidence

- A topology map grounded in source paths.
- A contracts/implementation comparison.
- An ordered candidate slice map with per-slice verification cost and decision dependencies.
