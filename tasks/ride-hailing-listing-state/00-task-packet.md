# Ride Hailing Listing State UX

## Objective & Hypothesis

Fix the RideHailing ordering surface so Offer Listing state is modeled against
the correct object.

Current observed behavior:

- `RideHailingOrderingContent` derives `offerListingInput` as `null` when
  required ordering context is missing.
- `useOfferListing` is correctly disabled when input is `null`.
- The UI still renders RideHailing SKU skeletons because it treats query
  `isPending` as loading even when no listing request can start.
- Users see an indefinite loading state with no recovery path.

Hypothesis:

- The root issue is not missing copy or a durable UX rule. It is a state-modeling
  bug: `waiting for required input`, `request in flight`, `empty result`, and
  `request failure` are not distinct UI states.
- Listing is a core page capability. If it cannot start or cannot produce a
  usable listing, the page should surface a blocking problem state with an
  in-place recovery path when possible.

## Guardrails Touched

- Frontend ordering UX:
  - `apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingContent.vue`
  - likely `apps/frontend/src/pages/OrderingPage.vue`
- Query semantics:
  - `apps/frontend/src/domains/commerce/queries/useCommerce.ts` should remain the
    RPC/query owner; avoid calling API directly from components.
- Product authority:
  - Offer Listing remains backend-owned.
  - Frontend may collect missing local context but must not submit copied SKU,
    price, route, or participant facts to create-order.
- Design system:
  - Use `@partner-up-dev/design-web` components. `PuInlineNotice` is preferred
    for local blocking state; `PuDialog` is acceptable for focused recovery
    flows. `PuSnackbar` is not preferred for this blocking/core capability state.
- Durable docs:
  - Do not add a broad ordering UX rule as the primary fix.
  - Promote durable docs only if implementation reveals a cross-unit contract or
    product invariant that is not already represented.

## Current Understanding

The reproduced `ordering-entry` response has:

- `offerDetail.productType = "RIDE_HAILING"`
- `bindings.route` present
- `bindings.orderParticipants` present
- `bindings.contactPhone` absent

Therefore `RideHailingOrderingContent` returns `offerListingInput = null`,
which disables `useOfferListing`. This is correct from a request-safety
perspective, but the UI incorrectly renders loading skeletons.

Known blockers that can make RideHailing listing input unavailable:

- missing ride offer / product type mismatch
- missing route
- missing contact phone
- missing riders/order participants

Known downstream non-success states after a request starts:

- network/API failure
- successful listing with no listed items
- stale listing requiring refresh after quote expiration

## Candidate State Model

Represent the listing capability as an explicit state before mapping to UI:

- `waiting-for-input`: required local/handoff context is incomplete.
- `loading`: listing input exists and the query is fetching.
- `ready`: listed choice candidates exist.
- `empty`: listing returned but no candidates are available.
- `error`: listing request failed.

This prevents disabled queries from being rendered as loading.

## Candidate UX

For `missing-contact-phone`:

- Show an in-place `PuInlineNotice` in the RideHailing vehicle panel.
- Provide a telephone input in-place so the user can complete the missing
  contact phone without leaving the page.
- Once filled, listing should request automatically through the existing query
  path.

For `missing-route`:

- Show an in-place blocking notice.
- Provide a clear action back to the PR or route editing surface if available.

For `missing-riders`:

- Show an in-place blocking notice explaining that no active participants are
  available for ordering.
- If the existing PR NOT READY recovery applies, reuse the parent `PuDialog`
  flow rather than inventing a parallel one.

For `empty`:

- Show a clear unavailable state instead of empty skeletons.
- Explain that no vehicle candidates are currently available for the route.

## Verification

Planned verification after implementation starts:

- Focused frontend tests for:
  - missing contact phone renders blocker/in-place input, not skeleton
  - filling contact phone enables listing
  - missing route does not show skeleton
  - query pending shows skeleton only when listing input exists
  - successful empty listing shows unavailable state
- Static checks:
  - `pnpm check:type:frontend`
  - `pnpm check:lint:frontend`
- Scenario confidence:
  - run the focused RideHailing ordering scenario if changes touch the normal
    listing flow or create-order readiness.

## Implementation Notes

- Added an explicit RideHailing listing state helper:
  - `waiting-for-input`
  - `loading`
  - `error`
  - `empty`
  - `ready`
- `RideHailingOrderingContent` now shows skeletons only when listing input exists
  and the listing query is pending.
- Missing contact phone is recoverable in-place through a telephone input in the
  RideHailing vehicle panel.
- Missing route / missing riders / missing offer surface blocking notices with
  action paths into the parent `PuDialog` recovery flow.
- Successful listing with zero visible vehicle candidates is treated as an error
  surface, not as loading.

## Verification Run

- `pnpm --filter @partner-up-dev/frontend test:unit -- src/domains/commerce/ui/ordering/ride-hailing-listing-state.test.ts`
  - passed; Vitest selected the frontend project and reported 35 files / 159
    tests passed.
- `pnpm check:type:frontend`
  - passed.
- `pnpm check:lint:frontend`
  - passed; naming audit still reports the pre-existing weak-name findings for
    `RideHailingOrderContent` and `RideHailingOrderingContent`.
- Direct file Biome check over touched frontend files and this packet passed.

## Next Step

Optional manual/scenario validation in a browser or scenario test if we want
full confidence over the interactive phone-entry path.
