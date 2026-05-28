# Basic Frontend User Journeys

## Objective

Define the baseline user-visible journey for issue 231 before frontend-heavy
implementation starts.

The current focus is intentionally narrow:

- Rental: from PR Page to Order completion/cancellation
- RideHailing: from PR Page to Order completion/cancellation

This file does not try to define admin IA or full provider/ops workflows.

## Shared Frontend Topology

The recommended MVP route and page spine is:

1. `PR Page`
2. `Offer Detail`
3. `Order Detail`

Why this is the simplest useful topology:

- `PR Page` is the contextual entry surface where Placement is rendered.
- `Offer Detail` is the pre-order assembly surface where product/offer truth is
  explained and ordering input is collected.
- `Order Detail` is the long-lived lifecycle surface after order creation. It
  can absorb payment, cancellation, fulfillment progress, and billing result
  without forcing users through extra standalone routes.

Current recommendation:

- do not add a user-facing `/checkout/*` route in MVP
- do not add a user-facing payment-result route in MVP
- do not add a user-facing cancellation route in MVP
- use dialogs/drawers for confirmation steps, but keep the durable page route
  on `Offer Detail` before create and `Order Detail` after create

## Shared Journey Rules

### PR Page

- Shows Button Placement inside Utility Actions when Placement matching and PR
  participant access pass.
- Clicking Button Placement should deep-link either to:
  - `/offers/:offerId` when no non-terminal order exists for current
    `(prId, offerId)`
  - `/orders/:orderId` when one already exists

### Offer Detail

- Owns pre-order explanation and ordering assembly.
- Should keep product/offer explanation above ordering controls rather than
  burying the context in a modal-only flow.
- Should show disabled create-order CTA when PR is not `READY` or current user
  is not the PR creator.
- Should not become a long-lived lifecycle page after create succeeds.

### Order Detail

- Is the durable page for all post-create states.
- Should own post-create payment entry, fulfillment projection, bill result,
  and cancellation entry.
- Should not redirect users into separate routes just to view payment result,
  cancellation result, or fulfillment result unless an external gateway forces
  it.

## Rental Journey

### Recommended User Flow

1. User opens matching cooking PR.
2. User sees `预订场地` Button Placement in Utility Actions.
3. User opens `Offer Detail`.
4. Offer Detail shows:
   - what is being reserved
   - zone / participant-count / time-slot choices
   - price and price-detail affordance
   - cancellation-policy summary
5. If PR is not `READY`, CTA stays disabled with explicit reason.
6. If allowed, PR creator creates order from Offer Detail.
7. On success, frontend navigates to `Order Detail` immediately.
8. `Order Detail` first shows payable state and payment CTA.
9. After payment, the same `Order Detail` shifts to `待确认预订`.
10. Later, the same `Order Detail` shows one of:
    - `预约成功` with entry guidance
    - `预约失败` with consequence/refund result
    - `取消处理中`
    - `已取消`
    - `已完成`

### Rental Page-State Model

Offer Detail state:

- explanation
- selectable ordering inputs
- price detail
- create-order CTA / disabled reason

Order Detail state:

- order summary
- bill/payment panel
- fulfillment panel
- cancellation panel

Recommended visible progression:

- `待支付`
- `待确认预订`
- `预约成功`
- `预约失败`
- `取消处理中`
- `已取消`
- `已完成`

### Rental Cancellation UX

- Cancellation entry should live on `Order Detail`, not PR Page.
- Before submit, frontend should show the best available preview:
  - snapshot-based cancellation policy wording
  - whether operator handling is expected
- After submit, user remains on `Order Detail`.
- The page should then project:
  - request accepted and handling
  - cancelled
  - cancellation denied / booking remains

This is simpler than creating a separate cancellation flow route because Rental
termination is not a second product; it is a state transition on the same
contract.

## RideHailing Journey

### Recommended User Flow

1. User opens matching ride-relevant PR.
2. User sees Button Placement in Utility Actions.
3. User opens `Offer Detail`.
4. Offer Detail shows:
   - route/time/vehicle selection
   - quote estimate
   - price-detail affordance
   - cancellation summary if one can be shown pre-order
5. If PR is not `READY`, CTA stays disabled with explicit reason.
6. If allowed, PR creator creates order from quote snapshot.
7. On success, frontend navigates to `Order Detail` immediately.
8. `Order Detail` shows:
   - quote basis snapshot
   - ride execution status
   - cancellation entry when still available
   - final bill/payment section only when final settlement is ready
9. During active ride, high-frequency live information should be fetched by a
   dedicated ride-tracking API rather than making the whole order projection
   high-frequency.
10. After trip finish, the same `Order Detail` shows final bill and payment
    action.
11. After payment, the same `Order Detail` becomes the completed receipt-like
    surface.

### RideHailing Page-State Model

Offer Detail state:

- quote assembly inputs
- estimate and price detail
- create-order CTA / disabled reason

Order Detail state:

- quote basis section
- fulfillment section
- bill/payment section
- cancellation section

Recommended visible progression:

- `待出发 / 待派单`
- `进行中`
- `已结束，待出账`
- `已出账，待支付`
- `已完成`
- `已取消`

`已取消` here is only for pre-trip abort/local void style outcomes. Once real
trip usage has begun, the preferred user reading is an ended trip plus final
settlement consequence rather than a generic cancelled order.

### RideHailing Cancellation UX

- Cancellation entry should live on `Order Detail`.
- Frontend should not pretend local status alone determines cancellability.
- The confirmation step should come from a dedicated cancel preflight/attempt
  interaction that can return:
  - cancellable with no fee
  - cancellable with fee
  - not cancellable
- After submit, user stays on `Order Detail`.
- If the ride already moved into actual usage, the page should pivot to
  fulfillment-and-settlement reading instead of generic cancellation reading.

## Frontend Design Implications

### Page Count

For the baseline MVP user side, the useful durable pages are only:

- `PR Page`
- `Offer Detail`
- `Order Detail`

This is a strong simplification lever. New route creation should need an
explicit reason, not happen by default.

### Read-Model Separation

- Stable order/fulfillment/bill truth should come from `Order Detail`
  projection.
- High-frequency ride-tracking data should come from a dedicated API contract.

This avoids turning the whole order detail fetch into a high-frequency payload.

### CTA Discipline

- Before create: primary CTA lives on `Offer Detail`
- After create: primary CTA lives on `Order Detail`

That split should remain stable across Rental and RideHailing.

## What Still Needs Confirmation

These are the frontend questions still worth discussing before implementation:

1. Offer Detail and Ordering should stay in one page or be split into a nested
   subroute.
2. Payment should open as in-page action from Order Detail or bounce through a
   dedicated gateway-return page.
3. Rental cancellation result wording and state grouping.
4. RideHailing Order Detail exact information architecture:
   quote basis, live ride status, and final bill arrangement.
