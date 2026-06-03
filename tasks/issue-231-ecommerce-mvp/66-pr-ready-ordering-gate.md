# PR READY Order Attach Guard

## Purpose

PR READY lifecycle already exists outside this issue. Issue 231 should not
change PR lifecycle states, user-visible READY copy, READY notification copy,
or `FULL` behavior.

This task only needs the commerce invariant: an order created from a PR can be
attached to that PR only when the PR is already `READY`.

## Attach Gate

For PR-context ordering:

- The frontend may show a Placement before the PR reaches `READY`.
- The create-order action should be disabled before `READY`.
- The backend must not trust the frontend disabled state.
- When Trade creates an order for a PR, order creation and PR attachment must
  happen in one transaction.
- PR domain owns the invariant check for attaching an order to a PR.
- If the PR is not `READY` at attachment time, PR domain rejects the attachment
  and the transaction rolls back, so the order creation fails atomically.
- If the PR is `READY`, the order creator must still be the PR creator.

The atomic boundary matters because a PR can change between offer view,
ordering form entry, and final submit. The invariant is "no order attached to a
non-READY PR" rather than "the frontend hid a button."

The Placement target must resolve to either an existing order for the PR or an
offer that can create an order for that PR. If an order already exists for the
same offer and PR, clicking the Button Placement routes to Order
Detail. If no order exists, clicking the Button Placement routes to Offer
Detail and the SKU-specific ordering component.

Different SKU/product types own different ordering requirements:

- Rental SKU -> Rental Ordering component -> RentalOrder -> Rental Fulfillment.
- Ride Hailing SKU -> Ride Hailing Ordering component -> RideHailingOrder ->
  RideHailing Fulfillment boundary in this task; real provider fulfillment is
  out of scope unless separately confirmed.

Voucher Entitlement, entitlement redemption, QR redemption, GoodsOrder, and
entitlement route surfaces are out of scope because group-buy coupon
functionality has been removed from this task.

## Test Implications

- Frontend tests should prove create-order UI is disabled before READY where
  that state is visible to the user.
- Backend/domain tests should prove PR domain rejects order attachment when PR
  is not READY.
- Transactional tests should prove rejection rolls back the order creation and
  does not leave partial order, bill, payment, or fulfillment records.
- Backend/domain tests should prove READY PR plus PR creator authority can
  attach the order.
- This issue should not add tests for READY copy, FULL display derivation, or
  READY-over-FULL display priority.
