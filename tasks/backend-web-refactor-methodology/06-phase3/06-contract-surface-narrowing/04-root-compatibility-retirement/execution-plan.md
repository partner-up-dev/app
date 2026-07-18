# 06D — Root Compatibility Retirement Execution Plan

## Boundary and authority

06D retires only Backend root compatibility exports that are no longer needed by
known repository consumers. The transport-owned `AppType` seam remains at the
root. This packet is a design for a later execution; it does not claim that
retirement has happened.

Owned files during execution are `apps/backend/src/index.ts` and the minimum
package export metadata needed to preserve the proven `@partner-up-dev/backend`
and `@partner-up-dev/backend/contracts` entrypoints. Runtime routes, schemas,
controllers, persistence models, DTOs, and API behavior are not in scope.

The 06C scan is a rebased planning observation only. Its transient consumer
counts must be refreshed after 06C.3/06C.4 and must not be copied into the exit
claim.

## Entry gates

Before editing, the executor must attach evidence for all of the following:

1. 06C has completed every authorized family, including the final Share/
   Commerce/upload decision. No unexplained root consumer is carried forward.
2. `@partner-up-dev/backend/contracts` resolves as a type-only subpath in
   Backend, Web, and System resolver configurations.
3. A fresh repository census covers source, tests, scenario harnesses, scripts,
   package metadata, and resolver aliases. It distinguishes type-only imports,
   inline type queries, and runtime imports.
4. Every symbol selected for removal has zero known in-repository consumers.
   A repository search is not evidence that external consumers do not exist.
5. A small export-only restoration patch is prepared before the first removal.

If any gate is false, keep the export and record the fork; do not begin a
partial “cleanup”.

## Root export classification

The executor first snapshots the explicit export list in `apps/backend/src/index.ts`
and then applies the following deterministic method to **each** symbol:

1. Resolve the symbol's owner and export kind (transport type, stable value type,
   persistence-derived type, runtime schema/constant, or server runtime value).
2. Search all in-repository import forms: named imports, aliased imports,
   namespace access, `import type`, inline `import("...").Symbol`, and resolver
   or package metadata references. Use AST results for TypeScript and `rg` for
   Vue/SFC and configuration text; inspect every match manually.
3. Label each match `type-only`, `runtime`, `test/scenario`, `transport`, or
   `unclassified`. A type-only static graph edge must not be treated as a
   runtime edge, and a runtime edge must not be “fixed” with a cast.
4. Apply the default disposition below. Override it only with an owner, a
   named consumer list, and a review/removal trigger.

