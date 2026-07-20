# 4-4 Mental Rehearsal

## Happy Path: PR Waitlist

1. Anonymous visitor chooses waitlist and a reminder preference.
2. Backend returns `401/AUTHENTICATED_REQUIRED` before the write.
3. RPC reports the response and starts a cancellable fallback, not navigation directly.
4. Waitlist adapter writes `{ kind: PR_WAITLIST, prId, alternativePrReminderOptIn }`, then claims the same response.
5. The claim cancels fallback and starts one OAuth login. Callback/handoff returns to the same PR URL.
6. Gate applies authenticated session before route content mounts. PR page waits for data/handler readiness.
7. Dispatcher clears exactly one pending entry immediately before the waitlist handler. The handler restores its
   preference into the gate; the user completes the resumed UI flow.

## Branches

- A protected command with no continuation does not claim; fallback starts OAuth after the current task and no
  storage entry is manufactured.
- A `WECHAT_BIND_REQUIRED` response follows bind flow; it is not mistakenly claimed as an authenticated-required
  fallback.
- Expired, malformed, mismatched-PR, or handler-not-ready entries remain/clear according to existing validation and
  readiness rules; no action is invoked for another PR.
- Handler failure leaves no pending retry. The canonical Backend read/next explicit user action decides subsequent
  state.
- A terminal or uncertain OAuth handoff remains governed by 4-3: terminal recovery clears the nonce, transport
  uncertainty may retry it. 4-4 never makes a new cookie or URL claim.

## Rollback Boundary

All runtime changes are browser code. The response-report port can be unregistered, and command adapters retain
their normal error handling. No migration, durable entity mutation, token format, or backend route contract changes.
