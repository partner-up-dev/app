# Slice 3-3 Entry Delta

## Authorization And Working Tree

- Sir authorized `3-3` execution on 2026-07-17 at HEAD `b674f5ca`.
- `3-2` is verified Complete but its exit commit is still pending. Its dirty application paths are limited to PR
  Discovery; `3-3` owns Feedback/PR feedback integration and the focused System journey, so the scopes do not
  overlap.
- Root package/lock/workspace changes and unrelated task directories remain protected and outside this slice.

## Current Topology

- Backend already follows controller → feedback use-case → validation service → repository, with a unique
  `(instanceId, respondentUserId)` upsert. No Backend production refactor or migration is indicated.
- Backend unit validation and scenario upsert baselines pass: 1 file/4 tests and 1 file/9 tests.
- Web generic mutation currently accepts PR context (`prId`) and owns PR cache invalidation; its error reader ignores
  Problem Details `detail`.
- PR UI calls the generic mutation directly. Failure keeps the modal/form instance alive but exposes no error, while
  success invalidation is not owned by a PR workflow.
- Existing System proof stops after opening the questionnaire; it does not submit, observe canonical `SUBMITTED`
  state or probe Postgres.

## Chosen Minimal Delta

1. Characterize missing/invalid/anonymous Backend submission without changing Backend production code.
2. Narrow the Feedback command to `instanceId + answers` and shared Problem Details parsing.
3. Add a PR-owned submission workflow for invalidation and error state.
4. Keep answers component-local; surface retryable error in the controlled modal.
5. Extend the existing check-in System journey through real POST, canonical refetch and DB probe.

## Stop Conditions

- Any schema/API/product contract change, participant eligibility change, OAuth answer replay, upload cleanup policy
  or new cross-domain public surface stops this slice.
