# 06B.2 — PR Discovery Adapter Contract Pilot

## Objective

Move Hono request/response inference out of PR model files and into one PR domain adapter contract module. Preserve
existing model and query import paths where they are compatibility facades; no endpoint, UI behavior or response
shape changes.

## Owned Surface

- `apps/web/src/domains/pr/contracts.ts`
- PR model files that previously imported `client`, `InferResponseType` or query-owned aliases
- the three PR query adapters that re-export a moved type alias for existing UI consumers
- focused PR model/query tests

## Entry Information

Before this pilot, `model/detail.ts`, `model/types.ts` and `model/pr-discovery-types.ts` performed Hono inference
through `lib/rpc`; `model/authoring.ts` and `model/pr-discovery-form.ts` imported a query-owned alias. The selected
contract owner is `apps/web/src/domains/pr/contracts.ts`, which uses a type-only `client` import and derives all
aliases with `InferRequestType` / `InferResponseType`.

## Fork / Stop Conditions

- A route shape change, runtime client import in model code, type cycle, or need for a handwritten response DTO
  stops the pilot.
- Existing UI type imports may remain only as explicit query re-export compatibility facades; they are inventory for
  06C rather than justification for a model-to-query edge.

## Low-cost Verification

- Focused model-edge search has no `Infer*`, `@/lib/rpc` or query type import in the owned model files.
- Relevant PR Web tests, Web type/build and diff check pass.

## Status

Complete on 2026-07-17; see [`exit-evidence.md`](./exit-evidence.md).
