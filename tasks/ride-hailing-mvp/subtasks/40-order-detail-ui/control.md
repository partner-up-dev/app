# Order Detail UI

## Status

Pending discussion. Not approved for production-code implementation yet.

## Objective & Hypothesis

Objective:

- make `/orders/:orderId` for RideHailing understandable as the long-lived ride
  lifecycle page

Hypothesis:

- the order detail page currently proves the backend lifecycle, but it is not
  yet a passenger-facing MVP surface
- the most important UX work is lifecycle framing: quote basis, provider state,
  driver/vehicle information, final bill, and payment/completion transitions

## Guardrails Touched

- durable owner:
  `docs/20-product-tdd/ecommerce-contracts.md`
- page owner:
  `apps/frontend/src/pages/CommerceOrderDetailPage.vue`
- commerce query owner:
  `apps/frontend/src/domains/commerce/queries/useCommerce.ts`
- route display dependency:
  `apps/frontend/src/domains/route/ui/RouteMap.vue`
- future tracking-contract owner if needed:
  backend commerce / fulfillment read APIs

## Current Understanding

- the current detail page mixes ride and rental responsibilities.
- RideHailing detail should remain the place for cancellation, final bill,
  payment, and completion.
- high-frequency ride tracking should eventually use a dedicated API contract
  rather than forcing full order-detail polling to become the tracking payload.

## Open Design Questions

- What lifecycle phases must be visible for MVP?
- Which provider terms should be translated into user-facing Chinese copy?
- Should route geometry use the same `RouteMap` treatment as ordering, or a
  smaller route summary after creation?
- What actions belong on the page before final bill exists?
- How should final bill and final payment be staged on the same route?
- Should rental and ride detail be split into feature components before visual
  polish?

## Human Confirmation Boundary

Before implementation, perform an Impact Handshake covering:

- whether this is page-local UI work or a component split
- whether polling behavior changes
- what user-visible lifecycle states are in scope
- scenario and manual verification plan

## Verification

Expected after implementation approval:

- `pnpm check:type:frontend`
- RideHailing scenario from created order through provider lifecycle and final
  bill, if browser-visible assertions change
- manual browser pass through order creation -> detail lifecycle

## Next Step

Discuss lifecycle model and page composition before touching
`CommerceOrderDetailPage.vue`.
