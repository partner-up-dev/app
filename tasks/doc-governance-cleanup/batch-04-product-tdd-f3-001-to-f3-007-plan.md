# Batch 4: Product TDD Cleanup Plan And Execution Record

## Scope

This record covers Phase 3 Product TDD findings:

- F3-001: Product TDD can safely absorb most PRD mechanism language.
- F3-002: Claim Realization Matrix is stale relative to PRD capability growth.
- F3-003: Cross-Unit Contracts is overloaded and has domain-specific split pressure.
- F3-004: Ecommerce Contracts own commerce authority but still contain task-local issue framing.
- F3-005: Ecommerce provider-specific details may be too deep for Product TDD.
- F3-006: System State And Authority is a strong Product TDD owner but dense.
- F3-007: Local development contract may be misplaced inside Cross-Unit Contracts.

F3-008 is intentionally out of scope because Phase 3 found the analytics / BI split coherent.

This file began as the Batch 4 solution plan. After explicit user approval to continue through all Batch 4 segments, it now also records the executed durable documentation changes.

## Objective

Clean Product TDD after Batch 3 PRD cleanup:

- align Product TDD claim realization with the clarified PRD claim axes
- keep Product TDD as the owner of frontend/backend mechanism and authority detail
- reduce overloaded cross-unit and ecommerce files without losing contract truth
- separate durable cross-unit contracts from issue-local, provider-adapter, and local-runtime details
- preserve references while splitting large files into focused owners

## Segment Overview

| Segment | File | Primary Findings | Size |
| --- | --- | --- | --- |
| Segment 1 | [`batch-04-segment-1-authority-and-claim-matrix.md`](./batch-04-segment-1-authority-and-claim-matrix.md) | F3-001, F3-002, F3-006 | Executed |
| Segment 2 | [`batch-04-segment-2-cross-unit-contract-split.md`](./batch-04-segment-2-cross-unit-contract-split.md) | F3-003 | Executed |
| Segment 3 | [`batch-04-segment-3-ecommerce-contract-depth.md`](./batch-04-segment-3-ecommerce-contract-depth.md) | F3-004, F3-005 | Executed |
| Segment 4 | [`batch-04-segment-4-local-dev-origin-ownership.md`](./batch-04-segment-4-local-dev-origin-ownership.md) | F3-007 | Executed |

## Execution Order Used

1. Segment 1: Authority bridge, claim matrix, and readability map.
2. Segment 2: Cross-unit contract split and extraction.
3. Segment 3: Ecommerce durable reframe and provider-depth extraction.
4. Segment 4: Local development origin ownership.

Reason:

- Segment 1 is low-risk and closes the PRD Batch 3 follow-up.
- Cross-unit splitting is broad, so it should establish focused Product TDD owners before contract-depth cleanup continues.
- Ecommerce durable reframing and provider-depth extraction are related enough to execute together once the Product TDD owner map is stable.
- F3-007 crosses Product TDD and deployment ownership, so Segment 4 narrows Product TDD to the typed origin contract and points operational runtime detail to deployment docs.

## Batch-Level Invariants

- Do not let Product TDD redefine PRD claims.
- Do not remove frontend/backend authority facts unless a new Product TDD owner preserves them.
- Do not split `cross-unit-contracts.md` by route catalog; split by durable contract owner.
- Do not turn Product TDD into a provider adapter manual.
- Do not move local dev origin truth into deployment docs until deployment/runtime ownership is checked.
- Keep Product TDD index routing current after every segment.
- Keep task-local evidence and old issue framing out of durable Product TDD.

## Durable Outputs Created

Batch 4 created these focused Product TDD owners:

```text
docs/20-product-tdd/pr-lifecycle-contracts.md
docs/20-product-tdd/event-context-contracts.md
docs/20-product-tdd/pr-messaging-contracts.md
docs/20-product-tdd/admin-surface-contracts.md
docs/20-product-tdd/ecommerce-provider-contracts.md
```

## Resolved Human Decisions

1. Segment 1 ran first as the small confidence-building batch.
2. Ecommerce durable reframe and provider-depth cleanup were handled together in Segment 3 after the cross-unit split stabilized references.
3. F3-003 created focused Product TDD files immediately, with `cross-unit-contracts.md` retained as shared substrate and contract router.
4. F3-007 was handled by narrowing Product TDD to the local typed-origin contract and routing operational development workflow detail to `docs/40-deployment/environments.md`.

## Verification Strategy

For every segment:

```text
rg -n "claim-realization-matrix|cross-unit-contracts|ecommerce-contracts|system-state-and-authority|Local Development Origin Contract|issue-231" docs tasks/doc-governance-cleanup
git diff --check -- docs/20-product-tdd tasks/doc-governance-cleanup
```

For split segments:

```text
rg -n "event-context|Form Mode|Dummy PR|Study Sprint|PR Messaging|admin|RideHailing|queryOrderDetailV2|orderFeeVo|portless|dev:ensure" docs/20-product-tdd docs/40-deployment AGENTS.md
```

Check that each moved truth still has exactly one durable owner and that old references either remain valid through routing files or are updated.

## Execution Record

Segment 1 has been executed. Durable docs changed:

- `docs/20-product-tdd/claim-realization-matrix.md`
- `docs/20-product-tdd/system-state-and-authority.md`
- `docs/20-product-tdd/index.md`

All Batch 4 segments have been executed. Durable docs changed:

- `docs/20-product-tdd/claim-realization-matrix.md`
- `docs/20-product-tdd/system-state-and-authority.md`
- `docs/20-product-tdd/index.md`
- `docs/20-product-tdd/cross-unit-contracts.md`
- `docs/20-product-tdd/pr-lifecycle-contracts.md`
- `docs/20-product-tdd/event-context-contracts.md`
- `docs/20-product-tdd/pr-messaging-contracts.md`
- `docs/20-product-tdd/admin-surface-contracts.md`
- `docs/20-product-tdd/ecommerce-contracts.md`
- `docs/20-product-tdd/ecommerce-provider-contracts.md`

Verification run:

- `git diff --check -- docs/20-product-tdd tasks/doc-governance-cleanup`
- `rg -n 'issue-231|Current issue' docs/20-product-tdd`
- `rg -n 'queryOrderDetailV2|orderFeeVo|companyPayAmount' docs/20-product-tdd/ecommerce-contracts.md docs/20-product-tdd/ecommerce-provider-contracts.md`
- `rg -n 'pr-lifecycle-contracts|event-context-contracts|pr-messaging-contracts|admin-surface-contracts|ecommerce-provider-contracts' docs/20-product-tdd/index.md docs/20-product-tdd/cross-unit-contracts.md`
