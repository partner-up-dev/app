# 4-2 Durable Documentation Plan

## Candidate Promotion

After focused and System proof, update `docs/20-product-tdd/cross-unit-contracts.md` with only these stable facts:

- public user session roles are `anonymous` and `authenticated`; operator roles belong to the separate admin context;
- bearer signature/expiry plus current persisted public user state forms the public identity boundary;
- the User domain owns current public identity classification, auth transport owns issue/rotation, and the Web auth
  process owns browser restoration/projection;
- UUID-only recovery is anonymous-only and rejected UUIDs become a fresh anonymous session in the same bootstrap.

## Non-Promotion

- OAuth callback/handoff topology stays in `docs/30-unit-tdd/wechat-oauth-handoff.md` for `4-3`.
- Product identity progression stays unchanged, so `docs/10-prd/` is not edited.
- Test logs, exact fixture IDs, rollout observations and implementation edge lists remain task-local.

Promotion is blocked if the Browser-to-Backend scenario disagrees with the focused tests or if public and operator
contexts still share a role projection.

## Promotion Result

The focused and Browser-to-Backend proofs agreed. The compact rules above were promoted to
[`docs/20-product-tdd/cross-unit-contracts.md`](../../../../docs/20-product-tdd/cross-unit-contracts.md) on
2026-07-18. OAuth topology/error semantics and operator bearer revalidation remain deliberately unpromoted.
