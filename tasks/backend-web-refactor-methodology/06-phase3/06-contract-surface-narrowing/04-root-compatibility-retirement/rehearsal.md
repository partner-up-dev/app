# 06D — Root Compatibility Retirement Rehearsal

This rehearsal models the later execution. It is not evidence that any root
export has already been removed.

## Normal sequence

```text
06C family exit
    |
    v
freeze root export + consumer inventory
    |
    +-- unresolved consumer? -- yes --> retain/fork, stop
    |
    v
classify type-only vs runtime and transport exceptions
    |
    +-- AppType / PRId / OrderingOfferDetail? --> retain with owner gate
    +-- runtime schema/constant? -------------> retain or runtime fork
    +-- unknown external consumer? -----------> thin compatibility window
    |
    v
remove only proven zero-consumer type exports
    |
    v
type/build probes -> full System
    |
    +-- any reachability/inference/API delta? -> restore exports only
    +-- all pass ------------------------------> record exit evidence
```

## Scenario matrix

| Scenario | Expected decision | Cheapest proof | Stop/forward path |
| --- | --- | --- | --- |
| `AppType` remains in `lib/rpc.ts` or `lib/admin-rpc.ts` | Keep root export | AST import classification plus Web type/build | Do not move it to `contracts`; transport ownership is intentional. |
| `PRId` remains in PR/share/query code | Keep compatibility export | Focused symbol census; verify it is `import type` | Return to PR owner contract design; do not manufacture a new ID DTO in 06D. |
| `OrderingOfferDetail` remains in Commerce | Keep compatibility export | Focused Commerce census and typecheck | Fork to Commerce projection contract; do not widen `contracts`. |
| Runtime schema/constant has a consumer | Retain symbol | AST/runtime import check and emitted-code review | Start a separately authorized runtime batch or leave the export. |
| Root type has zero repository consumers | Candidate for retirement | Fresh census plus explicit export-list review | Resolve unknown external-consumer question before deleting. |
| No repository consumer, but another workspace/deployment may consume package | Keep thin compatibility alias | Package/workspace/deployment search and owner sign-off | Record trigger; later packet removes alias only with stronger evidence. |
| `import type` removal changes server bundle or Hono inference | Restore export | Backend build and inferred `AppType` checks | Return to package-boundary analysis; do not alter routes. |
| A Web component still follows stale root-import guidance | Correct guidance in owning execution change | Review `src/AGENTS.components.md` diff | This planning packet cannot edit that file; do not silently leave contradictory instructions. |
| Full System fails after type-only deletion | Restore export-only patch first | `pnpm test:scenario:all` failure plus route/type diff | Diagnose contract/runtime owner; no assertion, DTO, or behavior workaround. |

## Root export decision rehearsal

For each row in the inventory template, ask in order:

1. Is this `app`, `routes`, or `AppType`? Keep it as server/transport
   infrastructure.
2. Is it `PRId` or `OrderingOfferDetail`? Keep it as a named compatibility
   exception until its owner gate is explicit.
3. Is it a runtime schema or constant? Any consumer means retain or fork; a
   type-only retirement cannot remove runtime semantics.
4. Is it a type-only value/contract with an owner-backed `contracts` alias?
   Require zero root consumers and remove only the root declaration.
5. Is its owner or consumer classification uncertain? Mark `unknown`, retain
   a thin compatibility export, and record the review trigger.

This ordering prevents a broad `rg` zero from hiding an inline type edge,
runtime import, package alias, or persistence-shaped exception.

## External-consumer rehearsal

“No match under `apps/`, `tests/`, and `scripts/`” is only an in-repository
claim. Before deleting a symbol, inspect workspace package manifests, generated
resolver maps, deployment source bundles, and any documented integration
surface. If that search cannot establish ownership, the safe outcome is:

- leave the root export in place;
- add a compatibility-window row with owner and review trigger;
- do not call the symbol retired or count it as exit zero.

The repository's `private: true` package flag lowers publication risk but is not
proof against linked workspaces or source-level consumers.

## Minimal rollback rehearsal

Assume the first post-edit build reports a changed inferred route type. Apply
the prewritten export-only restoration patch, rerun Backend/Web type and build,
then stop before touching route/controller/runtime files. If the failure clears,
the deletion was premature; if it does not, fork to the owning package or
contract boundary. No database, migration, or API rollback is part of 06D.

## Guidance correction rehearsal

At execution time, update the stale component guidance from a root-wide import
rule to the contracts-subpath rule documented in `execution-plan.md`. Verify
that the corrected wording preserves the `AppType`, `PRId`, and
`OrderingOfferDetail` exceptions and bans runtime schema/constant imports into
components. This packet only records the required correction because its
current write boundary excludes `apps/web/src/AGENTS.components.md`.
