# AGENTS.md of PartnerUp Flutter Placeholder

This subtree is reserved for future Flutter work.

## Current Status

- This is a boundary placeholder, not a runnable Flutter project.
- Do not add `pubspec.yaml`, generated platform directories, runtime code, or CI requirements until native-app responsibility, API boundary, and validation path are explicit.
- Do not copy the Web implementation from `apps/web` as a migration shortcut.

## Ownership

- Product behavior belongs in `docs/10-prd/`.
- Cross-unit technical contracts belong in `docs/20-product-tdd/`.
- Task-local investigation and migration evidence belongs under `tasks/`.
- Shared API contracts, generated Dart clients, product-core rules, or design tokens should live under `packages/` only after a concrete owner and consumer exist.

## Before Future Edits

- Read the root `AGENTS.md`.
- Create or update a task packet for non-trivial work.
- Explicitly state whether Flutter is the primary native app, an experiment, or a platform-specific companion.
- Define the verification command before adding runtime files.
