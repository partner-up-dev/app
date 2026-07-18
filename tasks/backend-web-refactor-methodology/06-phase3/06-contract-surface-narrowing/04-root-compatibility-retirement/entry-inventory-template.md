# 06D Entry Inventory Template — Root Compatibility Retirement

Copy this template into the execution evidence before editing. Blank counts
are intentional: the 06C.3 transient scan is not an exit baseline.

## Metadata

- Execution date:
- Commit/working-tree reference:
- 06C final family status/evidence:
- Executor/owner:
- Restoration patch path (export-only):
- External-consumer review owner:
- External-consumer review trigger/date:

## Classification legend

- `keep-transport`: `AppType` and transport infrastructure; root remains.
- `keep-compat`: named compatibility window (`PRId`, `OrderingOfferDetail`,
  or an approved unknown external consumer).
- `retire`: type-only root export with zero known consumers, owner proof, and
  external review complete.
- `runtime-exception`: schema/constant/value with runtime semantics; retain or
  fork to a separately authorized runtime batch.
- `unknown`: evidence is incomplete; retain and record the missing proof.

Counts are evidence fields, not promises. A count of zero is valid only for
the exact symbol and import forms listed below and only at final execution.

## Root export inventory

| Symbol | Kind/owner | Default class | Root declarations (fresh) | Inline type edges | Runtime edges | Test/scenario edges | External evidence | Final class/action | Owner + trigger |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| `app` | server runtime | keep-transport |  |  |  |  |  |  |  |
| `routes` | route composition | keep-transport |  |  |  |  |  |  |  |
| `AppType` | Hono transport type | keep-transport |  |  |  |  |  |  |  |
| `OrderingEntryPayload` | merchandising type | retire candidate |  |  |  |  |  |  |  |
| `OrderingOfferDetail` | Commerce persistence projection | keep-compat |  |  |  |  |  |  | Commerce owner gate |
| `PRAuthoringDefaultSelection` | PR authoring type | retire candidate |  |  |  |  |  |  |  |
| `PRAuthoringLocationOption` | PR authoring type | retire candidate |  |  |  |  |  |  |  |
| `PRAuthoringMapCoordinate` | PR authoring type | retire candidate |  |  |  |  |  |  |  |
| `PRAuthoringOptions` | PR authoring type | retire candidate |  |  |  |  |  |  |  |
| `PRAuthoringPlaceDisabledReason` | PR authoring type | retire candidate |  |  |  |  |  |  |  |
| `PRAuthoringRouteOption` | PR authoring type | retire candidate |  |  |  |  |  |  |  |
| `PRAuthoringStartOption` | PR authoring type | retire candidate |  |  |  |  |  |  |  |
| `PRTypeRouteApplicationView` | PR authoring type | retire candidate |  |  |  |  |  |  |  |
| `PRDiscoveryCandidate` | PR discovery type | retire candidate |  |  |  |  |  |  |  |
| `PRDiscoveryCardGroup` | PR discovery type | retire candidate |  |  |  |  |  |  |  |
| `PRDiscoveryCatalogItem` | PR discovery type | retire candidate |  |  |  |  |  |  |  |
| `PRDiscoveryConfigRow` | config/persistence-shaped type | retire candidate |  |  |  |  |  |  |  |
| `PRDiscoveryDirectoryResponse` | PR discovery response type | retire candidate |  |  |  |  |  |  |  |
| `PRDiscoveryPlaceSelection` | PR discovery type | retire candidate |  |  |  |  |  |  |  |
| `PRDiscoveryRecommendationCandidate` | PR discovery type | retire candidate |  |  |  |  |  |  |  |
| `PRDiscoveryRecommendationMatch` | PR discovery type | retire candidate |  |  |  |  |  |  |  |
| `PRDiscoveryRecommendationResponse` | PR discovery response type | retire candidate |  |  |  |  |  |  |  |
| `PRDiscoveryTypeDetail` | PR discovery type | retire candidate |  |  |  |  |  |  |  |
| `PRDiscoveryViewMode` | PR discovery value | retire candidate |  |  |  |  |  |  |  |
| `PRDiscoveryViewRatios` | PR discovery value | retire candidate |  |  |  |  |  |  |  |
| `FeedbackQuestionnaireAnswers` | Feedback contract | retire candidate |  |  |  |  |  |  |  |
| `FeedbackQuestionnaireDefinition` | Feedback contract | retire candidate |  |  |  |  |  |  |  |
| `FeedbackQuestionnaireInstanceId` | Feedback identifier | retire candidate |  |  |  |  |  |  |  |
| `FeedbackQuestionnaireTemplateId` | Feedback identifier | retire candidate |  |  |  |  |  |  |  |
| `PRJoinGateConfig` | join-gate contract | retire candidate |  |  |  |  |  |  |  |
| `PRJoinGateConfigItem` | join-gate contract | retire candidate |  |  |  |  |  |  |  |
| `PRJoinGateSource` | join-gate contract | retire candidate |  |  |  |  |  |  |  |
| `PRJoinNoticeGateConfig` | join-gate contract | retire candidate |  |  |  |  |  |  |  |
| `PartnerId` | Partner identifier | retire candidate/owner review |  |  |  |  |  |  |  |
| `PartnerPaymentStatus` | Partner value | retire candidate |  |  |  |  |  |  |  |
| `PartnerStatus` | Partner value | retire candidate |  |  |  |  |  |  |  |
| `partnerIdSchema` | runtime schema | runtime-exception |  |  |  |  |  |  |  |
| `partnerStatusSchema` | runtime schema | runtime-exception |  |  |  |  |  |  |  |
| `CoordinatePair` | PR value contract | retire candidate |  |  |  |  |  |  |  |
| `CreatePRStructuredStatus` | PR value contract | retire candidate |  |  |  |  |  |  |  |
| `PartnerRequestFields` | PR value contract | retire candidate |  |  |  |  |  |  |  |
| `PRAllowEditAfterReady` | PR value contract | retire candidate |  |  |  |  |  |  |  |
| `PRId` | persistence-derived identifier | keep-compat |  |  |  |  |  |  | PR owner gate |
| `PRRoute` | PR value contract | retire candidate |  |  |  |  |  |  |  |
| `PRRoutePoint` | PR value contract | retire candidate |  |  |  |  |  |  |  |
| `PRStatus` | PR value contract | retire candidate |  |  |  |  |  |  |  |
| `PRStatusManual` | PR value contract | retire candidate |  |  |  |  |  |  |  |
| `PRTimeWindow` | PR value contract | retire candidate |  |  |  |  |  |  |  |
| `VisibilityStatus` | PR value contract | retire candidate |  |  |  |  |  |  |  |
| `WeekdayLabel` | PR value contract | retire candidate |  |  |  |  |  |  |  |
| `createNaturalLanguagePRSchema` | runtime schema | runtime-exception |  |  |  |  |  |  |  |
| `createPRStructuredStatusSchema` | runtime schema | runtime-exception |  |  |  |  |  |  |  |
| `createStructuredPRSchema` | runtime schema | runtime-exception |  |  |  |  |  |  |  |
| `partnerRequestFieldsSchema` | runtime schema | runtime-exception |  |  |  |  |  |  |  |
| `PR_MESSAGE_BODY_MAX_LENGTH` | runtime constant | runtime-exception |  |  |  |  |  |  |  |
| `UserId` | User identifier | retire candidate/owner review |  |  |  |  |  |  |  |
| `UserRole` | User value | retire candidate |  |  |  |  |  |  |  |
| `UserSex` | User value | retire candidate |  |  |  |  |  |  |  |
| `UserStatus` | User value | retire candidate |  |  |  |  |  |  |  |
| `userIdSchema` | runtime schema | runtime-exception |  |  |  |  |  |  |  |
| `userRoleSchema` | runtime schema | runtime-exception |  |  |  |  |  |  |  |
| `userRolesSchema` | runtime schema | runtime-exception |  |  |  |  |  |  |  |
| `userSexSchema` | runtime schema | runtime-exception |  |  |  |  |  |  |  |
| `userStatusSchema` | runtime schema | runtime-exception |  |  |  |  |  |  |  |
| `ImageUploadPurpose` | upload value contract | retire candidate |  |  |  |  |  |  |  |