| Root symbol(s) | Default classification | Required proof or action |
| --- | --- | --- |
| `app` | Keep (server runtime entry) | Backend scenario harness imports it from `src/index`; never retire as a type-surface change. |
| `routes` | Keep (route composition/runtime type source) | Retain unless a separately authorized server-entry refactor proves no internal use; not a compatibility deletion target. |
| `AppType` | Keep (transport exception) | The only raw root imports allowed at exit are the Web RPC constructors in `src/lib/rpc.ts` and `src/lib/admin-rpc.ts` (plus explicitly reviewed transport adapters). |
| `OrderingEntryPayload` | Retire candidate | Retire after zero root consumers and no owner-approved external dependency; otherwise retain a thin type-only alias and record the trigger. |
| `OrderingOfferDetail` | Compatibility exception / retain | Persistence-shaped Commerce projection. Keep at root until Commerce owns a stable projection and its consumers migrate; do not add it to `contracts`. |
| `PRAuthoringDefaultSelection` | Retire candidate | Prove no root consumers; move any remaining consumer to its owner contract in a separately scoped batch. |
| `PRAuthoringLocationOption` | Retire candidate | Same zero-consumer and owner proof. |
| `PRAuthoringMapCoordinate` | Retire candidate | Same zero-consumer and owner proof. |
| `PRAuthoringOptions` | Retire candidate | Same zero-consumer and owner proof. |
| `PRAuthoringPlaceDisabledReason` | Retire candidate | Same zero-consumer and owner proof. |
| `PRAuthoringRouteOption` | Retire candidate | Same zero-consumer and owner proof. |
| `PRAuthoringStartOption` | Retire candidate | Same zero-consumer and owner proof. |
| `PRTypeRouteApplicationView` | Retire candidate | Same zero-consumer and owner proof. |
| `PRDiscoveryCandidate` | Retire candidate | Discovery UI/model must use its domain contract or inferred alias; do not widen `contracts` merely to preserve a broad barrel. |
| `PRDiscoveryCardGroup` | Retire candidate | Same proof; preserve any intentional UI view model locally. |
| `PRDiscoveryCatalogItem` | Retire candidate | Same proof. |
| `PRDiscoveryConfigRow` | Retire candidate | Treat persistence/config rows as non-contract; fork if a runtime or row consumer remains. |
| `PRDiscoveryDirectoryResponse` | Retire candidate | Same proof; response aliases belong to the domain adapter. |
| `PRDiscoveryPlaceSelection` | Retire candidate | Same proof. |
| `PRDiscoveryRecommendationCandidate` | Retire candidate | Same proof. |
| `PRDiscoveryRecommendationMatch` | Retire candidate | Same proof. |
| `PRDiscoveryRecommendationResponse` | Retire candidate | Same proof. |
| `PRDiscoveryTypeDetail` | Retire candidate | Same proof. |
| `PRDiscoveryViewMode` | Retire candidate | Same proof; retain only if an owner documents it as a stable cross-unit value. |
| `PRDiscoveryViewRatios` | Retire candidate | Same proof. |
| `FeedbackQuestionnaireAnswers` | Retire candidate | The type-only `contracts` path is the target; zero root consumers required. |
| `FeedbackQuestionnaireDefinition` | Retire candidate | Same proof. |
| `FeedbackQuestionnaireInstanceId` | Retire candidate | Same proof; if persistence-derived, keep private and fork owner design. |
| `FeedbackQuestionnaireTemplateId` | Retire candidate | Same proof; if persistence-derived, keep private and fork owner design. |
| `PRJoinGateConfig` | Retire candidate | Use `@partner-up-dev/backend/contracts`; zero root consumers required. |
| `PRJoinGateConfigItem` | Retire candidate | Same proof. |
| `PRJoinGateSource` | Retire candidate | Same proof. |
| `PRJoinNoticeGateConfig` | Retire candidate | Same proof. |
| `PartnerId` | Retire candidate / owner review | Do not assume a branded persistence id is a stable contract; retain or fork if an owner cannot prove independence. |
| `PartnerPaymentStatus` | Retire candidate | Prove no root consumers and no runtime coupling. |
| `PartnerStatus` | Retire candidate | Same proof. |
| `partnerIdSchema` | Runtime exception / retain or fork | Any runtime consumer stops 06D; move it in an explicitly scoped runtime batch or retain. |
| `partnerStatusSchema` | Runtime exception / retain or fork | Same rule; never convert a runtime import into a type-only import as a compatibility shortcut. |
| `CoordinatePair` | Retire candidate | Stable counterpart is already in `contracts`; zero root consumers required. |
| `CreatePRStructuredStatus` | Retire candidate | Same proof. |
| `PartnerRequestFields` | Retire candidate | Use `contracts`; preserve runtime schema privately. |
| `PRAllowEditAfterReady` | Retire candidate | Same proof. |
| `PRId` | Compatibility exception / retain | Persistence-derived identifier. Keep root until the PR owner declares an independent contract and all consumers migrate. |
| `PRRoute` | Retire candidate | Use `contracts`; no duplicate DTO or route behavior change. |
| `PRRoutePoint` | Retire candidate | Same proof. |
| `PRStatus` | Retire candidate | Same proof. |
| `PRStatusManual` | Retire candidate | Same proof. |
| `PRTimeWindow` | Retire candidate | Same proof. |
| `VisibilityStatus` | Retire candidate | Same proof. |
| `WeekdayLabel` | Retire candidate | Same proof. |
| `createNaturalLanguagePRSchema` | Runtime exception / retain or fork | Schema consumers require a runtime migration packet; 06D must not remove it. |
| `createPRStructuredStatusSchema` | Runtime exception / retain or fork | Same rule. |
| `createStructuredPRSchema` | Runtime exception / retain or fork | Same rule. |
| `partnerRequestFieldsSchema` | Runtime exception / retain or fork | Same rule. |
| `PR_MESSAGE_BODY_MAX_LENGTH` | Runtime constant exception / retain or fork | Treat as runtime behavior/config, not a type-only export. |
| `UserId` | Retire candidate / owner review | Prove no root consumers and an owner-backed non-persistence contract. |
| `UserRole` | Retire candidate | Same proof. |
| `UserSex` | Retire candidate | Same proof. |
| `UserStatus` | Retire candidate | Same proof. |
| `userIdSchema` | Runtime exception / retain or fork | Any consumer stops retirement for this symbol. |
| `userRoleSchema` | Runtime exception / retain or fork | Same rule. |
| `userRolesSchema` | Runtime exception / retain or fork | Same rule. |
| `userSexSchema` | Runtime exception / retain or fork | Same rule. |
| `userStatusSchema` | Runtime exception / retain or fork | Same rule. |
| `ImageUploadPurpose` | Retire candidate | Use `@partner-up-dev/backend/contracts`; retain only with explicit unknown-consumer evidence. |

“Retire candidate” is not permission to delete. It becomes `retire` only when
the inventory records consumer-zero, owner proof, and the external-consumer
decision.

## Unknown external consumers

The package is private, but that does not prove that no other workspace,
deployment source, generated fixture, or unpublished consumer imports the root.
For a symbol with no known repository consumer but an unresolved external
possibility:

- do not claim retirement;
- retain a thin `export type` compatibility alias (or the existing runtime
  export when runtime semantics are involved);
