# 06D Entry Inventory — Root Compatibility Retirement

## Metadata

- Execution date: 2026-07-17
- Working-tree reference: shared Phase 3 worktree; source mutation is limited to `apps/backend/src/index.ts`.
- 06C final status: completed; the corrected `PartnerRequestFields` edge now targets `/contracts`, and the fresh census below has no safe contract type at the root.
- Executor/owner: 06D bounded execution (`/root/phase3_6_06d_execute`)
- Restoration patch path: [`restoration-patch.md`](./restoration-patch.md)
- External-consumer review: package is private and workspace/deployment metadata was inspected; no separate external consumer is represented in this repository. The retained `PRId` and `OrderingOfferDetail` windows remain owner-gated.

## Fresh root export and consumer census

The explicit declarations in `apps/backend/src/index.ts` were reviewed before
editing. Source, tests, scripts, package metadata and resolver aliases were
searched with the commands recorded in `exit-evidence.md`. The only root
imported symbols are the intentional transport/compatibility exceptions:

| Symbol | Root consumer count | Classification/action |
| --- | ---: | --- |
| `AppType` | 2 | Keep transport seam (`apps/web/src/lib/rpc.ts`, `apps/web/src/lib/admin-rpc.ts`). |
| `PRId` | 34 | Keep persistence-derived compatibility export; PR owner gate remains open. |
| `OrderingOfferDetail` | 1 | Keep Commerce persistence projection; Commerce owner gate remains open. |
| Every safe type in the approved removal set | 0 | Retire from root; each remains available through `@partner-up-dev/backend/contracts`. |

The package and resolver references to `@partner-up-dev/backend/contracts` are
entrypoint configuration, not root symbol consumers. No runtime root import,
inline root type query, or scenario/script root symbol edge was found.

Before mutation, the root declarations were grouped as follows (all entries
outside the approved set remain exactly as declared):

- Runtime server/transport: `app`, `routes`, `AppType`.
- Retained merchandising compatibility: `OrderingEntryPayload`, `OrderingOfferDetail`.
- Retained authoring/discovery compatibility: all `PRAuthoring*`, `PRTypeRouteApplicationView`, and all `PRDiscovery*` declarations.
- Retained feedback identifiers: `FeedbackQuestionnaireInstanceId`, `FeedbackQuestionnaireTemplateId`.
- Retained partner values/runtime schemas: `PartnerId`, `PartnerPaymentStatus`, `PartnerStatus`, `partnerIdSchema`, `partnerStatusSchema`.
- Retained PR persistence/runtime surface: `PRId`, `createNaturalLanguagePRSchema`, `createPRStructuredStatusSchema`, `createStructuredPRSchema`, `partnerRequestFieldsSchema`.
- Retained runtime constant and user surface: `PR_MESSAGE_BODY_MAX_LENGTH`, all `User*` types and `user*Schema` values.

## Approved removal set (frozen before mutation)

Only these already duplicated, type-only contract exports are removed:

- Feedback: `FeedbackQuestionnaireAnswers`, `FeedbackQuestionnaireDefinition`.
- Join gate: `PRJoinGateConfig`, `PRJoinGateConfigItem`, `PRJoinGateSource`, `PRJoinNoticeGateConfig`.
- PR value/input: `CoordinatePair`, `CreatePRStructuredStatus`, `PartnerRequestFields`, `PRAllowEditAfterReady`, `PRRoute`, `PRRoutePoint`, `PRStatus`, `PRStatusManual`, `PRTimeWindow`, `VisibilityStatus`, `WeekdayLabel`.
- Upload: `ImageUploadPurpose`.

All other existing root exports are retained, including unused authoring and
discovery types, `PRId`, `OrderingOfferDetail`, partner/user types, runtime
schemas and constants, `app`, `routes`, and `AppType`. No runtime export was
converted to a type-only edge or moved in this task.

## Entry gate disposition

- 06A types-only surface: complete and proven; `/contracts` contains explicit `export type` declarations only.
- 06C family migration/correction: complete; no unexplained safe root consumer remains.
- Consumer-zero proof: complete for all 18 approved symbols (named imports, inline type queries, runtime imports, tests, scenarios and scripts searched).
- Unknown external consumers: no in-repository external edge identified; compatibility windows remain for the two explicitly persistence-shaped exceptions rather than widening the removal set.
- Export-only restoration patch: prepared before source deletion; see [`restoration-patch.md`](./restoration-patch.md).
