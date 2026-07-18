# 4-3.2 Rehearsal

On initial mount, the gate sees a nonce and suppresses the application slot. A successful consumed result stores
the auth projection, clears nonce/pending/trace, then allows bootstrap. A received 4xx or malformed successful
body clears nonce/pending/trace and stays on a terminal gate view. Pressing fresh login calls the existing login
owner with a centrally normalized current return target, generating a new transaction.

If fetch throws or the Backend returns 5xx, the gate leaves the route untouched and displays retryable wording.
Visitor continuation removes the nonce and unblocks the app. For the legacy page, code/state are captured once,
then removed before its callback request; the error view remains on the callback route and cannot accidentally
retry with credential-bearing query parameters.
