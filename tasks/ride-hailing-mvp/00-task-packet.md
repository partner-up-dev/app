# Ride Hailing MVP

Date: 2026-06-17

## Purpose

This file is now the packet index for the Ride Hailing MVP recovery work.

The task is too large for a monofile packet. Working state should move into the
smallest focused sibling file instead of accumulating here.

## Packet Map

- `control.md`
  - current task control surface, governing principles, active sequence, and
    human-confirmation boundary
- `subtasks/00-order-spine-correction/control.md`
  - completed correction from support-handoff detour to real order creation and
    order detail navigation
- `subtasks/10-fake-caocao-local-dev/control.md`
  - completed first-class fake Caocao local provider package work
- `subtasks/20-dev-ride-hailing-fixtures/control.md`
  - development-only RideHailing provider/catalog/offer/placement fixture and
    task-local manual seed state
- `subtasks/30-ordering-page-ui/control.md`
  - discussion packet for the `/order/new` RideHailing ordering UI before any
    implementation
- `subtasks/40-order-detail-ui/control.md`
  - discussion packet for the `/orders/:orderId` RideHailing lifecycle UI
- `subtasks/50-provider-authored-ride-options/control.md`
  - pending contract decision for catalog-seeded vs provider-authored ride
    options
- `subtasks/60-runtime-verification/control.md`
  - cross-subtask runtime and scenario verification checklist
- `10-flow-correction.md`
  - first product correction: remove the support-handoff detour and restore the
    real `quote -> create order -> order detail` spine
- `20-caocao-mock-server.md`
  - local-dev fake provider strategy, comparison with fake WeChatPay, and the
    minimum work needed to make provider-backed UI iteration practical
- `30-ui-runtime-audit.md`
  - current ordering/detail UI weaknesses and the runtime checkpoints to use
    once dev servers are running
- `dev-ride-hailing-ordering-seed.sql`
  - temporary dev-only SQL seed for entering the RideHailing ordering page from
    a PR Page Button Placement
- `dev-ride-hailing-portless-endpoint-patch.sql`
  - temporary dev-only SQL patch for databases that already applied the first
    seed with fixed-port fake Caocao / callback URLs
- `dev-ride-hailing-placement-type-patch.sql`
  - temporary dev-only SQL patch for databases that already applied the first
    seed with task-private `ride-hailing-mvp-dev` Placement matching

## Objective & Hypothesis

Bring the existing ride-hailing flow up to MVP quality by closing the gap in three areas:

1. ordering page UI
2. order detail page UI
3. dynamic SPU / SKU resolution for route-aware ride-hailing offers

Hypothesis:

- the repository already contains a near-complete commerce and ride-hailing foundation
- the main gap is not feature existence but contract alignment between route context, provider quote lookup, and user-facing ordering / detail surfaces
- the safest path is to map the current product + technical contract first, then isolate whether the MVP uplift is mostly frontend assembly, API contract correction, or catalog / provider topology work

## Guardrails Touched

- Provisional input route: Reality against existing ecommerce contract, with a possible Constraint / Intent slice only if provider-authoritative SKU discovery needs new durable contract
- Active mode: Explore / Solidify until a subtask implementation shape is
  explicitly confirmed
- Durable owners likely involved:
  - `docs/10-prd/`
  - `docs/20-product-tdd/`
  - `apps/frontend/src/pages/`
  - `apps/frontend/src/domains/commerce/`
  - `apps/backend/src/controllers/commerce.controller.ts`
  - `apps/backend/src/domains/commerce/`
  - `apps/backend/src/domains/ride-hailing/`
- Local constraints to load before mutation:
  - `apps/frontend/AGENTS.md`
  - nearer frontend / backend `AGENTS.md` in touched subtrees
- Human confirmation required before non-task-packet code edits

## Verification

- Establish current route + page + query + provider topology from source, not assumption
- Cross-check current implementation against durable ecommerce / ride-hailing contracts
- Identify whether MVP target requires PRD change, Product TDD change, or implementation-only work
- Execution slice verification completed:
  - `pnpm --filter @partner-up-dev/fake-caocao-server test`
  - `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
  - `pnpm check:type:frontend`
  - `pnpm vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts tests/scenario/commerce/rental-ordering.scenario.test.ts`

## Current Understanding

- Ride-hailing code already exists across frontend and backend
- The first two enabling slices are now implemented:
  - fake Caocao is runnable as a standalone workspace dev tool
  - `/order/new` now creates real orders and routes to `/orders/:orderId`
- A temporary dev DB seed now exists for live ordering-page iteration from a
  real PR Placement entry. It expects portless URLs:
  `https://fake-caocao.localhost` for the fake provider and
  `https://api.partner-up.localhost` for callbacks.
- Fake Caocao follows the same portless pattern as backend/frontend: the package
  `dev` script stays a normal server start, while the root
  `pnpm dev:portless:fake-caocao` script wraps it with app name `fake-caocao`.
