# 4-5 Mental Rehearsal

## Happy Path: Anonymous WeChat Visitor Opens `/bills`

1. App bootstrap registers one `beforeResolve` route-entry guard before the router starts resolving `/bills`.
2. The guard observes the route's explicit `route` policy. No handoff nonce is present.
3. The process awaits public auth bootstrap. The browser remains anonymous and is recognized as a WeChat ability
   environment.
4. It records the `/bills` attempt once, delegates to the existing OAuth single flight with the target URL, and
   aborts the current navigation so the bills component cannot mount first.
5. OAuth/handoff returns to the same route. The handoff gate completes before ordinary route work; auth bootstrap
   applies the authenticated session and the route process clears the attempted-route record.
6. The bills query now receives its authenticated viewer identity.

## Branches

- A pending handoff nonce defers route auto-login without registering a second anonymous session or redirect.
- An authenticated visitor clears stale attempt state and never redirects.
- A non-WeChat browser never redirects; it retains the existing page/query behavior.
- A `skip` or absent route policy does nothing, even if that page later makes a protected request.
- A concurrent command-driven escalation shares the existing OAuth single flight; the route process does not create
  an additional navigation owner.
- If a newer navigation begins while bootstrap is pending, the older guard must become inert before it marks route
  storage or calls OAuth. The initial implementation missed this branch; the completion-review repair owns it.
- If a facade consumer appears during inventory, retain it and stop deletion rather than changing a runtime entry.

## Rollback Boundary

The route restoration is one app-bootstrap guard registration. Removing that registration restores the previously
dormant policy without altering OAuth URL construction, callback/handoff cookies, Backend auth, or page code.
Facade deletion is separate and reversible through version control only after the zero-consumer proof.
