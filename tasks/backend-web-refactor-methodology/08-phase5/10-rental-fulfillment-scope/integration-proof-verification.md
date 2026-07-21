# Rental Runtime Retirement Integration Verification

## Result

The R0 runtime cut-off is integration-proven at real backend HTTP ingress.
Rental listing, quote-backed create-order, customer mock booking confirmation,
and Admin booking confirmation all return:

- HTTP `410`;
- code `RENTAL_RUNTIME_RETIRED`;
- type `https://partner-up.app/problems/commerce.rental-runtime-retired`.

No Rental production source or existing legacy Rental test was modified.

## Effect Proof

The new scenario takes two independent effect baselines:

1. after the Rental catalog fixture but before the listing request;
2. after the single required Rental quote fixture but before create/fulfillment
   requests.

The before/after snapshots are deeply equal. They include:

- Commerce quote rows;
- Trade Order rows;
- Bill rows;
- RentalOrder rows;
- CreateOrderAttempt rows;
- fake WeChatPay transaction and refund counts;
- fake Caocao create-request, provider-order, and fee-confirm counts.

This distinguishes a stable rejection from a rejection that happens after a
write or provider call. The directly seeded Rental quote is setup only and is
included in the second baseline before the rejected create request.

## Verification Commands

| Command | Result |
| --- | --- |
| `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-runtime-retirement.scenario.test.ts` | Pass — 1 test |
| selected `commerce_ride_hailing_ordering_reaches_order_detail_for_active_pr` system scenario | Pass — 1 selected, 8 skipped |
| strict standalone `tsc` for the new scenario with backend `typeRoots` | Pass |
| `pnpm check:type:backend` | Pass |
| scoped Oxlint for the new scenario | Pass |
| scoped `git diff --check` | Pass |

## Legacy Suite Compatibility

The existing `commerce_rental_ordering_reaches_order_detail_for_active_pr`
scenario was run once to characterize compatibility. It fails, as expected,
waiting for `pr-detail.commerce-placement.open`: R0 filters active Rental
placements, while this legacy scenario still asserts that active Rental
ordering reaches Order Detail.

The same file contains nine active-Rental browser journeys. They are
superseded expectations and will continue to block a whole system-scenario run
until their owner deletes, quarantines, or rewrites them as retirement/read-only
expectations. This is not a failure of the new retirement contract, and this
proof slice deliberately did not alter those legacy tests.

## Exit Assessment

The requested Phase-level 5-4 integration proof is complete for Rental public
write ingress and provider/database non-effects. The retained Ride Commerce
path remains green. Full-suite cleanliness is separately blocked by the known
legacy active-Rental scenario file.
