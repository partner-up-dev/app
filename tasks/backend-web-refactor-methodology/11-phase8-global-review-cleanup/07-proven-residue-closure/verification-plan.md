# `8-6` Verification Plan

## Endpoint Proof

- Admin login/session tests and System entry journey;
- PR preview pure-projection/component tests;
- Share query/command and user-flow tests;
- architecture fitness, expecting only explicitly retained exceptions.

## Compatibility Proof

- source/doc/config/dynamic reference audit per ledger row;
- package/public-path check where relevant;
- focused runtime/schema tests for any Job compatibility retirement;
- migration forward-only proof if a column is removed; and
- no provider-facing deletion without external evidence.

## Control-plane Proof

- relative Markdown link validation;
- status/provenance consistency search;
- explicit external/future labels; and
- `git diff --check` plus scoped worktree inspection.
