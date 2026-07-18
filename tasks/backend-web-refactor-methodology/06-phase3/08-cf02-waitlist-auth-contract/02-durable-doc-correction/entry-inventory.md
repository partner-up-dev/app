# 08B Entry Inventory

## Frozen durable surface

- Stale sentence: `docs/20-product-tdd/pr-lifecycle-contracts.md`, Join Gates And Waitlist Contract,
  `POST /api/pr/:id/waitlist` previously said “refreshed public PR view plus auth payload.”
- Shared authority: `docs/20-product-tdd/cross-unit-contracts.md`, Session Contract, says command bodies must not
  carry `auth`, `accessToken`, `role`, or `userId`; rotation belongs to `x-access-token`.
- 08A trace: `../01-trace-characterization/trace-report.md` proves controller `c.json(result.pr)` and shared
  header rotation. `result.userId` is internal issuance input, not response data.

## Chosen wording

State that the body is the refreshed public PR only; session rotation, when issued, is the shared
`x-access-token` response header; no auth/session payload is in the body. This is a factual correction only.
