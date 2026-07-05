# Order Detail Back Regression

## Objective & Hypothesis

Objective:

- diagnose the observed regression that Order Detail can still return to
  `/order/new`
- identify the exact entry chain and router-history condition before any code
  mutation

Hypothesis:

- `apps/frontend/src/pages/CommerceOrderDetailPage.vue` already contains a
  page-local skip policy for `/order/new`
- the observed behavior is likely caused by a different history shape than the
  code assumes, or by another entry path that reaches Order Detail without the
  expected PR fallback context

## Guardrails Touched

- Input route: `Reality`
- Active mode: `Diagnose`
- No production-code mutation before evidence confirms the failing path
- Expected recurrence guard: focused scenario coverage for the failing back
  chain

## Current Understanding

- The user expectation is: Order Detail back must not return to the intermediate
  ordering page.
- Current implementation already special-cases Order Detail back:
  - if the immediate router back entry starts with `/order/new`, the page tries
    `router.go(-2)`
  - otherwise it uses ordinary `router.back()`
  - if two-step history is unavailable, it falls back to
    `orderingEntry.prId -> /pr/:id`, else `/`
- Current relevant files:
  - `apps/frontend/src/pages/CommerceOrderDetailPage.vue`
  - `apps/frontend/src/pages/OrderingPage.vue`
  - `apps/frontend/src/domains/commerce/use-cases/usePlacementOrderingEntryFlow.ts`
  - `apps/frontend/src/shared/routing/useFallbackBack.ts`
  - `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`

## Evidence

- `OrderingPage.vue` navigates to Order Detail with `router.push({ path:
  \`/orders/\${created.orderId}\` })`.
- `usePlacementOrderingEntryFlow.ts` may also navigate directly to an existing
  order with `router.push({ path: \`/orders/\${existingOrder.id}\` })`.
- `CommerceOrderDetailPage.vue` currently decides whether to skip `/order/new`
  by reading `window.history.state.back`.
- Existing ride-hailing scenario coverage already expects Order Detail back to
  land on `/pr/:id`.
- Focused current verification on July 1, 2026:
  - `commerce_ride_hailing_ordering_reaches_order_detail` passed
  - `commerce_rental_ordering` passed
  - both covered the page-header back button flow rather than native
    browser/webview back navigation
- Therefore current automated evidence says:
  - the page-local header back behavior is working on the covered main flows
  - the browser history stack still retains `/order/new` after order creation
    because create-success navigation uses `router.push`, not `router.replace`

## Ranked Hypotheses

1. The observed behavior is native browser/webview back, not the Order Detail
   page-header back button. In that case the current implementation is expected
   to return to `/order/new` because the history stack still contains that
   route.
2. The observed regression happens on an entry path whose history state does not
   expose `/order/new` in `window.history.state.back`, so the page-local button
   policy falls back to plain `router.back()`.
3. The observed regression happens when the immediate history entry is
   `/order/new` but `position < 2`, so the page-local button logic cannot
   safely `go(-2)` and falls back to a PR route that is missing or stale.
4. The user observed a different page in the same flow, such as Bill Detail or
   Payment Checkout, rather than the Order Detail header back action.

## Verification

- Reproduce with a focused scenario or local manual flow.
- Inspect the actual browser/router history shape at the moment Order Detail
  renders.
- Distinguish page-header back from native browser/webview back; they are
  different mechanisms in the current implementation.
- Only after the failing chain is concrete, prepare an Impact Handshake and ask
  for explicit start before mutating production code.
