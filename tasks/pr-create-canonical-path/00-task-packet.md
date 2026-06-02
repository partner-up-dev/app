# PR Create Canonical Path

## Objective & Hypothesis

- Objective: converge non-admin PR creation onto one canonical PR create implementation and prevent creating or publishing PRs whose `time[0]` is already in the past.
- Hypothesis: `createPRFromStructured` can become the single user/system creation authority from normalized `PartnerRequestFields`, while Natural Language create and full-capacity expansion become adapters that prepare fields and call that authority.

## Guardrails Touched

- PR core create and publish lifecycle:
  - `apps/backend/src/domains/pr-core/use-cases/create-pr-structured.ts`
  - `apps/backend/src/domains/pr-core/use-cases/create-pr-natural-language.ts`
  - `apps/backend/src/domains/pr-core/use-cases/publish-pr.ts`
- Anchor Event full-capacity system expansion:
  - `apps/backend/src/domains/anchor-event/use-cases/expand-full-pr.ts`
- Admin PR create remains a separate authority because it owns admin-only PR fields and policy controls.

## Evidence

- Structured create currently creates `DRAFT`, then `finalizeCreatedPR` may publish immediately.
- Natural Language create currently duplicates the same create steps instead of delegating to structured create.
- Full-capacity expansion directly calls `PartnerRequestRepository.create` with `status: "OPEN"`.
- Existing PR command boundaries validate POI availability and participant conflict, but do not reject a past `time[0]`.

## Verification

- Add focused backend scenario coverage for rejecting structured create with a past start time.
- Add focused backend scenario coverage for rejecting publish of a pre-existing `DRAFT` with a past start time.
- Add or preserve coverage that Natural Language create reaches the canonical structured path.
- Run targeted backend scenario tests covering PR create and relevant Anchor Event create/expansion behavior.

## Result

- `createPRFromStructured` is now the canonical non-admin create authority for structured, natural-language, event-assisted, and full-capacity auto-expansion PR creation.
- `createPRFromNaturalLanguage` now acts as an adapter: AI parse and type canonicalization, then delegate to structured create with automatic partner bounds.
- `expandFullCapacityPR` now delegates to structured create with system-owned `create-open` mode instead of directly inserting `partner_requests`.
- PR create and publish reject past `time[0]` through `PR_START_TIME_PASSED`.

## Verification Run

- `pnpm --filter @partner-up-dev/backend exec tsc --noEmit`
- `pnpm lint:backend`
- `pnpm test:unit:backend`
- `pnpm exec vitest run --project frontend-unit apps/frontend/src/domains/event/queries/useCreateEventAssistedPR.test.ts`
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/pr-core/pr-create.scenario.test.ts apps/backend/tests/pr-core/pr-draft.scenario.test.ts apps/backend/tests/anchor-event/anchor-event-full-pr-expansion-policy.scenario.test.ts apps/backend/tests/anchor-event/anchor-event-assisted-create.scenario.test.ts`
- `git diff --check`
