# 4-3.2 Execution Plan

1. Define a discriminated handoff outcome that separates consumed, received terminal 4xx/malformed response, and
   network-or-5xx transport uncertainty without exposing credentials.
2. Update the gate state machine. A terminal outcome clears the address-bar nonce while retaining the gate;
   fresh login uses the existing OAuth login owner with the centrally normalized return path. A transport outcome
   retains the nonce and existing retry affordance.
3. Keep visitor continuation as an explicit abandonment path that clears pending/trace and unblocks bootstrap.
4. Centralize returnTo normalization at the OAuth login process. Make direct callback failure clear pending/trace
   and scrub code/state from the browser address bar before rendering its safe localized error. Do not apply an
   auth projection on failure.
5. Add focused process/page tests before broader build checks.

## UI Design Constraint

Retain PuButton for recovery actions. If the terminal state needs a status component beyond the existing page
copy, use the public PuInlineNotice API rather than styling a private design-system primitive.
