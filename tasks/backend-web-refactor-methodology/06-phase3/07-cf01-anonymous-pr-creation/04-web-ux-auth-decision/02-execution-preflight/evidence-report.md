# 07D Browser A — short evidence/report

## Result

Entry rebaseline is complete as a read-only snapshot. No application source, test, locale, durable document, or parent
packet was changed. Only this task-local packet was created.

## Baseline evidence

- Focused Web unit command: **5 files / 7 tests passed**.
- Full Web unit command (`pnpm test:unit:web`): **47 files / 152 tests passed**.
- Current behavior remains pre-07D: anonymous create owners bootstrap a session but do not gate on
  `isAuthenticated`; structured Save Draft is visible; Discovery retains `PR_DISCOVERY_CREATE` replay.

## Entry anchors

- Routes/owners: `apps/web/src/app/router.ts:106-112`, `apps/web/src/pages/PRCreatePage.vue:30-58`,
  `apps/web/src/domains/pr/ui/PRDiscoveryPanel.vue:241-345`.
- Mutations: `apps/web/src/domains/pr/queries/usePRCreate.ts:35-77`.
- Auth/OAuth: `apps/web/src/processes/auth/useAuthSessionBootstrap.ts:101-126`,
  `apps/web/src/shared/auth/useUserSessionStore.ts:25-27`, `apps/web/src/processes/wechat/oauth-login.ts:40-51`.
- Misleading affordance/copy: `PREditor.vue:347,583-603`, `PRCreateFooterActions.vue:3-22`,
  `zh-CN.jsonc:188-202`, `locales/schema.ts:187-199`.
- Discovery pending replay: `PRDiscoveryPanel.vue:255-338`,
  `processes/wechat/pending-wechat-action.ts:38-134`.
- Current stale browser assertion: `tests/scenario/pr/pr-create.scenario.test.ts:140-159` still clicks
  `pr-create.save-draft` and expects a 401 POST.

## Surprises/staleness to flag

1. The Save Draft scenario encodes the forbidden contract: it proves a request was sent, rather than proving zero
   create requests before authentication. It must be replaced, not merely renamed.
2. Current NL submit controls have no stable test IDs. The minimal browser journey can avoid adding them by covering
   NL/inline owners through the shared gate unit; add IDs only if browser coverage expands.
3. `PR_DISCOVERY_CREATE` is tested only as a positive pending-action round-trip today. Those tests must be inverted to
   prove unrelated pending action kinds remain intact after the create variant is removed.
4. `PRDiscoveryCreateReplaySelection` in `domains/pr/model/discovery.ts` appears replay-only; confirm with a final
   reference search before deleting it.
5. The worktree currently contains broad parallel refactor edits in Web files. This packet records the current line
   anchors but does not revert or merge those edits; re-run `rg` immediately before implementation.

## Recommendation to parent

Implement one injected gate plus one shared `PuDialog` disclosure, wire all four owners, remove only create-specific
pending replay and Save Draft, then run the focused unit matrix followed by one anonymous no-POST browser journey and
the unchanged authenticated one-command journeys. Do not claim implementation/test completion from this packet.
