# 06C.1 rehearsal — PR Discovery value migration

1. Re-run the exact inventory probes and freeze the declaration/inline count for the listed paths.
2. Confirm every target symbol is exported by `@partner-up-dev/backend/contracts`; retain `PRId` at the root in
   `usePRCreate.ts` and keep 06B query facades untouched.
3. Change only type-only specifiers in the listed files to the contracts entry. Preserve inline type guards and
   local aliases; do not introduce a runtime package edge.
4. Re-run focused `rg` probes: zero root imports for the listed safe symbols, one intentional `PRId` residual, and
   no new `client`/`Infer*` edge in model/UI/process files.
5. Run the focused PR Discovery/model tests, `pnpm check:type:web`, `pnpm check:build:web`, and `git diff --check`.

Fork/stop if route JSON, OAuth replay storage, route application behavior, emitted JavaScript, or 06B facade
consumers change. The cheapest rollback is reverting only this family's type-specifier edits.
