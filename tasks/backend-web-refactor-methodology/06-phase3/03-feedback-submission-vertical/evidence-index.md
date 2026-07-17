# Slice 3-3 Evidence Index

| ID | Kind | Claim | Evidence | Confidence |
| --- | --- | --- | --- | --- |
| P3-S03-001 | Source/test | Backend rejects anonymous, missing-instance and invalid-answer submissions before persistence while preserving authenticated upsert | feedback validation unit; feedback Backend scenario; response-row probe | High |
| P3-S03-002 | Source/test | Generic Feedback owns `{ instanceId, answers }`, Problem Details mapping and conditional form validation; it does not know `prId` | `domains/feedback/commands`, `domains/feedback/model`, form units | High |
| P3-S03-003 | Source/test | PR integration owns submitted-PR identity, canonical detail invalidation, visible retryable failure and submitted state | `usePRFeedbackQuestionnaireSubmission`; PR section/modal units | High |
| P3-S03-004 | Scenario | A real browser submission sends no `prId`, refreshes canonical PR detail to `SUBMITTED`, and creates exactly one matching Postgres row | `tests/scenario/pr-core/pr-detail-participation.scenario.test.ts`; targeted and full System gates | High |
| P3-S03-005 | Verification | Full Web/Backend units, focused Backend scenario, static/build gates, full System and fitness check pass | `verification-log.md` | High |

Commands ran from the repository root. Focused source probes excluded dependencies, generated output and task
workspaces unless explicitly named. No source claim relies only on the task plan.
