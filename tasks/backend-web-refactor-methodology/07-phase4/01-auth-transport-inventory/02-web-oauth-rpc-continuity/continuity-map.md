# 4-0B — Web OAuth, RPC And Continuity Map

## Runtime Auth SCC

All five links below carry runtime values rather than only types or constants:

```text
lib/rpc.ts
  -> shared/api/auth-required-policy.ts
  -> processes/wechat/oauth-login.ts
  -> processes/wechat/oauth-trace.ts
  -> shared/telemetry/track.ts
  -> lib/rpc.ts
```

The loop currently works because execution happens at request/event time, but it widens the number of owners that a
small auth-redirect change touches. The desired exit is a one-directional browser escalation boundary, not an
arbitrary “shared auth” abstraction. Its behavior-sensitive cut belongs with `4-4`, after the handoff contract is
stable.

## Browser Truth Inventory

| State | Current location | Lifecycle observation | Authority reading |
| --- | --- | --- | --- |
| Backend user identifier | `partner_up_user_id` local storage | Input to anonymous/session bootstrap | Browser continuity hint; Backend remains authoritative. |
| Access token | `partner_up_access_token` local storage and session store projection | RPC reads/persists rotation; bootstrap reconciles store | Transport credential with duplicate browser projections that need an explicit update rule. |
| Session role | `partner_up_session_role` local storage and session store projection | Used to reconstruct browser session state | Projection, not authorization truth. |
| OAuth trace/attempt | session storage | Supports redirect single-flight and post-return tracing | Process-local browser workflow state. |
| Pending PR action | local storage, 10-minute TTL | Commands retain only join/waitlist/exit/confirm/publish intent | Command-owned continuation; PR create is intentionally absent. |
| Telemetry anonymous id/journey | telemetry storage | Independent from Backend anonymous-user identity | Separate vocabulary; do not merge it with account/session identity. |

## Ordering Facts

1. `AppRoot` mounts the handoff gate around route rendering, starts bootstrap, and coordinates share behavior.
2. When `wechatOAuthHandoff` is present, the gate defers normal route mount. Exchange uses credentialed HTTP, applies
   session state, clears the nonce from the address bar, dispatches its completion signal and then allows bootstrap
   / router synchronization.
3. On handoff failure the nonce remains available for retry; an explicit visitor path clears it before bootstrap.
4. `authFetch` can persist token rotation, but the Pinia projection is reconciled by bootstrap rather than every
   transport update. Whether a transient store/storage difference is observable to a caller needs a dedicated
   behavioral test before changing it.
5. Legacy `WeChatOAuthCallbackPage.vue` still invokes the direct callback API and can apply `payload.auth`. It is a
   compatibility seam, not dead code by inspection alone.

## URL And Route Facts

- `sanitizeSensitiveRoutePath` removes OAuth/token/handoff query keys from the standard route/share/telemetry paths;
  its hash check is case-insensitive.
- Some OAuth producers start from `window.location.href`. The backend currently receives the raw return target, so
  URL hygiene cannot be declared complete only from the browser sanitizer.
- `useRouteWeChatAutoLogin` is tested but has no discovered production caller. `/bills` is the only route policy
  consumer. This is an inactive-feature or missing-wiring decision, not a refactor defect to “fix” silently.

## Focused Proof And Gaps

Seven focused frontend unit files passed (12 tests) across RPC, auth-required policy, OAuth login/route behavior,
pending actions, PR replay and telemetry. They prove local seams, not a full `401 -> OAuth -> handoff -> replay`
journey. In particular, the redirect is intentionally scheduled so a failing command can persist pending intent;
there is no end-to-end proof of that ordering today.
