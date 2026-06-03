# Ordering Page UI/UX Audit

## Objective & Hypothesis

Objective: build a poly-file task packet for the current Ordering Page UI/UX state before implementation.

Hypothesis: the current `/order/new` Ordering Page is functionally connected to the commerce ordering flow, but its information architecture and mobile viewport behavior are not product-quality. The likely corrective work is not a small CSS polish; it should first separate order review, locked PR facts, buyer input, offer selection, and submission state into a deliberate page model for both Rental and RideHailing.

## Classification

- Intent: improve the user-facing ordering workflow quality.
- Reality: the observed layout has severe UI/UX defects despite passing system scenario coverage.
- Artifact: this packet records current findings, evidence, and candidate work slices.
- Active mode: Execute. Initial implementation slice completed on 2026-06-03 and is under verification.

## Durable Owner And Blast Radius

- Primary frontend route owner: `apps/frontend/src/pages/OrderingFromPlacementPage.vue`.
- Rental content owner: `apps/frontend/src/domains/commerce/ui/ordering/RentalOrderingContent.vue`.
- RideHailing content owner: `apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingContent.vue`.
- Shared layout owner touched by any future fix: `apps/frontend/src/shared/ui/layout/FullScreenPageScaffold.vue` only if the fixed footer/content contract is changed globally.
- Backend contracts are currently evidence sources, not planned mutation targets.

## Guardrails Touched

- Do not mutate product behavior before the user confirms the target UX direction.
- Keep the `/order/new` route backed by `sessionStorage["partner-up.ordering-entry"]` unless a separate entry-state decision is made.
- Keep Rental and RideHailing order command payloads aligned with `useCreateOrder` / `useEvaluateOrdering`.
- Scenario coverage must remain through real frontend + backend HTTP + isolated database for cross-unit behavior.
- Any future UI slice must verify mobile viewport layout with screenshots, because the current defects are visual and spatial.

## Verification

Evidence collected on 2026-06-03:

- Browser screenshot with mock Ordering entry payload:
  - `evidence/ordering-page-rental-top.png`
  - `evidence/ordering-page-rental-bottom.png`
  - `evidence/ordering-page-ride.png`
- Targeted system scenario:
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts -t commerce_rental_ordering_reaches_confirmed_fulfillment`
  - Result: passed, 1 test passed and 5 skipped.
- Post-implementation scenario screenshots with isolated scenario database:
  - `ordering-rental-main-after.png`
  - `ordering-rental-price-detail-after.png`
  - `ordering-ride-main-after.png`

## Current Decision State

Initial implementation direction was accepted by the user. The first implementation slice is:

- Shared ordering shell with `FullScreenPageScaffold` and small `PageHeader`.
- Shared bottom action bar with estimated total/range, chevron-up, CTA, and price detail bottom drawer.
- Rental content changed to commerce-style ordering form without `SurfaceCard` / `ChoiceCard` / PR-lock copy.
- RideHailing content changed to real `RouteMap` plus bottom sheet and RideHailing SKU rows.
- Floating warning/error notice layer separated from normal document flow.

Remaining decision areas, if a second slice is opened:

- Enhance shared map marker labels/callouts at the map component/provider boundary.
- Decide whether ride-hailing contact should be explicitly shown as a read-only summary row or remain backend-bound only.
