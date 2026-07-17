# Slice 3-8 Decision Brief — Waitlist Auth Contract

## Decision To Make

Confirm whether waitlist follows the repository-wide session contract—domain response body contains only the
refreshed public PR, while optional session rotation uses `x-access-token`—or introduces waitlist-specific auth data
in the JSON body.

The evidence supports a factual documentation correction, not a runtime/product redesign.

## Current Evidence

| Surface | Observed truth | Evidence |
| --- | --- | --- |
| PR lifecycle wording | One sentence says waitlist returns refreshed public PR “plus auth payload” | `docs/20-product-tdd/pr-lifecycle-contracts.md`, section 4 |
| Cross-unit authority | Domain command bodies must not carry `auth`, `accessToken`, `role` or `userId`; rotation belongs to `x-access-token` or auth/session endpoints | `docs/20-product-tdd/cross-unit-contracts.md:57-66` |
| Backend controller | Waitlist use case returns internal `{ pr, userId }`; controller issues response auth from `userId` and serializes only `result.pr` | `apps/backend/src/controllers/partner-request.controller.ts:369-391`; `apps/backend/src/controllers/pr-controller.shared.ts:195-205` |
| Web transport | Global RPC fetch reads `x-access-token` and updates session storage | `apps/web/src/lib/rpc.ts:22-51` |
| Web command | Waitlist reads the typed JSON response as the refreshed PR and does not parse an auth payload | `apps/web/src/domains/pr/queries/usePRActions.ts`, `useWaitlistPR` |

Current focused proof is narrower than the contract: Backend waitlist scenario (4 tests) and the selected Browser
waitlist promotion journey both pass, but neither asserts that auth keys are absent from this response or that a
rotated header is stored. A sibling publish scenario proves that pattern for publish only. This is a coverage gap,
not evidence for a body payload.

## Options

### A — Correct the stale sentence to header-only session rotation (recommended)

Replace “returns the refreshed public PR view plus auth payload” with:

> Returns the refreshed public PR view. When session rotation is issued, it uses the `x-access-token` response
> header under the shared session transport contract; the domain body carries no auth/session payload.

Runtime stays unchanged. Add or refresh a focused contract test only where current coverage does not directly prove
body/header separation.

Cost/risk: low. This removes a contradiction and preserves one authentication channel.

### B — Add auth payload to the waitlist JSON body

This would make waitlist an exception to the shared session contract, require a new typed response, duplicate Web
session handling and create two possible rotation owners.

Cost/risk: medium–high and architecturally regressive. No current product or runtime evidence supports it.

## Decision Record — Accepted 2026-07-17

Sir selected **A**. Classify CF-02 as a stale durable-doc sentence, not a product behavior fork. `3-8` should therefore be
a documentation + focused-characterization closure unless entry re-baselining finds runtime drift.

## Consequence Map

| Decision | Durable docs | Backend | Web | Verification |
| --- | --- | --- | --- | --- |
| A | Correct one PR lifecycle sentence; retain cross-unit authority | No behavior change | No behavior change | Assert public-PR body excludes auth fields; rotation header is consumed centrally |
| B | Version an explicit exception | Change response type/body | Add waitlist-specific session parser | Prove precedence and consistency of body/header rotation |

## Execution Status

- Selected option: **A — decided**
- Durable correction and focused characterization: **Authorized for `3-8` execution after `3-7`**
- Runtime/AppType/Web behavior change: **Not authorized or expected**
