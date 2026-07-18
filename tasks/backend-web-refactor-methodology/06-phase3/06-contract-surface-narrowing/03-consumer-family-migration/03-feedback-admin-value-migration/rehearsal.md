# 06C.3 rehearsal — Feedback/Admin value migration

1. Re-run the five-file inventory and verify each target symbol resolves from `@partner-up-dev/backend/contracts`.
2. Change only type-only import specifiers; preserve `PartnerRequestRoute` local naming and all query/client calls.
3. Probe that the root count for `FeedbackQuestionnaireDefinition`, `PRRoute` and `PRJoinGateConfig` is zero in the
   owned files while `AppType` remains in the two transport files.
4. Run focused Admin feedback and Admin PR unit tests, `pnpm check:type:web`, `pnpm check:build:web`, and
   `git diff --check`.

Stop on unstable composite contracts, route behavior changes, runtime imports, or a request to remove a 06B facade.
