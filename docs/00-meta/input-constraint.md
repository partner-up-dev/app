# Input Route: Constraint

## Trigger

Use when product behavior stays the same, but technical, dependency, performance, or environment boundaries change.

## Primary Owner

- `docs/20-product-tdd/`
- `docs/30-unit-tdd/` when the change is truly hard-local

## Mode Relationship

- Common overlays: `Solidify`, `Execute`
- Re-enter `Diagnose` when observed reality diverges from the expected contract

## Forbidden

- Do not rewrite product intent to justify an implementation choice.
- Do not hide cross-unit contract changes inside task packets only.

## Read-Do Steps

1. Restate the constraint in technical terms.
2. Identify affected units, authority paths, and contract boundaries.
3. Read the relevant Product TDD, optional Unit TDD, and nearest local `AGENTS.md`.
4. Update Product TDD or Unit TDD where future rediscovery would be expensive.
5. Define verification that proves the constrained design still satisfies PRD commitments.

## Exit Criteria

- The updated technical contract is explicit.
- Verification is explicit.
- PRD remains unchanged unless a product promise actually changed.
