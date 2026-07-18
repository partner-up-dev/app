# Smallest shared implementation shape (proposal only)

## Shared gate

Create a PR-domain use-case/composable (suggested
`apps/web/src/domains/pr/use-cases/usePRCreateAuthGate.ts`) with injectable seams for bootstrap, the session
predicate, OAuth redirect, and current return URL. Its production wrapper can use
`ensureAuthSessionBootstrapped()`, `useUserSessionStore().isAuthenticated`, and
`requestWeChatOAuthLogin(window.location.href)`.

The gate contract should be deliberately small:

- `ensureCreateAuth(): Promise<boolean>` awaits bootstrap; returns `true` only for an authenticated session; for an
  anonymous session it sets local `showAuthDisclosure` and returns `false` before any create mutation;
- `confirmAuth()` is the only path that invokes OAuth and does not retain a command, payload, or replay callback;
- `cancelAuth()` only closes the disclosure; it must not reset editor values or storage.

Do not put selection/form payloads in localStorage, route query/hash, a Pinia pending field, or a closure that fires on
OAuth return. Existing NL raw-text persistence remains limited to `natural_language_pr_draft`.

## Shared disclosure

Add one PR-domain UI component (suggested
`apps/web/src/domains/pr/ui/sections/PRCreateAuthDisclosure.vue`) wrapping `PuDialog`. Use a typed locale scope such
as `prCreateAuth.*`; copy must state all of the following without implying a server draft:

- sign-in is required before creation;
- current inputs are only in this browser's memory and may be lost during the full-page OAuth redirect;
- nothing has been saved to the server yet;
- Cancel/continue editing preserves the current editor state.

Use the `actions` slot for stable semantic IDs on the actual buttons:
`pr-create.auth-disclosure.confirm` starts OAuth and
`pr-create.auth-disclosure.cancel` closes the dialog. The dialog root should expose
`data-testid="pr-create.auth-disclosure"` (or an equivalent stable attribute) for browser assertions. Do not let
overlay close or Escape invoke OAuth.

## Owner wiring

- `PREditor`: gate at the start of `submitCreate`; remove `allowDraftSave` and its expose. `PRCreatePage` and
  `PRCreateFooterActions` retain one `pr-create.publish` command and no Save Draft branch. Rewrite form-mode copy.
- `NLPRForm` and `InlineNLPRForm`: gate at the start of their existing `submitHandler`; leave the existing raw text
  store and success routing intact. Mount the same disclosure component next to each form.
- `PRDiscoveryPanel`: gate inside `createOrdinaryPR` after local selection validation and before
  `createMutation.mutateAsync`. Remove only the `PR_DISCOVERY_CREATE` set/read/clear/replay imports and mount
  callback. Keep all unrelated pending WeChat action behavior in `usePRPendingWeChatReplay` and action queries.

## Locale/schema cleanup

Remove or rewrite `createPage.formModeDescription` so it describes local composition plus authentication, not draft
save; remove `savePending` if no command uses it. Add the disclosure title/body/confirm/cancel keys to both
`apps/web/src/locales/zh-CN.jsonc` and `apps/web/src/locales/schema.ts` in one shared typed scope.

## Scope guard

Do not alter Backend route policy, WeChat OAuth handoff protocol, global RPC 401 behavior, legacy PR DRAFT ownership,
or unrelated pending action kinds. If the post-change reference search leaves only replay-selection model symbols,
remove those symbols and their tests as tightly coupled dead code; otherwise preserve them.
