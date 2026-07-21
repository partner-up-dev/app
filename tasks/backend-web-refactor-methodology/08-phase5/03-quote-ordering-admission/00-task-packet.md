# 5-2 Quote-To-Order Admission

## Status

**Complete.** D1 and unknown-provider UX are source-realized. Placement entry, CreateOrderAttempt, PR admission
locking, provider-unknown recovery, and owner-surface cutover have focused backend/browser proof. The final race
repair records the actual lock order: Trade/Ride foundation → PR lock/append → Attempt `pr_id` write → provider I/O
after commit. Rental remains excluded from this active proof path.

## Objective

Make the Merchandising→Trade→PR admission seam explicit without changing Quote as the sole freshness and
authorization boundary. Scope is Placement entry, listing/quote intake, PR attachment acceptance, creator/admission
checks, and unpaid-obligation behavior only where the same command boundary already owns it.

The executable decomposition, decision record, and rehearsals live in
[`slice-plan.md`](./slice-plan.md), [`decision-matrix.md`](./decision-matrix.md), and the numbered subtask folders.

## Guardrails

- Browser input stays quote-only; copied price, route, participants, SKU, and Offer facts never become create input.
- PR attachment remains transactional and PR remains final authority.
- One `(prId, offerId)` non-terminal order rule remains intact.
- Do not fold Payment, Rental retirement, refund policy, or RideHailing provider settlement into this slice.
- Rental is being retired for new traffic; `5-2` uses RideHailing proof only. Its runtime removal is owned by `5-4`.

## Bounded Plan

1. Realize ratified D1 through one backend-authored Placement entry outcome and preserve the create-order guard.
2. Solidify create-attempt idempotency, PR/Offer concurrent uniqueness, and a durable no-blind-retry
   provider-processing boundary before a
   create-order mutation.
3. Extract only the owner-facing command/query surface needed to remove a demonstrated cross-owner leak.
4. Preserve quote-expired refresh, existing reusable-quote semantics, and unpaid-obligation paths as independent
   outcomes.

## Exit Evidence

Focused RideHailing admission/quote proof demonstrates every branch above; Rental is not a retained scenario in
this slice.
