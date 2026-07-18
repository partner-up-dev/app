# 06C.2 rehearsal — PR Lifecycle value migration

1. Re-run the path/symbol inventory and record the `PRId` compatibility count before editing.
2. Switch only `PRStatus`, `PRStatusManual`, join-gate types and `FeedbackQuestionnaireAnswers` to
   `@partner-up-dev/backend/contracts`.
3. Leave every `PRId` root import unchanged. Do not remove or relocate query-owned type facades from 06B.
4. Verify safe-symbol root count reaches zero for this family while the `PRId` count is unchanged; verify no model/UI
   file gains a client/query transport edge.
5. Run focused PR status, join-gate, feedback and preview tests, then `pnpm check:type:web`,
   `pnpm check:build:web`, and `git diff --check`.

Stop if an alias move affects status/join eligibility, response data, OAuth/pending actions, or causes a request-time
import. Roll back only this family's type-specifier edits.
