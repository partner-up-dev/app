# `8-6.1` Verification Log

Date: 2026-07-24

## Result

- `useAdminLogin` remains the Hono-inferred transport owner and now decodes
  non-success bodies with a stable caller-supplied fallback, including
  non-JSON gateway responses.
- `useAdminSessionLogin` owns successful response-to-session application.
- Ordinary Admin login and BI entry both use that workflow. Their redirect
  selection remains page-owned route context.
- BI preserves `code` to fixed Analytics seed user mapping and its
  `admin-analytics` destination.

## Focused Proof

- Admin login query and session workflow: `2 files / 3 tests`, passed.
- Focused Oxfmt and Oxlint passed.
- Direct search found no `adminClient.api` or `admin-rpc` reference in
  `AdminLoginPage.vue` or `BIEntryPage.vue`.
- `git diff --check` passed for the owned batch.

The `8-6` integrated type/lint and Admin System proof subsequently passed; see
[`../verification-log.md`](../verification-log.md).
