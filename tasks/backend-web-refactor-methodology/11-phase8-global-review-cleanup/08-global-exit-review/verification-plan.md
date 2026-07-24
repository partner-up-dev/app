# `8-7` Verification Plan

## Canonical Gates

- architecture fitness twice plus its unit tests;
- `pnpm check:static`;
- `pnpm test:unit:backend`;
- `pnpm test:unit:web`;
- `pnpm test:scenario:backend`;
- `pnpm test:scenario:system`;
- `pnpm check:dead-code` and `pnpm check:security` as report-first evidence; and
- Web/Backend builds as owned by the canonical static/build scripts.

## Documentation And Provenance

- Markdown relative links;
- durable current/target terminology audit;
- migration/reference ledgers;
- `git diff --check`;
- scoped diff review by slice; and
- final status proving independent Node/Oxc/quality task changes remain
  unstaged and independently dirty/untracked; no byte-history claim is made
  without an entry hash.

An external provider or deployment probe is not a Phase 8 exit gate unless its
separate owner explicitly brings it into scope.
