# Batch 4 Segment 3: Ecommerce Contract Durable Reframe And Provider Depth

## Covers

```text
F3-004
F3-005
```

## Target Files

```text
docs/20-product-tdd/ecommerce-contracts.md
docs/20-product-tdd/index.md
```

Possible new file:

```text
docs/20-product-tdd/ecommerce-provider-contracts.md
```

## Objective

Make ecommerce Product TDD durable while preserving the cross-unit truths that matter for PR-attached ordering, RideHailing, billing, settlement, and provider failure behavior.

## Segment 3a: Durable Reframe

This is small and can run early.

Mutation:

- Remove `issue-231 ecommerce slice` framing.
- Reframe scope as durable PR-attached ecommerce cross-unit contract.
- Keep domain grouping, owner boundaries, route spine, placement, ordering, fulfillment, billing, termination, and verification semantics unchanged.

Non-goal:

- Do not move provider-specific details in 3a.

Verification:

```text
rg -n "issue-231|slice|PR-attached|Placement|Quote|RideHailing|Billing|Termination" docs/20-product-tdd/ecommerce-contracts.md
```

## Segment 3b: Provider-Specific Depth Classification

This is large and should not be bundled with 3a.

Classify lines in `ecommerce-contracts.md:399-463` into:

```text
Keep in ecommerce-contracts.md:
- provider behavior that changes user-visible order, bill, cancellation, or settlement semantics
- provider facts required by cross-unit frontend/backend coordination
- provider failure states that affect navigation or user messaging

Move to ecommerce-provider-contracts.md or unit-local docs:
- adapter endpoint names
- raw provider payload field names
- provider-specific repair/retry details
- implementation details that backend code can explain cheaply
```

Possible output:

- keep a compact provider authority summary in `ecommerce-contracts.md`
- move CaoCao-specific settlement/cancellation details to `ecommerce-provider-contracts.md`
- route from Product TDD index if the new file exists

## Non-Goals

- Do not change ecommerce product rules.
- Do not weaken billing or settlement authority.
- Do not remove provider-specific detail merely because it looks implementation-shaped; classify first.
- Do not create a deployment runbook for provider recovery inside Product TDD.

## Verification

```text
rg -n "queryOrderDetailV2|orderFeeVo|companyPayAmount|provider|settlement|cancellation|fee|RideHailing|final bill|finalSettlementInput" docs/20-product-tdd
git diff --check -- docs/20-product-tdd tasks/doc-governance-cleanup
```

Expected result:

- Durable ecommerce authority remains clear.
- Provider-specific details have an explicit owner decision.
- User-visible billing/cancellation behavior is not lost.

## Execution Record

Executed in Segment 3:

- `docs/20-product-tdd/ecommerce-contracts.md` no longer uses `issue-231` task-local framing.
- The ecommerce scope now describes durable PR-attached ecommerce cross-unit truth.
- Main ecommerce contracts keep provider behavior only when it affects cross-unit user experience, billing, settlement, or cancellation semantics.
- `docs/20-product-tdd/ecommerce-provider-contracts.md` now owns CaoCao-specific RideHailing provider details that shape dispatch, external order identity, final settlement source, and cancellation-fee boundaries.
- `docs/20-product-tdd/index.md` routes provider-specific commerce behavior to the new provider contract file.
