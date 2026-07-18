# 4-3 Entry Evidence

## Observed Contract

1. The navigation callback creates a signed one-shot handoff cookie, redirects to the configured frontend return
   target with a nonce query parameter, and the frontend calls the handoff endpoint with credentials included.
2. The handoff endpoint clears the nonce cookie before validating its payload and user. A second use of the same
   nonce therefore cannot be a dependable retry.
3. The callback uses a direct JSON compatibility branch for CORS-style callers and a redirect branch for browser
   navigation. The legacy Web callback page consumes the JSON shape.
4. Phase 4-2 deliberately rejects non-public identities from public-session issuance. That preserves the desired
   security boundary.
5. The auth middleware emits x-access-token after a normal route return. Existing handoff c.json error branches
   therefore append an anonymous/current token header even though their JSON body has no auth payload. Problem
   Details changes the body contract but does not by itself prevent post-next middleware work; expected OAuth
   terminal paths need an explicit no-token response policy.

## Defect To Resolve

When a persisted user becomes non-public between callback preparation and handoff exchange, the public issuer
throws. The navigation branch currently reaches a generic 500 after the cookie is already cleared. The browser
gate treats every non-consumed response alike and offers the same nonce as a retry, even though a received server
response normally means that nonce has already been consumed.

This is a failure-contract and recovery-semantics defect. It is not evidence that operator or anonymous identities
should receive public tokens.

## Test-Seam Evidence

- Backend scenario helpers can create a public user, change its role/status, and make HTTP requests against the
  real app and isolated database.
- Web process tests already mock browser globals and OAuth redirect behavior. A focused handoff client/gate test
  is cheaper than first changing the whole browser harness.
- The current System frontend build points the Web client at a proxy-compatible origin. It cannot prove production
  Web-origin to API-origin cookie behavior; a result from that setup is explicitly local-only.

## External Facts Not Inferred

The deployed provider callback authority, WeChat authorized domain, legacy external callback consumer, forwarded
host/proto at the FC edge, and real browser cookie behavior across the production/staging origin pairs remain
unobserved. They constrain topology changes and compatibility retirement, not the local failure-contract repair.