## Required census commands

Run from the repository root after 06C is final. Preserve command output in
task-local evidence; do not count comments, docs, or this packet as consumers.

```sh
ast-grep run --lang ts --pattern 'import type { $$$NAMES } from "@partner-up-dev/backend"' apps tests scripts
ast-grep run --lang ts --pattern 'import { $$$NAMES } from "@partner-up-dev/backend"' apps tests scripts
ast-grep run --lang ts --pattern 'import("@partner-up-dev/backend").$SYMBOL' apps tests scripts
rg -n --glob '!tasks/**' --glob '!node_modules/**' --glob '!dist/**' \
  'from ["'"']@partner-up-dev/backend["'"']|import\(["'"']@partner-up-dev/backend["'"']\)' \
  apps tests scripts
rg -n '^(export (type )?\{|export (type )?\w|export \{)' apps/backend/src/index.ts
```

For Vue SFCs, inspect `rg` matches manually because the AST probe is run over
TypeScript files. Add package manifests, tsconfig/vitest aliases, deployment
source lists, and scenario harness imports to the external-evidence column.

## Exit evidence checklist

- [ ] Every `retire` row has zero root declarations in every import form.
- [ ] `AppType`, `PRId`, and `OrderingOfferDetail` rows show their retained
      owner gates and are excluded from the removal set.
- [ ] Every runtime-exception row is retained or has a separately authorized
      runtime packet; none was removed as type-only cleanup.
- [ ] Unknown external consumers have a compatibility-window owner and trigger.
- [ ] `contracts` remains explicit `export type` only; no wildcard or runtime
      entry was added.
- [ ] `apps/web/src/AGENTS.components.md` guidance correction is applied by its
      owning execution change and reviewed against the exact text in the plan.
- [ ] `pnpm check:type:backend`
- [ ] `pnpm check:type:web`
- [ ] `pnpm check:build:backend`
- [ ] `pnpm check:build:web`
- [ ] `pnpm test:scenario:all`
- [ ] Architecture-fitness delta and restoration patch location recorded.

## Removal set and restoration record

- Approved root symbols to remove:
- Symbols retained as transport/compatibility/runtime exceptions:
- Unknown windows retained:
- Export-only restoration patch (file/hash or diff reference):
- First failing command, if any:
- Follow-up owner packet, if forked:
