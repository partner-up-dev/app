# 06C.2 entry inventory — PR Lifecycle value migration

Rebased 2026-07-17. The paths below are the exact lifecycle/identity consumer set. `PRId` rows are deliberately
compatibility-only and must remain root imports until 06D (or an explicitly approved later contract decision).

| Path | Safe symbols to move | Root-retained exception |
| --- | --- | --- |
| `apps/web/src/shared/telemetry/events.ts` | `PRStatus` | — |
| `apps/web/src/domains/pr/model/pr-display-status.ts` | `PRStatus` | — |
| `apps/web/src/domains/pr/ui/primitives/PRPreviewCard.route.test.ts` | `PRStatus` | `PRRoute` belongs to 06C.1 |
| `apps/web/src/domains/pr/ui/forms/PREditor.vue` | `PRStatus` | `PRId` |
| `apps/web/src/domains/pr/queries/usePRActions.ts` | `PRStatusManual` | `PRId` |
| `apps/web/src/domains/pr/use-cases/usePRCreatorActions.ts` | `PRStatusManual` | `PRId` |
| `apps/web/src/domains/pr/ui/forms/UpdatePRStatusForm.vue` | `PRStatusManual` | — |
| `apps/web/src/pages/PRPage.vue` | `PRStatusManual` | — |
| `apps/web/src/domains/pr/ui/forms/PRJoinGateConfigEditor.vue` | `PRJoinGateConfig`, `PRJoinGateConfigItem`, `PRJoinGateSource`, `PRJoinNoticeGateConfig` | — |
| `apps/web/src/domains/pr/ui/sections/PRCheckInFeedbackActions.vue` | `FeedbackQuestionnaireAnswers` | — |
| `apps/web/src/domains/pr/ui/sections/PRFeedbackQuestionnaireModal.vue` | `FeedbackQuestionnaireAnswers` | — |
| `apps/web/src/domains/pr/queries/usePRPublish.ts` | — | `PRId` |
| `apps/web/src/domains/pr/queries/usePRDetail.ts` | — | `PRId` |
| `apps/web/src/domains/pr/queries/usePRJoinGates.ts` | — | `PRId` |
| `apps/web/src/domains/pr/queries/usePRMessages.ts` | — | `PRId` |
| `apps/web/src/domains/pr/use-cases/usePRAttendanceActions.ts` | — | `PRId` |
| `apps/web/src/domains/pr/use-cases/usePRFeedbackQuestionnaireSubmission.ts` | — | `PRId` |
| `apps/web/src/domains/pr/use-cases/usePRReminderSubscription.ts` | — | `PRId` |
| `apps/web/src/domains/pr/use-cases/usePRRouteShareDescriptor.ts` | — | `PRId` |
| `apps/web/src/domains/pr/use-cases/usePRShareContext.ts` | — | `PRId` |
| `apps/web/src/domains/pr/use-cases/useSharedPRActions.ts` | — | `PRId` |
| `apps/web/src/domains/pr/model/pr-pairing-code.ts` | — | `PRId` |
| `apps/web/src/domains/pr/routing/routes.ts` | — | `PRId` |
| `apps/web/src/domains/pr/routing/usePRRouteId.ts` | — | `PRId` |
| `apps/web/src/domains/pr/ui/primitives/PRPreviewCard.vue` | — | `PRId` |
| `apps/web/src/domains/pr/ui/sections/PRJoinAction.vue` | — | `PRId` |
| `apps/web/src/domains/pr/ui/sections/PRShareSection.vue` | — | `PRId` |
| `apps/web/src/domains/pr/ui/sections/PRDraftPublishNotice.vue` | — | `PRId` |
| `apps/web/src/domains/pr/ui/sections/PRMessageThread.vue` | — | `PRId` |
| `apps/web/src/domains/pr/ui/composites/PRFactsCard.vue` | — | `PRId` |
| `apps/web/src/domains/pr/ui/composites/PRJoinGates.vue` | — | `PRId` |
| `apps/web/src/domains/pr/ui/composites/PRJoinSuccessPrompt.vue` | — | `PRId` |
| `apps/web/src/shared/api/query-keys.ts` | — | `PRId` |
| `apps/web/src/processes/route-handoff/useMatchedPRHandoff.ts` | — | `PRId` |
| `apps/web/src/pages/UserProfilePage.vue` | — | `PRId` |

The 06B PR contract module and query type facades are intentional dependencies. `AppType` in `lib/rpc` and
`lib/admin-rpc`, Admin PR management imports, Share imports, Commerce `OrderingOfferDetail`, and PR Discovery
authoring files are outside this family.

## Entry proof and residual ledger

- Current repository-wide root baseline is 74 declarations plus five inline edges; this family contains 12 safe
  declarations and 27 explicit `PRId` compatibility declarations (the latter are not a migration target). The
  remaining `PRId` declarations are the one mixed PR-create edge in 06C.1 and six Share edges in 06C.4.
- `PRRoute` in `PRPreviewCard.route.test.ts` is tracked by 06C.1 and must not be silently moved here.
- Any new root symbol or a removed facade is a fork/stop condition, not cleanup work.
