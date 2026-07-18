# 06B Entry Inventory — Feedback adapter pilot

## Rebased 2026-07-17

The selected pilot is the Web Feedback questionnaire submission family. Its owned files are:

- `apps/web/src/domains/feedback/commands/useSubmitFeedbackQuestionnaire.ts`
- `apps/web/src/domains/feedback/model/validate-feedback-questionnaire-draft.ts`
- `apps/web/src/domains/feedback/model/validate-feedback-questionnaire-draft.test.ts`
- `apps/web/src/domains/feedback/ui/FeedbackQuestionnaireForm.vue`
- `apps/web/src/domains/feedback/ui/FeedbackQuestionnaireForm.test.ts`
- `apps/web/src/domains/feedback/commands/useSubmitFeedbackQuestionnaire.test.ts`

## Current boundary

Before this pilot, the Feedback model/UI/test files imported the stable
`FeedbackQuestionnaireAnswers` and `FeedbackQuestionnaireDefinition` value types from the Backend root
compatibility entry. The submit command also declared its `answers` input from that root type and returned an
un-named `response.json()` value.

The Hono route is `client.api.feedback[":instanceId"].$post`, backed by
`apps/backend/src/controllers/feedback-questionnaire.controller.ts`. The HTTP adapter owns the client call and
error handling; the model and UI consume only domain/value types.

## Pilot target and non-goals

- Derive request JSON, answers, and success response aliases with `InferRequestType` / `InferResponseType` in the
  submit command adapter.
- Keep the deliberate `instanceId: number` domain input and convert it to the route's string path parameter at the
  HTTP boundary.
- Resolve stable Feedback value types through `@partner-up-dev/backend/contracts`.
- Do not change the route, schema, response JSON, behavior, or introduce a shared API wrapper/DTO.

## Dependency direction proof

`FeedbackQuestionnaireForm` → `validate-feedback-questionnaire-draft` and submit use-case/command types; the submit
command → `lib/rpc` → Hono `AppType`. Raw client mechanics remain in the command adapter. Model/UI/test files no
longer import `lib/rpc`, Hono inference, or the Backend root type entry.
