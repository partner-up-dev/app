# 4-5 Entry Evidence

## Route-Entry Fact

- `/bills` is the only current route that declares `wechatAutoLoginPolicy: "route"`.
- `route-wechat-auto-login` owns the reusable bootstrap, handoff, ability, attempt-storage, and OAuth
  single-flight decision. Source search finds no production invocation before this slice.
- A post-mount watcher would be too late for the declared promise: `CommerceBillsPage` mounts its protected query
  immediately, while an async bootstrap decision is still pending. The restored owner must therefore be a
  router-entry guard, registered before `app.use(router)`, rather than an `AppRoot` watcher.
- The bills list endpoint requires an authenticated user. The page currently issues its query immediately, so the
  restored route process must resolve before ordinary mounted page work while still respecting handoff/bootstrapping
  guards.
- Other protected Commerce routes (`/orders/:orderId`, `/bills/:billId`, and `/payment/checkout`) currently
  have no route-auto-login declaration. They remain unchanged: protected reads alone do not establish a product
  route-entry OAuth promise.

## Facade Fact

`WeChatAuthSessionService` and `WeChatLoginService` are historical Backend service classes. At entry, no repository
source consumer is known, but deletion is conditional on an immediate scripts/CI/FC/package-export inventory.

## Known Proof Boundary

The System scenario OAuth continuation attempt in 4-4 is limited by the harness's `127.0.0.1` frontend versus
`localhost` callback cookie scope. 4-5 does not manufacture browser proof by changing hosts or cookies; its cheapest
proof is process/wiring behavior plus existing mock OAuth handoff coverage.
