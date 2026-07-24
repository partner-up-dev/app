# `8-2` — Cross-unit Contract Owner Convergence

## Status

**Complete on 2026-07-23.** `8-1` proof is complete. Sir authorized continuous
execution through `8-5`.

## Objective

Preserve `@partner-up-dev/backend/contracts` symbol names and consumer behavior
while moving every exported definition from entity/service/implementation
files to an explicit owner-backed contract/value module.

## Current Fan-out

Five export groups currently originate from:

- Feedback questionnaire entity/schema;
- PR join-gate entity/value code;
- Partner Request entity/schema;
- image-storage service; and
- telemetry Registry implementation.

There are 44 Web/System consumer files. The fan-out makes a stable facade
important and an implementation-derived source dangerous.

## Execution Order

1. Freeze exported symbol names, TypeScript equality, runtime validation owner
   and actual consumer families.
2. Extract Feedback and PR value schemas/types into their domain contract
   owners; persistence entities import those values.
3. Extract Storage input value and Telemetry active-event projection into
   focused owner contract modules.
4. Make the package subpath re-export only those owner modules.
5. Add a structural guard forbidding entity/repository/service/adapter imports
   in the package contract graph.
6. Run Backend/Web/System contract proof without changing HTTP responses.

## Concrete Batches

1. Feedback owner: move questionnaire runtime schemas and inferred values to
   `domains/feedback-questionnaire/contracts.ts`; the entity imports and may
   compatibility-re-export the same symbols.
2. PR values: create low-dependency `contracts/join-gate.ts`,
   `contracts/meeting-point.ts` and `contracts/partner-request.ts`; persistence
   entities import those single schema objects. The package facade must not
   point at the broader PR barrel.
3. Storage and Telemetry: move the upload-purpose value to
   `infra/storage/contracts.ts`; split the Telemetry registry literal and
   derived active-event types from lookup/validation implementation.
4. Point `src/contracts.ts` only at owner contract leaves and add a recursive
   structure guard plus type/schema-identity proof.

## Preflight Simulation

- Existing package symbol names and all 44 consumer import paths remain
  unchanged.
- Drizzle tables, JSONB column types, HTTP validators and response shapes keep
  using the same Zod schema objects; there is no copied runtime validator.
- The Telemetry event registry remains one runtime literal and the active event
  union remains derived from it. Moving the literal must not introduce a PR
  entity dependency or initialization cycle.
- Entity compatibility exports are transitional aliases only; the facade's
  transitive relative graph must terminate in owner contract leaves.

## Verification Batches

Each owner extraction first runs its focused unit tests and Backend type-check.
The completed slice then runs Web type/build proof, Backend/Web unit suites,
the named Feedback/PR/Telemetry scenarios, package-symbol equality checks,
architecture fitness and Backend SCC comparison.

## Exit

- the subpath has no entity, repository, service, adapter or wildcard source;
- schema/type identity and public symbol names remain stable;
- persistence and runtime implementations depend inward on owner contracts;
- all 44 consumer files type-check without a parallel DTO truth.

## Non-goals

No API redesign, response DTO rewrite, generated client, runtime package
export, Drizzle table change or broad Backend barrel cleanup.

## Exit Result

- All 21 package symbols retain their names and exact owner-type identity.
- Feedback, PR, Storage and Telemetry runtime schema/literal definitions each
  have one owner. Entity/service compatibility exports reference the same
  objects rather than copied validators.
- The facade's recursively traced graph contains no entity, repository,
  service, adapter, Registry implementation or wildcard/value export edge.
- All 44 Web/System consumer imports remain unchanged and pass type/build
  proof.
- Final fitness is `949 files / 3597 edges / 17 known / 0 new /
  0 unresolved`; the residual Commerce SCC is unchanged.
- Detailed evidence is in [verification-log.md](./verification-log.md).
