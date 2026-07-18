# 07D Browser A preflight — Web PR creation/auth audit

Date: 2026-07-17
Scope: read-only preflight for the selected policy (authenticate before a create command).

## Accepted boundary

Browser A requires authentication before the first durable PR write. An anonymous create action must not issue
`POST /api/pr/new/nl` or `POST /api/pr/new/form`; it must show a visible disclosure first, and OAuth may begin only
after an explicit user action in that disclosure. There is no anonymous server row, no capability draft, no
automatic post-OAuth create replay, and no new durable structured local draft. An authenticated create command keeps
the current one-command behavior and returns `OPEN`.

The disclosure must be honest about the browser-memory boundary: fields currently in memory may be lost on the
full-page OAuth redirect; cancelling must leave the editor untouched. Existing natural-language text persistence
(`natural_language_pr_draft`) may remain as an existing local convenience, but must not be turned into a pending
create intent or auto-submitted after OAuth.

## Current Web entrypoints and call graph

| User surface | Current entry / command | Current auth behavior | Browser A finding |
| --- | --- | --- | --- |
| `/pr/new?mode=form` structured editor | `PRCreatePage.vue` renders `PREditor` and `PRCreateFooterActions`; `PREditor.submitCreate` calls `useCreatePRFromStructured().mutateAsync` | `ensureAuthSessionBootstrapped()` only establishes/refreshes anonymous session; it does not gate the command. The anonymous footer exposes `pr-create.save-draft`; both Save and Create can reach POST. | Remove the server-draft affordance. Gate the single Create command before mutation and open the disclosure for anonymous users. |
| `/pr/new?mode=nl` full-page NL | `NLPRForm.submitHandler` calls `useCreatePRFromNaturalLanguage().mutateAsync` | Same bootstrap-only behavior; anonymous submit reaches POST and relies on the global 401 handler. | Gate before mutation; no pending create replay after OAuth. |
| Landing/home inline NL | `LandingValuePropsSection` mounts `InlineNLPRForm`; its `submitHandler` calls the same NL mutation | Same bootstrap-only behavior; anonymous submit reaches POST. | Reuse the same auth gate/disclosure; keep raw input in memory/local store, never create before auth. |
| Discovery list/card/form/no-match create | `PRDiscoveryPanel.createOrdinaryPR` is the single structured command owner. It is reached by `PRDiscoveryCreateCard`, card empty-create, list create card, and `PRNoMatchResult` fallback (and by the zero-candidate recommendation branch). | It checks `userSessionStore.isAuthenticated`, but anonymous path writes `PR_DISCOVERY_CREATE` to `localStorage`, immediately calls OAuth, then `onMounted` reads it and automatically invokes `createOrdinaryPR` after auth. | Keep the preflight check, replace immediate redirect with disclosure, remove the `PR_DISCOVERY_CREATE` pending/replay path, and require a fresh explicit Create after OAuth. No POST before auth. |

The only Web PR-create RPC calls are in `apps/web/src/domains/pr/queries/usePRCreate.ts`: NL POST (`$post` around
lines 45–56) and structured POST (`$post` around lines 60–74). All four surfaces above eventually use one of these
two calls; there is no second hidden create API in the UI.

## Relevant seams/evidence

### Structured page and misleading draft affordance

- `PRCreatePage.vue:58-67,133-142` wires the footer to `PREditor.submitAs/submitForm` and passes
  `allowDraftSave`.
- `PREditor.vue:342-347` computes `allowDraftSave` as true for an anonymous create editor; `:582-611` bootstraps
  auth and immediately calls the structured create mutation, then optionally publishes a returned `DRAFT`.
- `PRCreateFooterActions.vue:3-21` renders `pr-create.save-draft` whenever `allowDraftSave` is true. The label is
  `common.save`, although Browser A forbids a server draft for this command.
- `zh-CN.jsonc:188-200` still says the form supports saving a draft (`createPage.formModeDescription`) and has
  `savePending`; these keys must be removed or rewritten to describe local composition plus authentication before
  creation. The typed mirror is `locales/schema.ts:187-199`.

### NL and inline forms

- `NLPRForm.vue:136-168` and `InlineNLPRForm.vue:148-177` call `ensureAuthSessionBootstrapped()` and then invoke
  `mutateAsync`; neither checks `useUserSessionStore().isAuthenticated` first.
- `useNaturalLanguageDraft.ts:1-32` persists only the NL `rawText` in Pinia storage under
  `natural_language_pr_draft`. It has no pending command or replay handler. Do not add structured fields or an
  auto-submit callback to this store for Browser A.
- `zh-CN.jsonc:1552-1572` contains NL action/error keys. Add shared auth-disclosure keys in one typed locale scope
  (prefer a `prCreateAuth`/`createPage.auth` block) and use them in all four command owners, rather than putting
  hard-coded copy in each component.

### Discovery replay conflict

- `PRDiscoveryPanel.vue:280-317` currently builds a structured selection, stores `PR_DISCOVERY_CREATE` using
  `setPendingWeChatAction`, then calls `requestWeChatOAuthLogin` when anonymous; `:319-345` reads that action on
  mount and invokes `createOrdinaryPR` automatically after authentication.
- `processes/wechat/pending-wechat-action.ts:1-56,105-133` treats `PR_DISCOVERY_CREATE` as a durable local replay
  variant. Join/waitlist/exit/confirm/publish actions are unrelated and must remain intact; only the create variant
  should be removed from this path (and its dedicated unit tests updated/deleted).
