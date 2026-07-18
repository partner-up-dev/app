# 05A — Curated Canonical PR Surface

## Objective

Replace `domains/pr` wildcard and service-barrel exposure with named root category entrypoints that map every
runtime-needed PR command/query/contract to a canonical owner. Do not physically move all `pr-core` code merely to
change an import path.

## Owned Surface

- `apps/backend/src/domains/pr/{index,commands,queries,contracts}.ts` and only the narrow adapters required to
make those entrypoints real.
- Symbol map and characterization notes in this task folder.

## Status

Complete. The symbol map was used to materialize named `domains/pr` command/query/contract/port entrypoints without
retaining a wildcard compatibility barrel.

## Decision Rules

- Public entrypoints contain only commands, canonical queries/read projections, stable contracts/problem codes,
  or real events/ports.
- `attachOrderToPr` is a PR command with its attachability guard; Trade must not receive PR persistence or status
  internals.
- Controller identity conversion may remain a controller/PR adapter; do not expose a generic creator-identity
  service as a cross-domain convenience API.

## Verification

- Symbol map covers every exported/runtime consumer family before replacing imports.
- No new `domains/pr → domains/pr-core` edge; root `pr` entrypoints contain no wildcard service barrel.
- Focused PR scenarios selected from the entry matrix plus type/build after the first public-surface batch.

## Stop Conditions

An old symbol with no narrow PR meaning, a required transaction that crosses Trade persistence, or a behavior
contract not covered by an existing scenario returns this subtask to mapping rather than widening `pr`.
