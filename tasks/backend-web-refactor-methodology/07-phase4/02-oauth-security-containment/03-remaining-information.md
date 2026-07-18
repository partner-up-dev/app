# 4-1 Remaining Information And Minimum Support

## Resolved For 4-1

- Current GitHub Environment inputs pair each Web origin with its same-environment API origin.
- The optional callback override is absent from those Environment variable inventories.
- Sir confirmed FC has no non-CI variable override.
- Both configured APIs are publicly reachable; credentialed CORS reflection accepts an arbitrary origin in both
  environments.
- The default source topology and the legacy frontend callback compatibility boundary are known.

## Facts That Cannot Be Reliably Inferred From the Repository

| Remaining fact | Why repository/public probes cannot settle it | Effect / smallest future support |
| --- | --- | --- |
| WeChat Official Account callback / authorized-domain configuration | It lives in the provider console, outside source control. | Read-only console access, or a screenshot/export of callback URL and authorized domain with identifiers/secrets redacted. |
| Whether the legacy frontend callback route has a live external consumer | Static source establishes only a compatibility window and history. | Provider-console callback value plus operational owner confirmation; later, a controlled test account if needed. |
| Forwarded-host/protocol behavior at the real API edge | Public headers do not show the headers FC received. | FC/edge configuration view, or an authorized non-authenticated diagnostic that reports only resolved public origin. |
| Browser cookie behavior across the production subdomains | Preflight cannot exercise a credentialed handoff cookie safely. | Staging browser run with the local WeChat mock and a controlled test account only if the mock cannot represent the production cookie policy. |

These facts do **not** block the narrowed `4-1`: it preserves callback, cookie and handoff topology. They block only a
future `4-3` topology change or compatibility retirement.

## What Sir Does Not Need To Supply

- No JWT, WeChat app secret, OAuth code, handoff nonce, user cookie, database credential or cloud access key.
- No production user session or real OAuth login for the current handshake.

## Recommended Next Interaction

The narrowed `4-1` is ready for explicit runtime-work authorization: explicit same-environment CORS/return-target
configuration while preserving callback compatibility. WeChat-console visibility remains valuable evidence for `4-3`,
not a prerequisite for `4-1`.