- Discovery create controls themselves are presentational and all emit into the panel: `PRDiscoveryCreateCard.vue`
  (`pr-discovery.create-card.create`), `PRDiscoveryCardStack.vue` (`prd.card.empty-create`), and
  `PRNoMatchResult.vue` (`pr-discovery.create-fallback`). Add stable disclosure test IDs at the dialog actions;
  these controls need no independent OAuth logic.

### Session/OAuth behavior

- `useAuthSessionBootstrap.ts:101-126` registers/refreshes an anonymous session and applies its role; this is the
  right readiness call but not an authorization check. Use `useUserSessionStore().isAuthenticated` immediately after
  it resolves.
- `useUserSessionStore.ts` defines `isAuthenticated` as an authenticated role plus user ID. This is the single
  client-side preflight predicate.
- `processes/wechat/oauth-login.ts:40-51` (`requestWeChatOAuthLogin`) is single-flight and schedules
  `window.location.replace`; invoke it only from the disclosure's explicit confirm handler. It already marks the
  OAuth pending indicator.
- `lib/rpc.ts:41-50` globally starts OAuth for any 401 response with `AUTHENTICATED_REQUIRED`. This remains a safety
  net for races/expired sessions, but the create command must not rely on it: anonymous preflight must return before
  any create POST, and visible disclosure must precede the intended OAuth redirect. Do not globally disable this
  policy because other command owners use it.

## Minimal implementation shape (proposal, not implemented here)

1. Extract one small PR-create auth gate/composable (or equivalent shared helper) used by `PREditor`, `NLPRForm`,
   `InlineNLPRForm`, and `PRDiscoveryPanel`. It should:
   - await `ensureAuthSessionBootstrapped()`;
   - return `true` for authenticated sessions without changing the mutation path;
   - for anonymous sessions, set local `showAuthDisclosure`, return `false`, and never call a create mutation;
   - expose an explicit `continue` handler that calls `requestWeChatOAuthLogin(window.location.href)` and a cancel
     handler that only closes the disclosure.
2. Render one accessible `PuDialog`/shared disclosure in each command owner (or a shared component) with stable IDs,
   e.g. `pr-create.auth-disclosure`, `.confirm`, `.cancel`. Copy must state: sign-in is required before creating;
   current page input is only in this browser memory and may be lost during the OAuth redirect; nothing has been
   saved yet; Cancel preserves current inputs. The confirm action is the only path to OAuth.
3. Remove the anonymous `Save`/server-DRAFT affordance: delete the `allowDraftSave` branch and the
   `formModeDescription` promise of saving a draft. Keep one Create/submit command; authenticated behavior and
   redirects remain as-is.
4. In `PRDiscoveryPanel`, remove only the `PR_DISCOVERY_CREATE` write/read/replay path and its imports. Anonymous
   create requests should stop at the disclosure; after OAuth return no create is attempted automatically. Existing
   non-create pending actions remain unchanged.
5. Do not add a durable structured draft, pending create intent, capability URL, or automatic post-OAuth replay.

## Lowest-cost verification plan

### Unit layer (fast, no browser)

- Add a focused auth-gate unit (suggested `apps/web/src/domains/pr/use-cases/usePRCreateAuthGate.test.ts`) with a
  fake session/bootstrap and OAuth function: anonymous `ensure` opens disclosure and makes zero create calls; cancel
  makes zero redirects; explicit confirm calls OAuth once; authenticated `ensure` allows exactly one command.
- Keep `processes/wechat/oauth-login.test.ts` and `shared/api/auth-required-policy.test.ts` as regression coverage
  for single-flight OAuth/global 401 behavior.
- Update/remove the `PR_DISCOVERY_CREATE` cases in `processes/wechat/pending-wechat-action.test.ts`; retain tests for
  the other pending action kinds. `PRDiscoveryPanel.test.ts` can add the pure invariant that leaving FORM still
  resets state; component-level auth behavior is better covered by the shared gate test.

### Browser/scenario layer (one targeted journey)

- Update `tests/scenario/pr/pr-create.scenario.test.ts` anonymous scenario (currently named
  `pr_create_form_requires_authentication_for_save_draft`, around lines 140–165): use the sole
  `pr-create.publish` action, assert the disclosure is visible, assert a short observation window records no
  `POST /api/pr/new/*`, then cancel and confirm the editor remains populated. Stub/abort the OAuth login request so
  the test does not leave the scenario; confirm may be a separate assertion that the OAuth endpoint is requested
  only after the disclosure confirm. The authenticated publish scenarios should remain one successful POST and
  `OPEN` response.
- Add one compact anonymous NL assertion either in the same scenario file (`/pr/new?mode=nl`) or a unit test of the
  shared gate: its submit must also produce no NL POST. Home inline NL and Discovery create can be covered by the
  same gate unit because they share the command owner; add a dedicated Discovery browser assertion only if the
  implementation leaves a separate panel path.
- Existing authenticated Discovery scenarios around `pr_discovery_form_no_match_candidate_and_zero_direct_create_are_ordinary_prs`
  (roughly lines 730–830) should remain unchanged and prove one post-auth structured POST/OPEN result. Add a small
  anonymous Discovery case only if needed to prove the replay removal; it should assert disclosure + no POST and no
  PR row before authentication.

## Explicit non-goals / stop conditions

- Do not change Backend route policy, WeCom ingress, legacy DRAFT ownership, OAuth handoff protocol, or global
  session semantics in this Browser A slice.
- If product asks to restore structured recovery across OAuth, cross-device drafts, a server draft, capability URLs,
  or automatic replay, stop and reopen the A/C product decision; that would be a different contract.
