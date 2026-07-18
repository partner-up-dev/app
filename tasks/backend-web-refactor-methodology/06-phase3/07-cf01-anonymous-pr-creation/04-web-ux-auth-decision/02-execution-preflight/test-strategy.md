# 07D focused test strategy

## Baseline executed at entry

Read-only commands run from repository root:

```text
pnpm exec vitest run --project frontend-unit \
  apps/web/src/domains/pr/queries/usePRCreate.test.ts \
  apps/web/src/domains/pr/ui/PRDiscoveryPanel.test.ts \
  apps/web/src/processes/wechat/pending-wechat-action.test.ts \
  apps/web/src/processes/wechat/oauth-login.test.ts \
  apps/web/src/shared/api/auth-required-policy.test.ts
```

Result: 5 files / 7 tests passed.

```text
pnpm test:unit:web
```

Result: 47 files / 152 tests passed.

The system/browser suite was not launched during this read-only packet because its global setup owns temporary
database/server lifecycle and writes scenario artifacts outside this owned task folder. The command and assertions to
run after the implementation are below.

## Minimal unit set before handoff

1. Add one dependency-injected shared gate policy test (recommended location
   `apps/web/src/domains/pr/use-cases/usePRCreateAuthGate.test.ts`). Assert:
   - bootstrap resolves anonymous -> disclosure opens, returns `false`, and the injected create spy has zero calls;
   - cancel closes disclosure, preserves the caller's in-memory state, and makes zero OAuth calls;
   - explicit confirm calls OAuth exactly once with the current URL;
   - bootstrap resolves authenticated -> returns `true`, with exactly one subsequent command permitted;
   - repeated confirm is single-flight at the existing OAuth seam, not a second create/replay.
2. Keep `apps/web/src/processes/wechat/oauth-login.test.ts` and
   `apps/web/src/shared/api/auth-required-policy.test.ts` as single-flight/global-401 regression tests.
3. Replace the three `PR_DISCOVERY_CREATE` cases in
   `apps/web/src/processes/wechat/pending-wechat-action.test.ts` with coverage that unrelated kinds still
   round-trip, reject malformed payloads, and clear explicitly. `usePRPendingWeChatReplay.test.ts` should remain
   green for Join/Waitlist/Confirm and must not gain a create replay case.
4. Preserve `apps/web/src/domains/pr/ui/PRDiscoveryPanel.test.ts`'s form-exit reset invariant; add only a pure
   assertion if the gate extraction exposes one. Avoid a brittle full-panel auth test when the shared gate covers all
   command owners.

## Targeted Browser A journey

Update the stale scenario named `pr_create_form_requires_authentication_for_save_draft` in
`tests/scenario/pr/pr-create.scenario.test.ts:140-159` to a sole `pr-create.publish` action:

- install an anonymous session and fill the structured editor;
- collect `POST` requests matching `/api/pr/new/form` and `/api/pr/new/nl` for a short observation window;
- click `pr-create.publish`, assert `pr-create.auth-disclosure` and `.cancel`/`.confirm` are visible;
- assert no create POST occurred, click cancel, and assert the title/type inputs retain their values;
- optionally assert the confirm handler requests `/api/wechat/oauth/login` only after disclosure confirmation, with
  the redirect stubbed/aborted so the scenario does not leave the test page.

Retain the authenticated structured scenarios (`pr-create.publish` -> one 201 POST -> `OPEN`) and the existing
authenticated Discovery ordinary-PR scenarios. Add a small anonymous Discovery assertion only if the implementation
does not make the shared gate path obvious: disclosure visible, no `/api/pr/new/form` POST, no
`PR_DISCOVERY_CREATE` localStorage record, and no row before authentication.

Suggested post-change commands:

```text
pnpm exec vitest run --project frontend-unit \
  apps/web/src/domains/pr/use-cases/usePRCreateAuthGate.test.ts \
  apps/web/src/processes/wechat/pending-wechat-action.test.ts \
  apps/web/src/processes/wechat/oauth-login.test.ts \
  apps/web/src/shared/api/auth-required-policy.test.ts
pnpm exec vitest run --project system-scenario tests/scenario/pr/pr-create.scenario.test.ts \
  -t 'pr_create_form_requires_authentication_before_create'
pnpm check:type:web
pnpm check:build:web
```

## Coverage boundary

No unit test may rely on 401 behavior to prove the pre-auth rule: an HTTP 401 means a create request already escaped.
The decisive invariant is zero create requests before explicit authentication confirmation.
