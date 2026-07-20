# 4-5 Decision Record

## D1 — `/bills` Has A Route-Entry OAuth Promise

Sir chose the product promise: when an anonymous visitor enters `/bills` from WeChat, OAuth begins at route entry.
This is not a universal upfront-login rule and does not change ordinary anonymous browsing.

## D2 — Reuse Through One Router-Entry Process And Route Metadata

The route-auto-login decision becomes one router `beforeResolve` guard, registered once by app bootstrap before
`app.use(router)`. A route declares its intent with `wechatAutoLoginPolicy: "route"`. This prevents the opted-in
component's first protected query from mounting before bootstrap and the login decision. No page or commerce query
may own redirect mechanics. Existing `skip` routes and routes with no policy remain unchanged; any later page needs
a product decision plus one declarative meta entry.

The Phase-completion review adds a necessary implementation condition: an awaited guard must verify its navigation
epoch before it writes attempted-route state or starts OAuth. Vue Router cancellation does not abort a guard Promise,
so the initial implementation's captured-route side effect is not accepted as the final D2 realization.

## D3 — Verification Is Layered, Not Forged E2E

The low-cost proof first verifies an anonymous eligible navigation produces one login request after bootstrap and
aborts that navigation, then proves handoff/attempt guards and one-time guard registration. Existing Backend mock
OAuth/handoff proof covers the callback exchange.
The known canonical-host limitation is recorded rather than bypassed.

## D4 — Delete Facades Only On Closed Local Evidence

If source, scripts, CI, FC entrypoints, package exports, and tests have no consumer, delete the private unused source
files and prove type/lint/build. If a real local consumer appears, retain a thin compatibility facade with owner and
removal condition. External state not represented in the repository is not guessed.
