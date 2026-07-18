# 08B — Durable-doc Correction

## Objective

Correct the stale waitlist durable statement so it specifies a refreshed public PR response body and optional
`x-access-token` session rotation, with no auth/session payload in the domain body. Make no runtime or typed-contract
change.

## Owned Surface

- The exact stale PR lifecycle statement frozen by 08A and the minimum directly related cross-reference needed for
  coherent wording.
- Task-local before/after wording and promotion evidence.

Backend/Web runtime, AppType, response schemas, session mechanics and unrelated durable cleanup are outside 08B.

## Entry Information

- 08A confirms current runtime matches the accepted header-only contract and identifies the exact stale line.
- Recheck the authoritative shared session-transport wording immediately before editing.
- Freeze the smallest durable diff that says: body equals refreshed public PR; optional rotation equals
  `x-access-token`; no body auth/session keys.
- Preserve existing waitlist behavior and notification side effects; this is a factual correction, not a product
  fork.

## Fork / Stop Conditions

- If 08A finds runtime drift, stop documentation correction until the contract/security issue is resolved.
- If correction requires a waitlist-specific auth exception or response version, stop and reopen CF-02 intent.
- If another durable document contains a materially different authority claim, record it and expand ownership only
  through the repository's alignment process.
- If runtime/AppType/Web changes appear necessary, leave them to a separately authorized slice; none are expected.

## Low-cost Verification

- Focused search proves the stale “auth payload” waitlist claim is gone and no contradictory body-auth statement
  remains in the frozen durable scope.
- Diff review proves only the directly owned durable wording changed.
- Documentation link/format checks pass.
- Cross-check the final sentence against 08A's body/header sequence trace.

## Status

Complete. 08A confirms runtime alignment; the one stale lifecycle sentence is corrected and focused
contradiction/diff verification is recorded in [`exit-evidence.md`](./exit-evidence.md). No runtime, typed-contract,
session or API-version change was made.
