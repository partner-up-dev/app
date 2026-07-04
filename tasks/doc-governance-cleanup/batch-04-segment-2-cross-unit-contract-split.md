# Batch 4 Segment 2: Cross-Unit Contract Split

## Covers

```text
F3-003
```

## Target Files

Primary:

```text
docs/20-product-tdd/cross-unit-contracts.md
docs/20-product-tdd/index.md
```

Possible new files:

```text
docs/20-product-tdd/pr-lifecycle-contracts.md
docs/20-product-tdd/event-context-contracts.md
docs/20-product-tdd/pr-messaging-contracts.md
docs/20-product-tdd/admin-surface-contracts.md
```

## Objective

Reduce `cross-unit-contracts.md` from a broad aggregator into a durable routing and shared-substrate file while moving mature domain-specific contract clusters into focused Product TDD owners.

## Current Split Pressure

`cross-unit-contracts.md` currently owns:

- typed HTTP contract
- local dev origin contract
- image upload contract
- PR lifecycle contract
- session and WeChat follow contract
- error contract
- stable route and flow contracts
- event-assisted create, Form Mode, dummy PR, POI applications
- Study Sprint
- join gates and waitlist
- admin commands and admin surface contracts
- share descriptor contract
- PR messaging contract
- coordination/failure assumptions
- scenario verification contract
- analytics and BI entry contracts

Many of these are valid Product TDD truths, but not all need the same owner file.

## Proposed Split

### Keep In `cross-unit-contracts.md`

- typed HTTP contract
- image upload contract
- session contract
- WeChat official account follow contract
- error contract
- coordination and failure assumptions
- system scenario verification contract
- route to focused contract files

### Move To `pr-lifecycle-contracts.md`

- PR lifecycle contract
- PR creation / publish / current creator
- join gates
- waitlist and alternative availability reminders
- Study Sprint route contract if it remains tightly PR-lifecycle scoped

### Move To `event-context-contracts.md`

- Anchor Event landing contracts
- Form Mode bootstrap/recommendation/auto-create
- dummy PR materialization
- event list/card/search compatibility
- POI location application entry if tightly coupled to Form Mode

### Move To `pr-messaging-contracts.md`

- PR messaging contract
- read markers and inbox state
- participant/system message visibility
- PR message notification handoff references

### Move To `admin-surface-contracts.md`

- admin ride-hailing cancellation surface reference, if not better owned by ecommerce contracts
- Anchor Event admin section contract
- metadata/config admin surfaces

## Segment Slices

This segment is large. Execute as smaller slices:

```text
2a. Add target routing and owner map without moving content.
2b. Extract event-context contracts.
2c. Extract PR lifecycle / join / waitlist / Study Sprint contracts.
2d. Extract PR messaging contracts.
2e. Decide whether admin surface contracts deserve a separate file.
```

Each slice should keep references valid.

## Non-Goals

- Do not change contract semantics.
- Do not move local dev origin contract in this segment; F3-007 owns that.
- Do not move ecommerce-specific contracts out of `ecommerce-contracts.md`.
- Do not split analytics/BI contracts; F3-008 says they are coherent.

## Verification

```text
rg -n "cross-unit-contracts|PR Lifecycle Contract|Stable Route And Flow Contract|Form Mode|Dummy PR|Study Sprint|PR Messaging Contract|Admin Anchor Event|Analytics And User Telemetry|BI Entry" docs tasks/doc-governance-cleanup
git diff --check -- docs/20-product-tdd tasks/doc-governance-cleanup
```

Expected result:

- `cross-unit-contracts.md` remains a useful entrypoint.
- Each extracted contract cluster has one focused Product TDD owner.
- Existing references either still target `cross-unit-contracts.md` as router or point to the new owner.

## Execution Record

Executed in Segment 2:

- `docs/20-product-tdd/cross-unit-contracts.md` now owns shared cross-unit substrate and routes to focused contract owners.
- `docs/20-product-tdd/pr-lifecycle-contracts.md` now owns PR lifecycle, creation, current creator, join gates, waitlist, Study Sprint, share descriptor, and action availability contracts.
- `docs/20-product-tdd/event-context-contracts.md` now owns Anchor Event, Form Mode, dummy PR, POI application, event list/card/search, and event-context telemetry contracts.
- `docs/20-product-tdd/pr-messaging-contracts.md` now owns PR messaging, read markers, message visibility, and notification handoff contracts.
- `docs/20-product-tdd/admin-surface-contracts.md` now owns operator/admin cross-unit surface contracts outside ecommerce-specific detail.
- `docs/20-product-tdd/index.md` routes to the new files.

Segment 4 later narrowed the local typed origin contract in `cross-unit-contracts.md` and left local runtime commands under deployment docs.
