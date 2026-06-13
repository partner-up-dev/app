# Type Entry Prerequisite

## Target

- Local owner: `apps/frontend/tsconfig.json`,
  `apps/frontend/src/types/design-web-runtime.d.ts`, and
  `apps/frontend/src/types/design-web.d.ts`.
- Package target: `@partner-up-dev/design-web` root types and exported
  component registry.
- Desired final state: named imports use package declarations instead of the
  local broad shim.

## Current Contract

- `@partner-up-dev/design-web/styles` and `@partner-up-dev/design-web/uno` are
  already consumed.
- `tsconfig.json` no longer maps the package root to a local type adapter.
- The runtime shim previously exposed four components and used broad
  `DefineComponent<Record<string, unknown>, ...>` typing.
- The current frontend resolves package root named imports through
  `@partner-up-dev/design-web@0.4.0` package declarations.

## Migration Shape

- From: package root import is type-shadowed by a broad local compatibility
  file.
- To: package root import resolves through the package `exports` /
  `types` declarations.
- Compatibility strategy: keep the style and Uno ambient declarations only if
  the package still lacks consumable declarations for those subpaths.

## Risks

- Package declarations may surface real type errors hidden by the shim.
- The package exports `version` as `"0.1.0"` in `dist/index.d.ts`; do not use
  that constant for release truth. A fresh registry tarball for
  `@partner-up-dev/design-web@0.3.0` has the same mismatch. Registry `0.4.0`
  fixes this with `dist/version.d.ts` declaring `"0.4.0"`.
- `skipLibCheck` may hide package-internal declaration issues, but app code
  should still type-check against public component APIs.
- Direct package root declarations currently fail `vue-tsc` because
  `types/components.d.ts` imports `../src/components/*`, while the published
  package lacks the `src/types` and `src/composables` modules those files need.
  Registry verification confirmed this is present in the published GitHub
  Packages `0.3.0` artifact and is not a broken local install. Registry `0.4.0`
  removes this source dependency path and passed a temporary consumer
  `vue-tsc --noEmit` check.

## Verification

- `pnpm --filter @partner-up-dev/frontend build` - passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` - passed.
- `pnpm test:unit:frontend` - passed, 26 files / 117 tests.
- `git diff --check` - passed.
- A source scan proving no production import depends on
  `src/types/design-web-runtime.d.ts`; the file and root alias have been
  removed.
- Installed artifact check: local `node_modules` reports package version
  `0.4.0`, and `dist/version.d.ts` declares `"0.4.0"`.
