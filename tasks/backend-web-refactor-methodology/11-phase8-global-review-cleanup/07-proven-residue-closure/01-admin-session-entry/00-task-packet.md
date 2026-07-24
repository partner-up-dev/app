# `8-6.1` — Admin Session Entry Owner

## Status

**Complete on 2026-07-24.** Focused source and behavior proof is closed;
root integration still owns the full Web/System gates.

## Objective & Hypothesis

Remove the BI page's direct RPC/session duplication without changing its route
contract. Reusing one Admin login query plus a session-applying use case should
make both ordinary Admin login and BI entry depend on one workflow owner.

## Guardrails Touched

- `BIEntryPage` still maps the route `code` to the fixed Analytics seed user
  and navigates to `admin-analytics` after success.
- Pages own route parsing/navigation and error placement, not transport or
  session payload normalization.
- Request/response types stay inferred from the Hono Admin client.

## Verification

- focused Admin login/session workflow tests;
- source audit: no `adminClient.api` in ordinary pages;
- Web typecheck plus existing Analytics/System entry journey at integration.

See [`verification-log.md`](./verification-log.md).
