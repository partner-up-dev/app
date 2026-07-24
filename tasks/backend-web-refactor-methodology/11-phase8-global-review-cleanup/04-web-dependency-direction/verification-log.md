# `8-3` Verification Log

Date: 2026-07-23

## Result

Complete. The seven reviewed Web `model -> query` findings and the PR
Discovery type-only cycle were removed without adding a handwritten transport
contract or moving RPC/cache effects into models.

## Structural Proof

- Architecture fitness: `955 files / 3,613 edges / 10 known findings /
  0 new / 0 unresolved`.
- The ten remaining findings are exactly seven Backend
  `controller -> repository` seams and three already-reviewed Web residue
  findings; all seven `web/no-model-to-query` findings are stale relative to
  the Phase 3 baseline.
- Direct production imports from a domain `model` path to a domain `queries`
  path: zero.
- Web dependency graph:
  - static: `438 files / 1,219 edges / 0 cyclic components`;
  - static plus dynamic imports: `438 files / 1,259 edges /
    0 cyclic components`.
- Architecture-fitness guard suite: `8/8`.

## Behavior And Type Proof

- Five focused adapter/model files: `14/14` tests.
- Complete Web unit project: `76 files / 248 tests`.
- Backend typecheck passed after the Admin Commerce endpoint aliases were
  derived from their active Zod schemas.
- Web typecheck passed.
- Web production build passed with `927` modules transformed.
- Adapter parity covers:
  - Admin Commerce SPU/SKU/cancellation-policy/Offer value-to-body mapping and
    workspace response projection;
  - Admin PR Type Config detail-to-draft and whole/five-section request
    mapping;
  - Commerce fixed and choice-set create-order items, including nullable
    `prId` and optional quantities.

## Preserved Ownership And Behavior

- Query modules still own endpoint invocation and TanStack cache effects.
- Models own editor/order semantic values and do not import RPC clients.
- Adapter request types are inferred from the Hono client; the adapters map
  fields explicitly instead of declaring parallel wire DTOs.
- Create-order idempotency-key placement and nullable `prId` semantics remain
  unchanged.
- PR Discovery now has a focused persisted-candidate type leaf; its previous
  compatibility export remains available without recreating the cycle.
