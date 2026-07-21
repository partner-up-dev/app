# 5-6A Implementation Log

## 2026-07-20 — Commerce Bill/Trade controller category cutover

The Commerce controller now imports named owner categories instead of Bill/Trade wildcard roots:

- Bill `queries` owns `getBillDetail`, `getBillDetailByOrderId`, `listViewerBills`, and the existing
  `getBillLineCheckoutTarget` read surface;
- Trade `commands` owns the controller's `createOrderCommand`, `cancelOrderFromOrderDetail`, and retired
  `simulateRentalBookingConfirmation` command symbols;
- Trade `queries` owns `getCommerceOrderDetail`, `listOfferListing`, and
  `queryRideHailingCancellationFeeFromOrderDetail`.

At this dated controller-only batch, root barrels remained intact for compatibility and were not edited. No Rental
test language, Ride reconciliation, Web code, or root index was changed in that batch; the final dated entry below
records their later retirement.

Root-consumer delta for this batch:

- before: `apps/backend/src/controllers/commerce.controller.ts` imported three Bill symbols from `domains/bill`
  and six Trade symbols from `domains/trade` (with the Bill line checkout read already coming from `bill/queries`);
- after: the controller has no Bill/Trade root imports; all nine controller symbols come from the named categories;
- remaining root consumers are tests/fixtures and persistence-bound model imports, not this production controller batch.

Verification:

```text
pnpm check:type:backend
pnpm exec oxlint apps/backend/src/domains/bill/queries.ts \
  apps/backend/src/domains/trade/commands.ts \
  apps/backend/src/domains/trade/queries.ts \
  apps/backend/src/controllers/commerce.controller.ts
pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario \
  apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts
```

All commands passed; the focused scenario completed 2/2 tests.

## 2026-07-20 — Merchandising production category cutover

Added three explicit owner surfaces without changing the Merchandising root compatibility barrel:

- `commands` exports only the five catalog/placement creation commands already consumed by the Admin Commerce
  controller;
- `queries` exports only Placement match, binding resolution, and ordering-entry resolution;
- `contracts` owns the Admin create-input DTOs, Placement result DTOs, package ordering projections, stable
  Merchandising model/value types, and pure invariant/type-guard functions already consumed across owners.
  Existing use-cases consume and compatibility-re-export the DTO definitions; `contracts` never forwards a
  use-case type.

Production consumers now use those categories:

- Admin Commerce runtime commands come from `merchandising/commands`, with input types from `contracts`;
- Placement controller runtime reads come from `queries`, with route result types from `contracts`; the existing
  in-flight correction from `OrderingEntryPayload` to `PlacementOrderingEntryResult` was preserved;
- `commerce-quote` imports `ProductType` and `PriceExplanation` directly from their pure model modules, removing its
  root wildcard without giving an entity a dependency on application contracts;
- the backend package re-exports `OrderingEntryPayload` and `OrderingOfferDetail` from `contracts` as type-only
  exports.

Cycle rehearsal initially exposed a type-only but directionally invalid
`entity -> contracts -> use-case -> entity` graph. The final shape removes it: `contracts` depends only on pure
Merchandising model types, use-cases depend on `contracts`, and `commerce-quote` depends directly on pure model
types. Tests, the Merchandising root index, Rental source/tests, Web, and durable documentation were not changed by
this batch.

Root-consumer delta for the bounded production inventory: all four named consumers now have zero imports from the
Merchandising root; persistence entities other than `commerce-quote` retain their explicitly excluded model imports,
and test compatibility consumers remain for a later batch.

Verification:

```text
pnpm check:type:backend
pnpm exec oxlint --deny-warnings \
  apps/backend/src/domains/merchandising/commands.ts \
  apps/backend/src/domains/merchandising/queries.ts \
  apps/backend/src/domains/merchandising/contracts.ts \
  apps/backend/src/domains/merchandising/use-cases/create-offer.ts \
  apps/backend/src/domains/merchandising/use-cases/create-placement.ts \
  apps/backend/src/domains/merchandising/use-cases/create-product-sku.ts \
  apps/backend/src/domains/merchandising/use-cases/create-product-spu.ts \
  apps/backend/src/domains/merchandising/use-cases/get-ordering-offer-detail.ts \
  apps/backend/src/domains/merchandising/use-cases/match-placement-instance.ts \
  apps/backend/src/controllers/admin-commerce-management.controller.ts \
  apps/backend/src/controllers/placement.controller.ts \
  apps/backend/src/entities/commerce-quote.ts \
  apps/backend/src/index.ts
pnpm exec vitest run --project system-scenario \
  tests/scenario/commerce/rental-ordering.scenario.test.ts
```

All commands passed; the focused Placement system scenario completed 1/1 test.

### Expanded Admin/Trade production closure

An ast-grep import-declaration audit subsequently found 16 production root import declarations across five Admin
Commerce Management use-cases and six Trade files. Classification showed no additional Commands, Queries, or Ports:
all imported symbols were pure Merchandising types, invariant validators, value helpers, or SKU-facts guards, so the
owner surface is `contracts`.

The cutover now also covers:

- Admin offer, placement, SPU, SKU, and cancellation-policy update invariants;
- Trade Order snapshot vocabulary, pricing application, order-item pricing, Rental service policy, offer listing,
  and create-order SKU facts refinement;
- relocation of the SKU-facts guards from the repository-backed ordering-detail use-case into pure contracts, with
  compatibility re-export from the old use-case surface;
- removal of the last entity type from Placement binding-contract resolution in favor of the stable
  `{ productType: ProductType }` input shape.

