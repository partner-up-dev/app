# 06B Feedback adapter sub-pilot — exit evidence

## Delivered

- `FeedbackQuestionnaireAnswers` and `FeedbackQuestionnaireDefinition` imports in Feedback model/UI/tests now use
  `@partner-up-dev/backend/contracts`.
- `useSubmitFeedbackQuestionnaire.ts` derives request, answers, and response aliases from the Hono route with
  `InferRequestType` / `InferResponseType`.
- The command keeps the domain-facing `instanceId: number` input and converts it to the route's string path
  parameter. HTTP payload, credentials, error handling, and response behavior are unchanged.
- No shared API wrapper, handwritten response DTO, Backend route/schema, or non-owned file was added.

## Verification

- Focused Feedback unit tests: **PASS** — 3 files, 6 tests.
- `pnpm check:type:web`: **PASS**.
- `pnpm check:build:web`: **PASS**.
- `git diff --check`: **PASS**.

## Scope status

Feedback sub-pilot complete. The separate PR Discovery sub-pilot completed without widening this Feedback scope;
broader consumer migration remains 06C work.
