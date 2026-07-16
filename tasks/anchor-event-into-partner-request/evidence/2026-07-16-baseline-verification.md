# Baseline Verification — 2026-07-16

## Purpose

Record the pre-mutation test baseline for the AnchorEvent removal. These results distinguish implementation regressions from existing environment failures.

## Passing Baselines

| Layer | Command | Result |
|---|---|---|
| Backend unit | `pnpm test:unit:backend` | PASS — 68 files, 314 tests. |
| Web unit | `pnpm test:unit:web` | PASS — 38 files, 162 tests. |
| Backend scenario | `pnpm test:scenario:backend` | PASS — 26 files, 82 tests. |

The first command was invoked with a focused path argument, but the configured Vitest project ran the complete backend unit suite. The counts above therefore describe the full project result rather than a focused subset.

## System Scenario Baseline Blocker

Attempted command:

```text
pnpm test:scenario:system -- tests/scenario/anchor-event
```

No product scenario executed. Two pre-test issues occurred:

1. the supplied path did not match the system Vitest project's configured root, so the runner reported no matching test files;
2. system-test configuration loading failed through UnoCSS because the optional native OXC parser binding was unavailable: `@oxc-parser/binding-linux-x64-gnu` / `parser.linux-x64-gnu.node`.

This is an environment/dependency baseline failure, not evidence about AnchorEvent behavior. The root package manifests and lockfile were already modified outside this task, so this task did not run an install or mutate dependency state to repair it.

## Repository State Protected During Verification

The following pre-existing changes are outside this task and must remain untouched:

- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tasks/backend-web-refactor-methodology/`
- `tasks/project-node-runtime/`

## Follow-up Gate

Before claiming the system-scenario gate:

1. restore or install the platform OXC parser binding without overwriting unrelated package work;
2. invoke the scenario project with a path relative to its configured root, or run the complete `pnpm test:scenario:system` project;
3. record matched/no-match/create/join behavior for the new `/prd` journey.
