# 4-3.3 Rehearsal

A Backend test manually follows login, mock authorize, callback navigation, and handoff with its own cookie jar.
It changes the resolved user before handoff and proves no public token is returned. A Web test supplies a received
terminal RPC response and observes nonce cleanup plus new-login action selection. Together they prove the contract
without pretending the Vite proxy exercised browser cookie isolation.

If the browser harness is adjusted to use a distinct API origin, it must retain the real credentialed fetch path
and let the browser own cookies. If it instead routes API calls through the frontend origin, its result is marked
same-origin plumbing only and cannot close the deployment topology gap.
