# SOP: Solidify

## Role

Use when findings must be restated into stable claims, contracts, decisions, or promotion candidates.

This mode often bridges task-local workspace state and durable docs.

## Forbidden

- Do not start coding while durable ownership is still ambiguous.
- Do not promote unstable guesses into PRD, TDD, or Deployment docs.

## Read-Do Steps

1. Gather the current findings, evidence, and assumptions.
2. Decide which truths are stable enough to promote and which must stay in the task-local workspace.
3. Restate target, scope, invariants, and verification.
4. Confirm the durable owner for each promoted truth.
5. Hand off to `Execute` or return to `Explore` if ownership is still unclear.

## Exit Criteria

- Durable ownership is explicit.
- Verification is explicit.
- The next edit or implementation step is safe to perform.
