# OAuth `openid` Normalisation Exit Evidence

- The active provider session trims a valid `openid` and rejects missing/whitespace-only values before returning a
  session to any callback branch.
- Login, bind, anonymous-upgrade, lookup, and create-user branches continue to consume that one valid session value;
  no deleted facade is reintroduced.
- User-info response identity is normalised before matching the session identity; mismatch remains a provider error.
- The stable provider-boundary rule is promoted to the OAuth Unit TDD after focused and full Backend proof.
