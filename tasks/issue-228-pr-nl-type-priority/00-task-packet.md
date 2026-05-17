# Issue 228 - PR NL Type Priority

## Objective & Hypothesis

Objective: make natural-language PR creation prefer an existing collaboration type before synthesizing a new `PR.type`.

Hypothesis: injecting known type options into the LLM parse context and canonicalizing the parsed `type` after structured output will reduce type drift while preserving the existing ability to create a new type when no known option fits.

## Guardrails Touched

- PRD creation rules for natural-language PR type selection.
- Backend NL PR create path: `createPRFromNaturalLanguage`.
- LLM prompt variables and default parse system prompt.
- Repository reads for known PR and Anchor Event types.

## Verification

- Backend unit tests for type option priority, prompt variables, and canonicalization.
- `pnpm test:unit:backend`.

## Verification Notes

- `pnpm exec vitest run --project backend-unit apps/backend/src/domains/pr-core/services/pr-type-options.service.test.ts apps/backend/src/services/llm/prompt-variables.test.ts apps/backend/src/services/prompts/partnerRequestParsePrompt.test.ts` passed.
- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm exec vitest run --project backend-unit --testTimeout 15000` passed.
- `pnpm lint:backend` passed.
- `pnpm test:unit:backend` hit the existing 5s default timeout in three unrelated backend unit files. The same files passed with `--testTimeout 15000`.
