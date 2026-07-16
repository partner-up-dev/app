# Unit TDD Index

## Role In The System

`docs/30-unit-tdd/` is an optional layer for hard local units only.

Use it when code plus Product TDD are no longer enough to preserve a fragile local truth. Do not use it as a default package manual.

## What This Layer Owns

- local invariants that are easy to violate
- non-obvious local authority or state rules
- risky interaction or failure semantics inside one hard unit
- unit-specific verification expectations when they are costly to rediscover

## What Must Not Appear Here

- repo-global ontology
- product claims
- cross-unit contracts that belong in Product TDD
- deployment workflows that affect the whole system rather than one unit

## How To Read This Layer

1. read `docs/20-product-tdd/index.md` and relevant Product TDD docs first
2. open a unit doc only if one exists for the exact hard unit you are changing

Current repo state:

- active hard-unit docs:
  - [WeChat OAuth Handoff](./wechat-oauth-handoff.md)
  - [Frontend Shared UI Primitives](./frontend-shared-ui-primitives.md)
  - [Backend Migration Ledger](./backend-migration-ledger.md)
- broad frontend/backend package folders were intentionally removed as over-broad

## When To Create A Unit TDD Doc

Create a Unit TDD doc when a named local unit has durable design memory that is
too local for Product TDD and too deep for an edit-time `AGENTS.md` warning.

Strong triggers:

- multi-file local choreography with failure semantics
- sequencing constraints that are hard to rediscover from code
- local state authority or ownership rules that must not move up to Product TDD
- repeated nearby `AGENTS.md` hazards that are becoming durable design memory
- unit-specific verification expectations that are costly or non-obvious

Do not create Unit TDD for:

- broad backend or frontend package manuals
- ordinary folder conventions already covered by local `AGENTS.md`
- product behavior that belongs in PRD
- cross-unit contracts that belong in Product TDD
- runtime, rollout, or recovery truth that belongs in deployment docs
- package API usage better owned by package docs or an Intent skill

## Topology Note

The current Unit TDD layout is flat by file. This is a working shape, not a
permanent architecture claim.

Reconsider a tree layout when:

- a unit needs multiple files or supporting assets
- several Unit TDD files grow large enough that index navigation becomes weak
- unit families emerge and flat names become awkward or ambiguous
- local `AGENTS.md` pointers become harder to keep precise with flat filenames

## Candidate Backlog

| Candidate | Current Status | Promotion Signal |
| --- | --- | --- |
| `frontend-shared-ui-primitives` | active | Shared UI primitive selection and extension policy needs a durable local owner without becoming a package API manual. |
| `backend-migration-ledger` | active | Migration ledger, prefix, environment, seed, and reset rules have costly local failure modes. |

## How This Layer Connects To Adjacent Layers

- Upstream from Product TDD: unit docs inherit boundaries and contracts, and must not redefine them locally.
- Downstream to code: the unit implementation should honor the local design and verification expectations documented here.
- Sideways to deployment docs: unit-local operational notes may exist, but system-wide rollout or recovery belongs in deployment docs.

## Escalation Rule

If a local design decision changes another unit’s expectations, move the decision up to Product TDD instead of leaving it local.

## Common Local Mistakes

- redefining cross-unit contracts locally
- documenting product claims or drivers inside unit docs
- treating unit docs as a replacement for Product TDD
- burying system-wide deployment expectations inside unit notes
