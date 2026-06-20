# Provider-Authored Ride Options

## Status

Pending product/technical decision. Not approved for implementation.

## Objective & Hypothesis

Objective:

- decide whether RideHailing SKU discovery should remain catalog-seeded or
  become provider-authored by city/route availability

Hypothesis:

- the current hybrid model is acceptable for restoring the order spine, but may
  be insufficient for MVP-quality ride-hailing commerce
- making the provider authoritative for candidate ride options is a contract
  change, not merely a UI tweak

## Guardrails Touched

- durable owner:
  `docs/20-product-tdd/ecommerce-contracts.md`
- possible product owner:
  `docs/10-prd/`
- backend trade owner:
  `apps/backend/src/domains/trade/`
- backend ride-hailing owner:
  `apps/backend/src/domains/ride-hailing/`
- backend commerce controller owner:
  `apps/backend/src/controllers/commerce.controller.ts`
- frontend ordering owner:
  `apps/frontend/src/domains/commerce/ui/ordering/`

## Current Understanding

- offer detail currently returns catalog-authored SPU/SKU candidates.
- ordering evaluation calls the provider estimate per catalog SKU.
- unavailable SKUs become disabled after provider estimate failure.
- provider influences price and availability but does not author the initial
  candidate list.
- city is not currently a first-class query parameter in the ordering contract.
- waypoints are stored in snapshots but are not currently part of the provider
  estimate/create request path.

## Open Contract Questions

- Is catalog-seeded SKU discovery acceptable for MVP?
- If not, which backend boundary should ask the provider for available vehicle
  types?
- Does provider-authored discovery require a new endpoint, or can it fit inside
  `POST /api/commerce/ordering/evaluate`?
- What remains catalog truth: display copy, cancellation policy, commercial
  overlay, SKU identity?
- How should city/route/waypoint context enter the contract?
- How do provider-only options map back to persisted SKU snapshots?

## Human Confirmation Boundary

This subtask likely crosses durable owners. Before mutation, pause for an
Impact Handshake with:

- Address and Object
- State Diff
- Blast Radius Forecast
- Invariants Check
- Verification

## Verification

Expected after implementation approval:

- backend unit tests for provider option resolution and SKU mapping
- frontend typecheck
- RideHailing scenario proving route-aware vehicle availability and order
  creation
- provider fake tests if fake Caocao contract expands

## Next Step

Defer until ordering-page and order-detail UX discussion clarifies whether MVP
needs provider-authored discovery now.
