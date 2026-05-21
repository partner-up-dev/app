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
2. `system-state-and-authority.md`
3. `cross-unit-contracts.md`
4. `analytics-and-telemetry-contracts.md`
5. `bi-domain-contracts.md`
6. `test-platform.md`
7. `notification-contracts.md`
8. `claim-realization-matrix.md`

If the change is reference-sensitive, read `docs/15-alignment/README.md` and `docs/15-alignment/ui-map.yaml` first.

Read only the files needed for the change at hand.

## How This Layer Connects To Adjacent Layers

- Upstream from PRD: this layer realizes product claims, workflows, and rules without redefining them.
- Downstream to optional Unit TDD: only create a unit-local doc when a hard local unit needs durable design memory.
- Sideways to deployment docs: keep system-shaping coordination facts here, but runtime procedures and operational interfaces in deployment docs.

## Current Scope

- The system objective is to keep backend authority over product truth while exposing that truth to the frontend through typed contracts and browser-aware UX.
- Broad frontend/backend package manuals are intentionally not part of Product TDD; keep this layer focused on cross-unit questions.
