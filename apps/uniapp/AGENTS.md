# AGENTS.md of PartnerUp Uni-app Placeholder

This subtree is reserved for future uni-app work.

## Current Status

- This is a boundary placeholder, not a runnable uni-app project.
- Do not add `package.json`, `manifest.json`, `pages.json`, generated scaffolding, runtime code, or CI requirements until product responsibility, target platforms, API boundary, and validation path are explicit.
- Do not copy the Web implementation from `apps/web` as a migration shortcut.

## Ownership

- Product behavior belongs in `docs/10-prd/`.
- Cross-unit technical contracts belong in `docs/20-product-tdd/`.
- Task-local investigation and migration evidence belongs under `tasks/`.
- Shared API contracts, generated clients, product-core rules, or design tokens should live under `packages/` only after a concrete owner and consumer exist.

## Before Future Edits

- Read the root `AGENTS.md`.
- Create or update a task packet for non-trivial work.
- Explicitly state the target platform slice, such as WeChat Mini Program, H5, Android, iOS, or another supported uni-app target.
- Define the verification command before adding runtime files.
