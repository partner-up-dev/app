# 4-5 Conditional Compatibility Closure — Decision Brief

> Superseded on 2026-07-19 by
> [4-5 Route-Entry Auth And Facade Closure](../../06-route-entry-auth-and-facade-closure/00-task-packet.md).
> Sir chose D1 option 1; the route process is now `route-wechat-auto-login`, installed before router navigation,
> and the two facades were deleted after closed local evidence. This brief preserves its pre-decision facts.

4-5 is not authorized by this brief. It has one product decision and one evidence-gated compatibility retirement;
neither is an excuse to modify OAuth/provider topology.

## D1 — Does `/bills` Promise Route-Entry OAuth In WeChat?

### Facts

- `/bills` is the only route with `wechatAutoLoginPolicy: "route"`.
- Its `GET /api/commerce/bills` endpoint requires an authenticated public user.
- `useRouteWeChatAutoLogin` has focused tests but no discovered production caller, so the route meta is inert today.
- The new 4-4 transport/process fallback can start OAuth after the recognized protected bills read, but it
  deliberately does not create a continuation for that read-only query.

### Choice

1. **Restore the promise.** Mount route auto-login at the appropriate app/process boundary so an anonymous WeChat
   visitor entering `/bills` starts OAuth before the protected read. This is seamless when WeChat is available but
   creates an immediate redirect on first entry and needs a faithful route/handoff browser proof.
2. **Retire the route-entry promise.** Change the route to explicit skip/anonymous UX and rely on the generic
   `AUTHENTICATED_REQUIRED` fallback only after the protected bills query runs. This avoids a route-specific policy,
   but may show a brief loading/error state before redirect and needs a visible non-WeChat/login fallback.

### Recommendation

Decide from the product promise, not the currently inert code. My default is **retire the route-entry promise**
unless Sir wants “open My Bills in WeChat and login begins immediately” as a deliberate UX commitment.

## E1 — May the Legacy Backend OAuth Facades Be Deleted?

`WeChatAuthSessionService` and `WeChatLoginService` have no discovered in-repository production import/new caller.
That is an evidence gate, not a product choice: before deletion, inventory CI, deployment scripts, FC entrypoints,
and external operational consumers, then prove replacement equivalence. If any consumer remains, retain a thin
facade with named owner/removal condition instead of deleting speculatively.

## Already Resolved Or Out Of Scope

- URL return-target propagation stays governed by the existing deployment-owned `FRONTEND_URL` contract; it needs
  implementation audit, not a new product decision.
- Command replay semantics are resolved by 4-4 and must not be reopened in 4-5.
- Provider console, callback host, and cross-origin production topology remain the 4-3.4 external-evidence branch.