- Stable fake Caocao provider/catalog/offer/placement setup now belongs to a
  development-only data migration. The task SQL only creates a fresh manual-test
  PR after `pnpm db:migrate:dev`.
- The temporary RideHailing Button Placement must match real PR type
  `RIDE_HAILING`. The earlier task-private `ride-hailing-mvp-dev` type was a
  seed mistake and has an append-only dev DB patch.
- Latest dev data migration verification:
  - environment-aware data migration parsing is covered by
    `apps/backend/src/scripts/db/shared.test.ts`
  - `pnpm db:lint`, backend type/config checks, and FC migration bundle build
    pass after adding the development-only RideHailing fixture migration
  - `pnpm db:migrate:dev` now loads `apps/backend/.env`, but live dev DB
    execution is blocked in this workspace by
    `CONNECT_TIMEOUT ws-win.hadream.localhost:5436`
- Known concern areas from the request:
  - ordering page UI is below MVP standard
  - order detail page UI is below MVP standard
  - SPU / SKU must be dynamic per city and route
  - route-specific SKU list and price estimate should come from the ride-hailing provider, not only static local catalog truth
- Unknowns still blocking execution:
  - whether MVP uplift should first change durable product truth or can stay implementation-local
  - whether provider-authoritative SKU discovery needs a new backend contract instead of reusing `ordering/evaluate`

## Exploration Findings

- Current user-facing route spine is implemented in frontend router:
  - `/order/new`
  - `/order/support`
  - `/orders/:orderId`
- Backend already exposes the durable commerce API spine:
  - `POST /api/commerce/ordering/evaluate`
  - `POST /api/commerce/orders`
  - `GET /api/commerce/orders/:orderId`
- Frontend ordering page now calls the real `createOrder` mutation and routes to
  `/orders/:orderId` on success.
- Existing browser scenario coverage has been updated to assert real order
  creation for both ride-hailing and rental ordering.
- Placement ordering entry already injects route-scoped defaults into bindings:
  - route snapshot
  - departure time
  - participant list
  - viewer contact phone
  - This is why the current ride-hailing ordering panel works despite having no visible contact input.
- Dynamic ride quote exists, but the current SKU discovery model is hybrid rather than provider-authoritative:
  - offer detail returns static SPU / SKU options from catalog
  - ordering evaluation then calls provider estimate per catalog SKU
  - unavailable SKUs become disabled after provider estimate failure
  - therefore the provider influences price and availability, but does not author the initial candidate SKU set
- Current provider quote / create calls only use origin and destination coordinates plus vehicle type code.
  - waypoints are stored in snapshots but are not part of the provider estimate or create request path
  - city is not an explicit first-class query parameter in the current contract
- Current ride-hailing order detail page is a low-fidelity surface:
  - route map is a CSS illustration, not the shared route map component
  - detail polling refetches the whole order every 1.5 seconds before bill creation
  - the page mixes ride and rental detail responsibilities in one file and one layout
  - it is serviceable for internal verification, but not yet an MVP-quality passenger-facing lifecycle page

## Evidence Pointers

- Frontend router: `apps/frontend/src/app/router.ts`
- Current ordering submit behavior: `apps/frontend/src/pages/OrderingFromPlacementPage.vue`
- Current support handoff page: `apps/frontend/src/pages/OrderingSupportPage.vue`
- Current order detail page: `apps/frontend/src/pages/CommerceOrderDetailPage.vue`
- Frontend commerce queries: `apps/frontend/src/domains/commerce/queries/useCommerce.ts`
- Ride-hailing ordering panel: `apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingPanel.vue`
- Ordering entry binding assembly: `apps/backend/src/domains/merchandising/use-cases/match-placement-instance.ts`
- Backend commerce controller: `apps/backend/src/controllers/commerce.controller.ts`
- Ride quote evaluation: `apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts`
- Real order creation: `apps/backend/src/domains/trade/use-cases/create-order.ts`
- Current browser scenario expectation: `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`

## Confirmed Constraints

- Exploration and task packet work are allowed now
- Production code mutation for completed foundation slices was approved and
  executed
- Production code mutation for ordering-page UI, order-detail UI, and provider
  authored options is not yet approved
- Prefer smallest useful reference set and keep this packet current as evidence changes

## Next Step

1. Review `subtasks/30-ordering-page-ui/control.md` and confirm the ordering
   page UI direction.
2. Then review `subtasks/40-order-detail-ui/control.md` and confirm the detail
   page lifecycle direction.
3. Then decide whether `subtasks/50-provider-authored-ride-options/` belongs in
   the same MVP pass or a later contract slice.
4. Use `subtasks/60-runtime-verification/` once a concrete implementation slice
   is approved.

## Working Rule

Do not keep expanding this file as a running log. Update the smallest relevant
packet file instead.
