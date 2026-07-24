# `8-3` — Web Dependency Direction

## Status

**Complete on 2026-07-23.** Sir authorized continuous execution through
`8-5`; successors `8-4` and `8-5` are also complete.

## Objective

Eliminate seven `model -> query` reverse dependencies and the PR Discovery
type-only SCC without replacing Backend inference with handwritten wire DTOs.

## Target Direction

```text
pure model/editor values
  -> workflow/query adapter mapping
  -> Backend-inferred request type
  -> RPC + cache effects

query response
  -> adapter-owned projection
  -> pure model/presentation
```

## Execution Order

1. Admin Commerce editor values and adapter mappings.
2. Admin PR Type Config editor values and inferred-request boundary.
3. Commerce ordering item/value mapping.
4. Extract the shared PR Discovery candidate/value contract that currently
   forms a two-file type cycle.
5. Re-run fitness and the Web import graph.

## Required Type Precondition

Five Admin Commerce endpoint-schema aliases currently declare request
`json: unknown`. Before their Web adapters can prove parity against
Backend-inferred request types, the aliases must use the already-active Zod
input schemas (including one shared SKU-update omit schema). This is a
compile-time correction only: validators, wire bodies and responses do not
change.

## Concrete Mapping

- Admin Commerce model owns editor values; an adapter projects responses to
  values and values to inferred SPU/SKU/cancellation/Offer request bodies.
- Admin PR Type Config model owns its draft/section values; its adapter maps
  the whole draft and five section requests explicitly.
- Commerce ordering model owns the minimal fixed/choice-set order-item values;
  its adapter maps them to the inferred create-order request.
- PR Discovery extracts one persisted-candidate value leaf so suggestion and
  composed discovery types depend in one direction.

## Preflight Simulation

- Query modules retain endpoint invocation and cache invalidation ownership.
- Models never import query modules, RPC clients or UI.
- Adapters map every wire field explicitly and parity tests cover nullable and
  optional fields, preventing a handwritten parallel wire DTO.
- The type-only SCC extraction introduces no runtime import or broader barrel.

## Verification Batches

Request-body parity and editor-model tests precede Web type/build proof. Final
proof requires zero `model -> queries` imports, zero Web SCC, seven fitness
findings removed and no changed HTTP body snapshots.

The completed proof is recorded in
[`verification-log.md`](./verification-log.md).

## Exit

- zero model imports from `queries`, RPC clients or UI;
- no Web production SCC;
- query adapters remain the only endpoint/cache owner;
- no duplicate response/input truth; and
- editor/order behavior and emitted request bodies remain equivalent.

## Non-goals

No giant-page split by LOC, TanStack abstraction layer, route redesign, cache
policy change or WeChat callback work.
