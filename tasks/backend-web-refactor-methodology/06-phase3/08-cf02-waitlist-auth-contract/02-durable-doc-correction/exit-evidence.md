# 08B Exit Evidence

## Correction

`docs/20-product-tdd/pr-lifecycle-contracts.md` now states that successful waitlist returns the refreshed public PR
view only; if session rotation is issued, it uses the shared `x-access-token` response header and no auth/session
payload is present in the body.

The wording is deliberately aligned with the Session Contract in
`docs/20-product-tdd/cross-unit-contracts.md`, not a waitlist-specific exception. The source-backed rationale is
08A's [`trace-report.md`](../01-trace-characterization/trace-report.md).

## Verification

```text
Focused durable search for waitlist + "auth payload"
PASS — no stale waitlist body-auth claim remains in docs/10-prd, docs/20-product-tdd or docs/30-unit-tdd

Focused cross-check
PASS — lifecycle contract says PublicPR-only body / x-access-token rotation;
       Session Contract forbids auth/accessToken/role/userId in command bodies

git diff --check
PASS
```

The repository formatter excludes this Markdown file, so `git diff --check` plus focused wording/diff review are the
available format-safety checks. No runtime, type, schema, Web transport, or API-contract code changed in 08B.
