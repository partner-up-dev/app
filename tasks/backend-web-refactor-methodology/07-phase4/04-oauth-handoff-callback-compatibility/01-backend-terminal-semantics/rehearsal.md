# 4-3.1 Rehearsal

A valid handoff cookie identifies user U. Before exchange, U is changed from authenticated to service/operator.
The endpoint reads then clears the cookie, fetches U, classifies U as ineligible for a public session, records a
terminal failure, and returns the stable client-safe result without signing a bearer. A replay receives the invalid
handoff result because the cookie was already cleared.

For a bind mode result, pre-admission fails before a success marker is added. The existing bind-failed completion
path runs; it does not send the browser to a nonce that can only fail. For a healthy public user, existing handoff
cookie, redirect, and auth payload behavior remain unchanged.
