# PRD Index

## Role In The System

`docs/10-prd/` is the canonical product-intent layer for PartnerUp MVP-HA.

This layer defines:

- what product pressures we are responding to
- what durable user-visible behavior must hold
- what rules and scope boundaries future implementation must honor
- what derived domain structure helps keep the product intelligible
- what business terms must stay stable across product discussions

## What This Layer Owns

- product drivers
- product claims
- product capabilities
- workflows
- user-visible rules and invariants
- scope boundaries
- universal and context-scoped business vocabulary
- derived domain structure

## What Must Not Appear Here

- workspace or package decomposition
- module ownership layout
- internal controller / service / repository structure
- rollout procedures and deployment runbooks
- task-local implementation sequencing
- framework ontology that belongs in `docs/00-meta/`

## How To Read This Layer

Recommended order:

1. `glossary.md` and `vocabulary/*` when business language is relevant
2. `_drivers/*` for upstream pressure
3. `behavior/claims.md`
4. `behavior/workflows.md`, then the relevant `behavior/workflows/*` file
5. `behavior/rules-and-invariants.md`
6. `behavior/scope.md`
7. `domain-structure/*`

If the change is reference-sensitive, read `docs/15-alignment/README.md` and `docs/15-alignment/ui-map.yaml` first.

Use `behavior/capabilities.md` as the product surface map, not as the primary source of truth.
Treat `_drivers` as upstream truth and `domain-structure` as derived structure that must not redefine drivers or claims.

## How This Layer Connects To Adjacent Layers

- Upstream from root `AGENTS.md` and `docs/00-meta/*`: this layer is the primary owner for `Intent` inputs.
- Downstream to Product TDD: technical decomposition must realize the claims, workflows, and rules defined here.
- Sideways to `docs/40-deployment/*`: runtime realities may constrain the product, but runtime procedures do not belong here.

## Common Local Mistakes

- starting from architecture instead of product pressure
- treating page structure as the same thing as product capability
- mixing current implementation detail into durable product rules
- letting derived domain structure silently redefine product drivers or claims
- defining context-specific vocabulary without routing it through `glossary.md`
