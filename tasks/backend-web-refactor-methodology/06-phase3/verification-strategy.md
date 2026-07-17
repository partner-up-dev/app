# Phase 3 Verification Strategy

## Layer Ownership

| Layer | Proof |
| --- | --- |
| Backend unit | Pure rules, validation, contract mapping, isolated use-case behavior |
| Backend scenario | HTTP-facing behavior and persisted transitions against isolated Postgres |
| Web unit | Model/workflow/query adapter/UI state and semantic interaction |
| Root System | Playwright → Vite → real Backend HTTP → isolated Postgres journey |
| Static fitness | Dependency direction, forbidden syntax, public-surface drift, no-new-edge evidence |

## Fitness-rule Policy

- AST rules are used only for structural patterns that can be expressed and tested with positive/negative fixtures.
- Relational ast-grep rules use complete traversal (`stopBy: end`) unless a fixture proves a narrower stop.
- Directory ownership, cross-owner graph and SCC analysis use deterministic import parsing rather than pretending
  AST pattern matching is a full graph model.
- Rules start report-only. Historical findings receive owner/expiry or a migration slice; only new violations may
  become blocking after two deterministic scans and fixture verification.
- `rg` is evidence/support, not automatically a semantic gate.

## Default Slice Gate

1. focused characterization tests;
2. changed-file lint/format and relevant typecheck;
3. target Backend/Web unit or Backend scenario;
4. targeted System journey when both units or browser state are involved;
5. full `pnpm test:scenario:system` before completing a cross-unit slice;
6. Web/Backend build when their production reachability changes;
7. focused import/fitness and scope audit.

## Interpretation

- A build cannot replace a behavior test.
- A unit test cannot replace a Browser→DB journey when both units change.
- Report-first dead-code/security findings do not become blockers without an owner-approved baseline.
- Startup, collection, network test-double and product assertion failures are classified separately before fixing.
- Generated or ignored artifacts are recorded, not confused with source scope.

## Conflict And Phase Exit Gates

- `3-7`/CF-01 requires a product decision, PRD then Product TDD alignment, focused create/auth proof and an
  anonymous `/pr/new` System journey before it can exit.
- `3-8`/CF-02 requires durable wording/runtime agreement, typed response proof, Backend waitlist scenario and a
  focused System journey before it can exit.
- Phase 3 exits with `3-8` only when all eight packets/evidence logs are current, CF-01/CF-02 are resolved,
  fitness reports 0 new findings and relevant focused/full System gates are green. Report-first security/dead-code
  or format NO-SIGNAL states must remain explicitly classified rather than presented as green.