The same ast-grep audit now returns zero production imports whose source ends at `/merchandising` in the bounded
Admin/Trade trees. Three Trade unit-test type imports remain intentionally untouched for the later test-language
batch; the root barrel remains present.

Additional verification:

```text
ast-grep run --pattern 'import { $$$IMPORTS } from $SOURCE' --lang ts \
  apps/backend/src/domains/admin-commerce-management apps/backend/src/domains/trade --json=stream
ast-grep run --pattern 'import type { $$$IMPORTS } from $SOURCE' --lang ts \
  apps/backend/src/domains/admin-commerce-management apps/backend/src/domains/trade --json=stream
pnpm check:type:backend
pnpm exec oxlint --deny-warnings <25 touched production TypeScript files>
pnpm exec vitest run --project system-scenario \
  tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts \
  -t commerce_ride_hailing_ordering_reaches_order_detail_for_active_pr
```

Production root-edge result: zero. Typecheck and targeted lint passed. The selected active Ride system journey passed
1/1 with 8 non-selected scenarios skipped.

## 2026-07-20 — Production RideHailing/Payment command cutover

Added explicit command categories without deleting root barrels:

- RideHailing `commands` now owns browser reconcile, both CaoCao callback handlers, provider registration, and its
  registration-config parser;
- Payment `commands` now exposes the existing `registerPaymentProviderInstance` command;
- Commerce and provider callback controllers, plus RideHailing and Payment registration scripts, now import only
  those named command categories.

Production root-consumer delta for this batch:

- `commerce.controller.ts`: RideHailing reconcile moved from `domains/ride-hailing` to
  `domains/ride-hailing/commands`;
- `ride-hailing-provider.controller.ts`: two callback handlers moved to the command category;
- `scripts/ride-hailing/register-provider.ts`: parser and registration command moved to the category;
- `scripts/payment/register-provider.ts`: payment registration command moved to `domains/payment/commands`;
- no tests, root barrels, provider/sync implementation, Rental, Web, Bill, or Trade files were changed in this
  batch.

Verification:

```text
pnpm check:type:backend
pnpm exec oxlint apps/backend/src/domains/ride-hailing/commands.ts \
  apps/backend/src/domains/payment/commands.ts \
  apps/backend/src/controllers/commerce.controller.ts \
  apps/backend/src/controllers/ride-hailing-provider.controller.ts \
  apps/backend/src/scripts/ride-hailing/register-provider.ts \
  apps/backend/src/scripts/payment/register-provider.ts
pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario \
  apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts \
  -t "updates ride execution and creates final bill|queryOrderDetailV2 has no authoritative totalFee"
```

All commands passed; the focused callback scenario completed 2/2 selected tests.

## 2026-07-20 — Test consumer and payment-attempt fixture closure

Migrated non-Rental test consumers away from Bill/Trade/RideHailing/Payment root imports:

- Ride foundation/admin scenarios use Trade command and owner-local participant surfaces;
- Payment SSOT uses Bill/Payment command categories;
- CaoCao callback tests use explicit provider helper services and Payment commands;
- command categories gained only the required test-facing command surfaces (`createBillFromSeed`,
  `createRideHailingOrderFoundation`, `openOrLoadChargeExecution`, and settlement consequence).

The cancelled-ride callback fixture no longer calls `BillLineRepository.markSettledFromProvider` directly with an
unclaimed attempt. It now opens the provider execution slot through Payment, settles the exact returned attempt via
the Bill payment command, and applies the real Payment settlement consequence. This preserves the declared
Bill-owned compare-and-set execution contract and makes the full callback scenario pass.

Remaining test root consumers are limited to the explicitly excluded historical Rental persistence scenario:

```text
apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts
  domains/bill  (createBillFromSeed)
  domains/trade (buildOrderParticipantsFromContext, createOrderCommand)
```

No non-Rental test root consumers remain in `apps/backend/tests/**`.

Verification:

```text
pnpm check:type:backend
pnpm exec oxlint <changed command categories and migrated test files>
pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario \
  apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts \
  apps/backend/tests/ride-hailing/ride-hailing-order-foundation.scenario.test.ts \
  apps/backend/tests/ride-hailing/admin-ride-hailing-order.scenario.test.ts \
  apps/backend/tests/payment/payment-provider-ssot.scenario.test.ts
```

All selected scenarios passed (9 tests total: callback 6/6 and the three other scenario files 1/1 each).

## 2026-07-20 — Final owner-edge closure and compatibility-root retirement

The retained Commerce source/test consumers were cut over to Commands, Queries, Contracts, or Ports; the five
wildcard `domains/*/index.ts` compatibility roots are deleted. A final import-resolution audit included explicit
paths, relative paths resolving to root directories, re-exports, aliases, scripts, packages, backend tests, and
system scenarios. It found zero root consumers.

The final RideHailing transaction cut also narrowed the ordinary dispatch Port's runtime load: reconciliation
persistence is only loaded by the pre-cancel synchronisation path, not whenever an ordinary dispatch consumer imports
`ports.ts`. This prevented a database dependency from leaking into an otherwise pure unit import.

Verification after the final cut: full lint, backend type/build, complete backend scenario suite (25 files / 81
tests), complete system scenario suite (10 files / 37 tests), Web unit suite (63 files / 209 tests), and backend unit
suite with the repository's configured backend environment (90 files / 401 tests). The default backend-unit command
still requires `DATABASE_URL` in the invoking environment for a pre-existing PR Authoring test import; this is an
environment setup condition, not a Phase-5 behavior failure.
