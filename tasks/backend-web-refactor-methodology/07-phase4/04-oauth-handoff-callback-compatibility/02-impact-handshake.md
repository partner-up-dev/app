# 4-3 Impact Handshake

## Why This Is High Impact

OAuth crosses provider, Backend, browser, cookie, router, and legacy-client boundaries. A small response change
can otherwise create an authentication loop, expose a credential in a URL, or incorrectly claim production cookie
continuity.

## Participants And Contract

| Participant | Receives | Must preserve |
| --- | --- | --- |
| Provider callback | code and signed state | Existing callback URL and state validation |
| Backend callback | validated state and resolved user | No token in navigation URL; legacy JSON branch remains |
| Backend handoff | nonce and scoped cookie | One-shot exchange; no public token for non-public identity |
| Web handoff gate | nonce query and HTTP result | Credentials included; clear a confirmed terminal nonce; no false same-nonce retry promise |
| Legacy callback page | code/state direct JSON flow | Compatibility handling and sensitive-parameter cleanup |

## Containment Decision

4-3 changes the local endpoint/result semantics only after focused proof. It does not alter FRONTEND_URL, CORS
allowlists, callback URL construction, cookie attributes, provider settings, or origin topology. Those changes
would require the missing control-plane and edge evidence.

## Rollback Shape

The local change is bounded to expected terminal response classification and Web presentation/recovery. It can be
reverted as a coherent Backend/Web pair without changing migrations, stored data, or provider settings. No rollback
may restore a public token for a non-public identity.
