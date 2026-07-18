# 07D entry inventory — exact current seams

Snapshot date: 2026-07-17. Line numbers are entry anchors from the current working tree; re-check immediately before
editing because other agents are concurrently changing unrelated Web files.

## Route and command topology

| Surface | Current entry/route | Current command seam | Current finding |
| --- | --- | --- | --- |
| Structured form | `apps/web/src/app/router.ts:106-112` -> `apps/web/src/pages/PRCreatePage.vue:44-58` | `PRCreatePage.vue:127-142` exposes `PREditor` and footer; `apps/web/src/domains/pr/ui/forms/PREditor.vue:583-603` calls `useCreatePRFromStructured` | `ensureAuthSessionBootstrapped()` is called, but no authorization predicate precedes the mutation. |
| Full NL | `/pr/new?mode=nl`, `PRCreatePage.vue:30-42` | `apps/web/src/domains/pr/ui/forms/NLPRForm.vue:140-159` | Bootstrap-only; anonymous submit can reach the NL create mutation. |
| Home inline NL | `apps/web/src/domains/landing/ui/sections/LandingValuePropsSection.vue:31-34` mounts `InlineNLPRForm` | `apps/web/src/domains/pr/ui/sections/InlineNLPRForm.vue:152-171` | Same bootstrap-only behavior and same NL mutation. |
| Discovery | `apps/web/src/pages/PRDiscoveryPage.vue:64` mounts panel | `apps/web/src/domains/pr/ui/PRDiscoveryPanel.vue:241-345,386-392` owns every direct-create command | Anonymous branch persists/replays `PR_DISCOVERY_CREATE`, and the panel auto-runs it on mount after auth. |

## Durable-write and auth seams

| File/anchor | Current truth | 07D implication |
| --- | --- | --- |
| `apps/web/src/domains/pr/queries/usePRCreate.ts:35-77` | The only Web create RPCs are `client.api.pr.new.nl.$post` and `client.api.pr.new.form.$post`. | Gate must return before either mutation for anonymous sessions. |
| `apps/web/src/processes/auth/useAuthSessionBootstrap.ts:101-126` | Bootstrap registers/refreshes a session and may leave the role anonymous. | Readiness, not authorization; call it, then read `useUserSessionStore().isAuthenticated`. |
| `apps/web/src/shared/auth/useUserSessionStore.ts:25-27` | Auth predicate is authenticated role plus non-null user ID. | Single client-side gate predicate. |
| `apps/web/src/processes/wechat/oauth-login.ts:40-51` | `requestWeChatOAuthLogin(returnTo)` is single-flight and schedules `window.location.replace`. | Invoke only from disclosure confirm; do not use it as the anonymous submit path. |
| `apps/web/src/shared/api/auth-required-policy.ts` and `apps/web/src/lib/rpc.ts` | Global 401 handling remains a race/expiry safety net. | Do not disable globally; create owners must preflight first. |

## Structured editor and affordance seams

- `apps/web/src/domains/pr/ui/forms/PREditor.vue:275-277` imports bootstrap/store; `:347` computes
  `allowDraftSave` for anonymous create; `:583-603` creates then may publish; `:672-679` exposes draft state.
- `apps/web/src/pages/PRCreatePage.vue:50-52,127-142` passes `allowDraftSave` into the footer and renders the
  form-mode description.
- `apps/web/src/domains/pr/ui/sections/PRCreateFooterActions.vue:3-22,30-34` renders `pr-create.save-draft` and
  `pr-create.publish`; the Save button maps to the same form create endpoint and must disappear under Browser A.
- `apps/web/src/locales/zh-CN.jsonc:188-202` and `apps/web/src/locales/schema.ts:187-199` contain
  `formModeDescription` promising draft save and `savePending`; rewrite/remove those keys and add one shared,
  typed disclosure copy scope.

## Natural-language persistence and UI seams

- `apps/web/src/domains/pr/use-cases/useNaturalLanguageDraft.ts:4-32` persists only `rawText` under
  `natural_language_pr_draft`; this existing convenience may remain.
- `NLPRForm.vue:140-159` and `InlineNLPRForm.vue:152-171` should call the shared gate before their respective
  `mutateAsync`; no pending callback or replay state may be added.
- Current NL submit controls have no stable `data-testid`; the minimum browser journey can cover the shared gate via
  structured form and use a unit gate test for both NL owners. Add NL IDs only if a later browser scenario needs
  those direct controls.

## Discovery replay conflict and controls

- `PRDiscoveryPanel.vue:120,144-147` imports/types `PRDiscoveryCreateReplaySelection` solely for the pending create
  branch; `:134-140` imports bootstrap, OAuth, and pending-action APIs.
- `PRDiscoveryPanel.vue:255-317` persists `PR_DISCOVERY_CREATE` both on the anonymous branch and on an unauthenticated
  mutation error; `:320-338` reads and auto-replays it after auth. Remove this create-only path, then gate before
  `createMutation.mutateAsync`.
- The create command inputs are still emitted to the panel by presentational children:
  `PRDiscoveryCreateCard.vue:35-47` (`pr-discovery.create-card.create`),
  `PRDiscoveryCardStack.vue:151-166` (`prd.card.empty-create`), and
  `PRNoMatchResult.vue:68-80` (`pr-discovery.create-fallback`). No child should own OAuth.
- `apps/web/src/processes/wechat/pending-wechat-action.ts:1-176` currently includes only five unrelated replay kinds
  plus `PR_DISCOVERY_CREATE`; remove only the latter kind/validator/import and retain Join/Waitlist/Exit/Confirm/
  Publish. `usePRPendingWeChatReplay.ts` already narrows to the five unrelated kinds.
- `PRDiscoveryCreateReplaySelection` and its validator in `apps/web/src/domains/pr/model/discovery.ts:50-105` become
  orphaned once the panel and pending module are cleaned; remove only if the post-change reference search confirms no
  other consumer.

## Dialog/design seam

`PuDialog` is already used in `PREditor.vue:227-236`. Design-web guidance requires explicit `open` plus `close`,
`cancel`, and `confirm` events; an `actions` slot is available for custom buttons. A shared PR-domain disclosure
component can therefore own stable IDs (`pr-create.auth-disclosure`, `.confirm`, `.cancel`) while each owner keeps its
own local open state.
