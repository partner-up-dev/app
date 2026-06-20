# Ride Hailing MVP Control

## Objective & Hypothesis

Objective:

- recover the Ride Hailing web journey to a real MVP-quality commerce flow
- keep the resulting topology simpler, clearer, and more maintainable than the
  current hybrid detour

Hypothesis:

- the backend foundation is already strong enough that the main recovery is
  frontend flow correction plus a small number of contract decisions
- the most dangerous trap is to preserve tactical detours such as
  `quote/vehicle selection -> support handoff` just because they already work
- the correct route is to remove transitional behavior where it conflicts with
  the durable commerce contract

## Design Principles

- Do not preserve a wrong topology for compatibility.
- Prefer lower complexity and clearer ownership over smaller diffs.
- Prefer explicit boundaries over convenience state hidden in page files.
- Reuse existing strong foundations when they are correct.
- If an existing implementation is structurally wrong, replace it rather than
  layering more patches on top.

## Classification

- Primary route today: `Reality`
- Possible follow-up route: `Constraint` or `Intent` only if provider-driven SKU
  discovery requires a durable new contract
- Active mode: `Execute`
- Current collaboration state: implement the confirmed
  `subtasks/30-ordering-page-ui/` slices while keeping each mutation explicit
  and reviewable

## Durable Owners In Scope

- `docs/20-product-tdd/ecommerce-contracts.md`
- `apps/frontend/src/pages/OrderingFromPlacementPage.vue`
- `apps/frontend/src/pages/CommerceOrderDetailPage.vue`
- `apps/frontend/src/domains/commerce/`
- `apps/backend/src/controllers/commerce.controller.ts`
- `apps/backend/src/domains/trade/`
- `apps/backend/src/domains/ride-hailing/`
- `packages/fake-caocao-server/`

## Confirmed Current Truth

- The durable contract already says the user-facing spine is:
  - `PR Page`
  - `/order/new`
  - `/orders/:orderId`
- The backend already supports that spine with real evaluation, real order
  creation, and real order detail reads.
- The shared ordering submit flow now follows that spine again.
  - `OrderingFromPlacementPage.vue` calls the real create-order mutation.
  - Success routes to `/orders/:orderId`.
  - `/order/support` remains in the codebase, but no longer owns the primary
    `下单` meaning.
- Dynamic ride quote exists, but candidate SKU discovery still starts from
  catalog SPU/SKU truth instead of provider-authored availability.
- `packages/fake-caocao-server/` is now promoted into a first-class dev package
  for this workflow.
  - It has a standalone `dev` entry.
  - It has package tests and package-boundary scenario usage.

## Active Sequence

0. Completed subtask:
   `subtasks/00-order-spine-correction/`
   - correct the broken product flow from
     `quote/vehicle selection -> support handoff`
     to
     `quote/vehicle selection -> create order -> order detail`.
1. Completed subtask:
   `subtasks/10-fake-caocao-local-dev/`
   - prepare local-dev provider infrastructure so UI iteration can happen
     against a deterministic fake Caocao service.
2. Prepared subtask:
   `subtasks/20-dev-ride-hailing-fixtures/`
   - keep RideHailing mock data and manual-test seed state explicit.
3. Discussion subtask:
   `subtasks/30-ordering-page-ui/`
   - confirm the `/order/new` UI shape before implementation.
4. Pending discussion subtask:
   `subtasks/40-order-detail-ui/`
   - confirm the `/orders/:orderId` RideHailing lifecycle UI shape before
     implementation.
5. Pending decision subtask:
   `subtasks/50-provider-authored-ride-options/`
   - decide whether dynamic SKU discovery stays catalog-seeded or becomes
     provider-authored.
6. Cross-subtask verification packet:
   `subtasks/60-runtime-verification/`
   - preserve the runtime checklist and commands used once a slice is approved.

## Why This Sequence

- UI work before flow correction is high-churn because the page responsibilities
  are still wrong.
- Provider-backed local dev is a practical prerequisite for rapid UI correction.
- Dynamic provider-authored SKU discovery is important, but it is a deeper
  contract change than restoring the real order spine.

## Human Confirmation Boundary

- Task-packet work and exploration are approved.
- Any new production code mutation still requires an explicit human start
  signal.
- Before that start signal, prepare only:
  - task packet structure
  - evidence
  - impact handshake
  - execution slices

## Verification

- Evidence is source-backed and recorded in sibling packets.
- Verified execution slice:
  - `pnpm --filter @partner-up-dev/fake-caocao-server test`
  - `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
  - `pnpm check:type:frontend`
  - `pnpm vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts tests/scenario/commerce/rental-ordering.scenario.test.ts`
