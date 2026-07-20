# Completion Review Findings

## P1 — Superseded Route Guard Can Redirect To OAuth

`route-wechat-auto-login.ts` awaits public auth bootstrap and then uses a captured `route` to mark an attempted
`/bills` visit and call the OAuth single-flight helper. A later navigation changes Vue Router's pending location but
does not abort the earlier guard Promise. Therefore, after the await, the old guard can still schedule
`window.location.replace` with its stale `/bills` return target.

This is observable from an already mounted route as well as initial navigation: a user can start a `/bills` navigation,
then navigate elsewhere while bootstrap is pending. It is a P1 user-intent/route-entry contract failure, not an
authorization bypass.

The repair must make the active navigation identity explicit before the await and check it again before *any* attempt
storage or OAuth side effect. Comparing only `router.currentRoute` is insufficient because a pending navigation has
not committed yet.

### Resolution

The installed process now increments a shared navigation epoch in `beforeEach`. Its `beforeResolve` attempt captures
that epoch, and the reusable attempt rechecks it immediately after bootstrap. A later navigation therefore makes the
older attempt return without marking storage or invoking the OAuth single flight. Focused fake-router proof exercises
the early `beforeEach` signal before a later navigation reaches `beforeResolve`.

## P2 — Whitespace Provider `openid` Is Accepted

`WeChatOAuthService.exchangeCodeForSession` treats any truthy `payload.openid` as valid and returns it unchanged.
The active callback then passes that value into `findByOpenId`, bind/upgrade, and create-user branches. A whitespace
value is truthy and can become a persisted bound identity. The removed `WeChatLoginService` previously trimmed and
rejected an empty normalised value; its removal exposed that the active service did not own the same boundary.

The repair should normalise and reject at the active provider-session boundary, so all callback branches receive one
valid identifier. It should not resurrect a facade or scatter validation through repository callers.

### Resolution

`WeChatOAuthService` now trims session and user-info `openid` values, rejects an empty normalised provider session
value, returns only the normalised session identity, and compares user-info identity after normalisation. Focused
provider-seam tests cover padded, whitespace-only, matching, and mismatched values.

## External Observations, Not Local Facts

- Fallback callback URL construction depends on forwarded host/proto; proxy sanitisation or a configured callback URL
  remains an external 4-3.4 fact.
- OAuth cookie `Secure` derives from forwarded proto while anonymous-session cookie `Secure` derives only from the
  request URL. Whether TLS termination makes this observable remains an external topology fact.
- 4-1 rollout header observation, 4-3.4 provider/edge/cross-origin evidence, and the 4-4 System canonical-host
  limitation remain open exactly as previously recorded.
