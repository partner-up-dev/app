# 06C.3 entry inventory — Feedback/Admin value migration

Rebased 2026-07-17. Freeze this exact set before mutation:

| Path | Root symbols to move | Notes |
| --- | --- | --- |
| `apps/web/src/domains/admin/queries/useAdminFeedbackQuestionnaires.ts` | `FeedbackQuestionnaireDefinition` | query adapter remains the HTTP owner |
| `apps/web/src/pages/AdminFeedbackQuestionnairesPage.vue` | `FeedbackQuestionnaireDefinition` | page consumes the Admin adapter contract |
| `apps/web/src/domains/admin/queries/useAdminPRManagement.ts` | `PRRoute as PartnerRequestRoute`, `PRJoinGateConfig` | retain local alias name; no response DTO copy |
| `apps/web/src/domains/admin/use-cases/pr/prMutationInput.ts` | `PRJoinGateConfig`, `PRRoute` | use-case input only; preserve route conversion |
| `apps/web/src/domains/admin/ui/pr/views/AdminPRBasicView.vue` | `PRJoinGateConfig`, `PRRoute` | UI value/config types only |

The root `AppType` imports in `apps/web/src/lib/rpc.ts` and `apps/web/src/lib/admin-rpc.ts` are transport-owned and
out of scope. PR lifecycle feedback answers, PR Discovery route/authoring values, Share/Upload values, and Commerce
`OrderingOfferDetail` belong to their own packets.

## Entry proof

Baseline is five root declarations across five files; all listed symbols are exported by
`@partner-up-dev/backend/contracts`. A residual root import after the batch is unexplained and stops the family.
