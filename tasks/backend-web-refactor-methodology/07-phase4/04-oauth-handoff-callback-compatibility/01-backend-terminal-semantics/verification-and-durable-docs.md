# 4-3.1 Verification And Durable Docs

## Focused Proof

- Healthy navigation/direct response remains successful for an active public authenticated user.
- Changed-to-operator and inactive/missing cases return 403 Problem Details with
  WECHAT_OAUTH_PUBLIC_IDENTITY_NOT_ALLOWED, omit auth/accessToken/x-access-token, send no-store, and never expose
  an issuer stack/message.
- A second exchange with the same nonce fails as one-shot replay.
- Bind failure carries failed rather than success feedback.

## Promotion Input

This subtask alone does not promote documentation. It supplies the Backend half of the terminal-nonce rule. The
rule is promotable only after the Web client demonstrates the corresponding recovery transition.

## Result

The focused scenario now covers healthy navigation handoff, a role change before exchange, one-shot replay, direct
JSON success and expected rejection, plus bind failure. All expected rejected responses omit `x-access-token`; the
handoff response is Problem Details/no-store and direct callback retains its legacy body. Combined with 4-3.2,
this result was promoted to the OAuth handoff Unit TDD.
