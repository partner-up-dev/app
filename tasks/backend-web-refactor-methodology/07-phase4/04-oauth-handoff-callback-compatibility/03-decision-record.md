# 4-3 Decision Record

## D1 — Keep Both Callback Shapes

The navigation nonce-handoff route is canonical for browser navigation. The direct JSON callback remains a
compatibility path because its external producer/consumer inventory is incomplete. 4-3 does not merge them or
remove navigation detection.

## D2 — Distinguish Confirmed Terminal Failure From Transport Uncertainty

A received 4xx response that does not authenticate the handoff is terminal for that nonce: the Backend has
received an invalid/expired/mismatched credential or explicitly rejected the public identity. The Web client
clears that nonce from the address bar, keeps the user on an explicit recovery screen, and offers a fresh login
or visitor continuation.

A thrown fetch/abort or received 5xx response remains transport uncertainty. A 503 can occur before the Backend
reads the cookie; an unexpected 5xx can occur on either side of consumption. The nonce stays visible and retry
remains available because a later attempt may still succeed or will return an explicit terminal 4xx.

## D3 — Public-Identity Rejection Is Expected And Token-Free

If the handoff user is inactive, missing, anonymous, or operator-only, the Backend returns 403 Problem Details
with code WECHAT_OAUTH_PUBLIC_IDENTITY_NOT_ALLOWED and a safe detail. The valid handoff credential does not entitle
that identity to a public session. Invalid, expired, and mismatched nonce data return 400 Problem Details with
distinct WECHAT_OAUTH_HANDOFF codes. Every expected handoff failure marks its response as token-suppressed before
it reaches the auth middleware's response tail, so neither an auth body nor an x-access-token response header is
emitted. Cache-Control is no-store for every handoff result.

The direct callback compatibility body remains its existing ok/error/returnTo shape. Its expected identity
rejection receives the same safe status/detail rather than an issuer exception, and likewise carries no response
token; it is not silently converted into the navigation handoff protocol.

## D4 — OAuth Login Entry Sanitizes Its Return Target

The OAuth login process is the sole frontend construction boundary for returnTo. It removes code, state,
access_token, token, and handoff nonce query values; drops a sensitive hash; and accepts only the current browser
origin before sending an absolute URL to Backend, which remains the final FRONTEND_URL authority. The legacy
callback page reads its inbound code/state once and immediately applies the same browser-visible cleanup before
its RPC request.

## D5 — Bind Feedback Cannot Claim Success Prematurely

The successful bind marker is emitted only after the resolved identity is eligible for the public completion path.
For a rejected bind identity, preserve the existing bind-failed return behavior rather than redirecting to a
handoff that is destined to fail.

## D6 — Topology Is Evidence-Gated

The public origin mismatch, provider-console setting, edge forwarded headers, and cross-origin cookie behavior are
not inferred from source or a development proxy. 4-3.4 records the required evidence and blocks only topology
change or compatibility retirement.
