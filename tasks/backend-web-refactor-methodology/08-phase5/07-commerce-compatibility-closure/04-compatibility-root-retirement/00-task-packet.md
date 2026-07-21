# 5-6A.4 Compatibility-Root Retirement

## Status

**Complete.** The five legacy Commerce roots (`bill`, `trade`, `payment`,
`ride-hailing`, and `merchandising`) are wildcard convenience barrels. Their
named Commands, Queries, Contracts, and Ports replacements now exist. Before
deletion, a structural import-resolution scan over backend source/tests, root
system scenarios, packages, and scripts found no relative import resolving to
any of the five `index.ts` files; explicit-path search found no direct root
consumer either. Package exports expose only the backend root and the
types-only `./contracts` subpath, neither of which exports these barrels. All
five files are deleted; final AST/import-resolution/textual checks remain zero
and type/lint/build plus complete backend/system scenarios pass.

## Objective

Delete only obsolete wildcard roots after proving there is no active consumer.
This closes a compatibility window; it does not create a replacement umbrella
API or change owner behavior.

## Guardrails

- Keep category entrypoints explicit; do not replace a deleted root with a new
  wildcard barrel.
- Search both literal `domains/<owner>` paths and relative imports that resolve
  to an `index.ts`; literal search alone is insufficient.
- Include source, tests, scenarios, scripts, packages, and package export
  reachability in the preflight.
- A type/build failure means restore the compatibility assessment in the
  packet, not an ad-hoc new root export.

## Verification

1. AST import-resolution scan has zero consumers for each root, followed by a
   textual dynamic-import/CommonJS backstop.
2. Remove the five files only.
3. Re-run the resolution scan, backend type/lint/build, and the focused
   RideHailing/CreateOrderAttempt scenarios that characterize the new named
   surfaces.
