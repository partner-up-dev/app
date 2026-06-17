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

0. Completed: prepare local-dev provider infrastructure so UI iteration can
   happen against a deterministic fake Caocao service.
1. Completed: correct the broken product flow:
   `quote/vehicle selection -> support handoff`
   to
   `quote/vehicle selection -> create order -> order detail`.
2. Next: iterate on ordering page UI.
3. Then iterate on ride-hailing order detail UI.
4. After the above, decide whether dynamic SKU discovery should stay
   catalog-seeded or become provider-authored.

## Why This Sequence

- UI work before flow correction is high-churn because the page responsibilities
  are still wrong.
- Provider-backed local dev is a practical prerequisite for rapid UI correction.
- Dynamic provider-authored SKU discovery is important, but it is a deeper
  contract change than restoring the real order spine.

## Human Confirmation Boundary

- Task-packet work and exploration are approved.
- Any production code mutation still requires an explicit human start signal.
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