- record the suspected consumer, owner, review date/trigger, and the exact
  command that should be rerun;
- require an owner decision before deleting the alias in a later packet.

An unknown consumer is a compatibility-window state, not a zero count.

## Execution sequence (low-cost first)

The following sequence is intentionally ordered so a cheap structural failure
stops before any source mutation:

```sh
# 0. Read-only preflight and clean-scope check
git status --short
sed -n '1,360p' apps/backend/src/index.ts
cat apps/backend/package.json

# 1. Enumerate root imports (AST for TS/TSX; rg catches Vue/SFC/config text)
ast-grep run --lang ts --pattern 'import type { $$$NAMES } from "@partner-up-dev/backend"' apps tests scripts
ast-grep run --lang ts --pattern 'import { $$$NAMES } from "@partner-up-dev/backend"' apps tests scripts
ast-grep run --lang ts --pattern 'import("@partner-up-dev/backend").$SYMBOL' apps tests scripts
rg -n --glob '!tasks/**' --glob '!node_modules/**' --glob '!dist/**' \
  '@partner-up-dev/backend(["/])|from ["'"']@partner-up-dev/backend|import\(["'"']@partner-up-dev/backend' \
  apps tests scripts package.json pnpm-workspace.yaml

# 2. Enumerate every explicit root export and compare with the import census
rg -n '^(export (type )?\{|export (type )?\w|export \{)' apps/backend/src/index.ts

# 3. Validate the types-only boundary before deletion
pnpm check:type:backend
pnpm check:type:web
pnpm check:build:backend
pnpm check:build:web
```

At this point fill `entry-inventory-template.md`; do not use the pre-06C
observed count as the baseline. Freeze the exact removal set and prepare the
export-only restoration patch. Then, and only then, remove the approved root
type exports and run the focused census again:

```sh
# 4. Post-edit cheap proof (must be zero for every retired symbol)
ast-grep run --lang ts --pattern 'import type { $$$NAMES } from "@partner-up-dev/backend"' apps tests scripts
ast-grep run --lang ts --pattern 'import { $$$NAMES } from "@partner-up-dev/backend"' apps tests scripts
ast-grep run --lang ts --pattern 'import("@partner-up-dev/backend").$SYMBOL' apps tests scripts
rg -n --glob '!tasks/**' --glob '!node_modules/**' --glob '!dist/**' \
  'from ["'"']@partner-up-dev/backend["'"']|import\(["'"']@partner-up-dev/backend["'"']\)' apps tests scripts

# 5. Required exit gates
pnpm check:type:backend
pnpm check:type:web
pnpm check:build:backend
pnpm check:build:web
pnpm test:scenario:all
```

Typecheck timing is informational. Full System is the cross-unit exit gate;
its failure is not repaired with assertions or DTO copies.

## Stop conditions

Stop and restore the export-only patch when any of the following occurs:

- a retired symbol has any unresolved in-repository consumer, including a
  runtime schema/constant import;
- an external or unclassified consumer cannot be ruled out and no owner has
  approved a compatibility window;
- removal changes emitted runtime code, server bundle reachability, Hono
  inference, or route type output;
- a remaining import is `AppType`, `PRId`, or `OrderingOfferDetail` and the
  attempted change would alter its documented exception;
- verification reveals an HTTP behavior, route output, product semantic, or
  CF-01/CF-02 change.

## Minimal restoration path

Restore only the deleted root export declarations in `apps/backend/src/index.ts`
and, if touched, the corresponding package `exports` metadata. Do not restore
or roll back schemas, migrations, database data, controllers, routes, Web
runtime code, or generated output. Re-run the four type/build checks, then
record the failed proof and return to package-boundary or owner-contract
analysis. The restoration must be a small, reviewable patch that leaves
runtime behavior unchanged.

## Stale Web guidance to correct during execution

`apps/web/src/AGENTS.components.md` currently says:

> Import backend-owned types from `@partner-up-dev/backend`; do not redeclare API return or entity shapes in components.

That sentence is stale once 06D retires root compatibility. The execution
packet must update the local guidance (in its owning change, not in this
planning-only write scope) to the following precise rule:

> Import stable Backend value/input types from `@partner-up-dev/backend/contracts` with `import type`. Reserve the root package for `AppType` in transport adapters (`src/lib/rpc.ts`, `src/lib/admin-rpc.ts`) and for explicitly recorded compatibility exceptions such as `PRId` and `OrderingOfferDetail` until their owner gates clear. Never import runtime schemas or constants into components through the root compatibility surface.

The correction must land together with the execution evidence, and its wording
must not imply that `AppType` or the two named exceptions are retired.

## Exit record

Complete the inventory template with the removal set, retained exceptions,
unknown-consumer windows, command output references, restoration patch path,
and architecture-fitness delta. Mark the packet as executed only after the
full System gate passes; until then its status remains planned/blocked at the
relevant fork.
