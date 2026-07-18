# 4-2 Rehearsal

## Backend Request Sequence

```text
Bearer JWT -> JWT integrity/expiry -> subject present?
  no  -> anonymous transport
  yes -> User canonical public projection
           active anonymous/authenticated -> preserve or renew matching public JWT
           missing/disabled/operator-only -> anonymous-without-user transport
-> controller receives one public request identity -> response emits x-access-token
```

The database query is intentionally before controller authorization. A protected controller continues to issue its
existing `401` behavior for anonymous identity; a public read continues as anonymous rather than receiving a new
transport-specific failure.

## Browser Sequence

```text
OAuth callback/handoff pending? -> defer unchanged
no token + no UUID             -> register once -> apply full public session -> done
otherwise                      -> /auth/session
  200                          -> apply full public session -> done
  401                          -> clear public session -> register once -> apply -> done
  other failure                -> retain current projection -> done without loop
```

## Failure Checks

- An old anonymous token after WeChat upgrade becomes authenticated only when current User state says so.
- A disabled user cannot use an unexpired public token to reach `/me` or bootstrap authenticated state.
- An operator token cannot be projected into public localStorage, but admin storage and middleware remain untouched.
- A stale UUID is cleared before replacement, so no previous user ID survives the recovery.
- Header rotation updates the only token projection; no Pinia token copy remains stale.

## Observed Outcome

The focused backend scenarios exercised active, disabled, anonymous-to-authenticated and public-to-operator state
transitions. The Web coordinator exercised all four planned branches. The real browser scenario proved fresh
registration, UUID-only recovery after token removal, and immediate fresh-identity replacement after the persisted
anonymous row was disabled.
