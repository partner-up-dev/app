# Product TDD Index

## Role In The System

`docs/20-product-tdd/` preserves the smallest durable set of cross-unit technical truths for PartnerUp MVP-HA.

This layer exists because the product is realized by at least two meaningful units, and some important behavior depends on backend/frontend coordination rather than on one package alone.

## What This Layer Owns

- technical units and their responsibilities
- authoritative state boundaries
- cross-unit contracts that must stay coherent
- cross-unit scenario verification boundaries
- how major product claims are realized across units

## What Must Not Appear Here

- repo-global documentation policy
- product claims without technical realization context
- exhaustive controller or route catalogs that code already explains cheaply
- broad package manuals that are better kept in package `AGENTS.md`
- rollout and recovery procedures that belong in deployment docs

## How To Read This Layer

1. `unit-topology.md`
2. `claim-realization-matrix.md` when translating PRD claims into technical realization
3. `system-state-and-authority.md`
4. `ecommerce-contracts.md` when the change touches ecommerce loops, admin
   commerce surfaces, or PR-attached orders
5. `ecommerce-provider-contracts.md` when provider-specific commerce behavior affects billing, settlement, cancellation, or user-visible order state
6. `cross-unit-contracts.md` for shared frontend/backend substrate and contract routing
7. `pr-lifecycle-contracts.md` when the change touches PR creation, lifecycle, join, waitlist, Study Sprint, share, or action availability
8. `pr-discovery-and-authoring-contracts.md` when the change touches PR Discovery, Form/Card/List views, Authoring handoff, or POI applications
9. `pr-messaging-contracts.md` when the change touches PR messages, read markers, or unread-wave handoff
10. `admin-surface-contracts.md` when the change touches operator/admin cross-unit surfaces outside ecommerce-specific detail
11. `analytics-and-telemetry-contracts.md`
12. `bi-domain-contracts.md`
13. `test-platform.md`
14. `notification-contracts.md`

If the change is reference-sensitive, read `docs/15-alignment/README.md` and `docs/15-alignment/ui-map.yaml` first.

Read only the files needed for the change at hand.

## How This Layer Connects To Adjacent Layers

- Upstream from PRD: this layer realizes product claims, workflows, and rules without redefining them.
- Downstream to optional Unit TDD: only create a unit-local doc when a hard local unit needs durable design memory.
- Sideways to deployment docs: keep system-shaping coordination facts here, but runtime procedures and operational interfaces in deployment docs.

## Current Scope

- The system objective is to keep backend authority over product truth while exposing that truth to the frontend through typed contracts and browser-aware UX.
- Broad frontend/backend package manuals are intentionally not part of Product TDD; keep this layer focused on cross-unit questions.
