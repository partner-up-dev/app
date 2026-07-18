# 4-3 Mental Rehearsal

## Healthy Navigation

Browser starts login -> Backend writes signed state -> provider/mock returns code and state -> Backend resolves an
active public user -> Backend writes scoped handoff cookie -> redirect carries nonce only -> gate calls handoff
with credentials -> Backend clears cookie, issues public auth -> gate stores the public projection, removes nonce,
clears trace, and permits the app to bootstrap.

## Expected Rejected Identity

The navigation callback can issue a nonce only; it does not itself mint a public browser token. If a role/status
changes before handoff, the endpoint receives the nonce, clears its cookie, returns a stable terminal no-token
result, and records the trace. The gate receives the 4xx response, removes the nonce from the address bar, does
not try it again, and presents fresh login or visitor continuation. No operator token becomes a public token.

## Lost Network Response

The browser throws before it receives an HTTP response, or receives a 5xx before the outcome is known. The gate
retains the nonce and offers retry because the request might not have reached the Backend or may have failed before
cookie consumption. If it was consumed, the next received 400/403 response moves into terminal recovery. This is
an honest best-effort retry, not a promise that the nonce remains valid.

## Bind Failure

A bind path resolves an identity that cannot complete a public session. It must redirect/return with bind failed,
not bind success plus an unusable handoff. The Me page retains its existing feedback owner.

## Legacy Direct Callback

A direct client requests JSON and applies a public auth payload only on success. After it reads inbound code/state,
it immediately clears pending-sensitive URL values, then on failure clears pending/trace while retaining a safe
error presentation. It does not participate in the navigation nonce gate.
