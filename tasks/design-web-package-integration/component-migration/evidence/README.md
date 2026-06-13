# First Slice Evidence

## Commands

- `pnpm --filter @partner-up-dev/frontend build` - passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` - passed.
- `pnpm test:unit:frontend` - passed, 26 files / 117 tests.
- `git diff --check` - passed.

## Browser Smoke

Temporary frontend server: Vite on `http://localhost:4001/`.

Mobile viewport: 390 x 844.

- Home brand footer:
  - Screenshot: `home-footer-mobile.png`
  - Computed padding: top `20px`, right `18.72px`, bottom `20px`, left
    `18.72px`.
- PR detail minimal footer:
  - Screenshot: `pr-footer-mobile.png`
  - Computed padding: top `10px`, right `18px`, bottom `18px`, left `18px`.

## Package Type Blocker

Direct package root declarations were tested and failed because the published
package root loads `types/components.d.ts`, which imports source Vue files under
`src/components/*`. Those source files reference `src/types` and
`src/composables`, which are not published in `@partner-up-dev/design-web@0.3.0`.

## Registry Artifact Verification

Fresh command:

- `npm pack --prefer-online --json @partner-up-dev/design-web@0.3.0`

Observed against npm scope registry `https://npm.pkg.github.com`:

- Tarball: `partner-up-dev-design-web-0.3.0.tgz`
- Integrity:
  `sha512-woogyRdecI46FKWlctTpiiU2LEZ+DPHKr7qxVAOmwBsRbq7x/lNjNLyexVo0FyZL7RXOWUbgHOekAeOKlMg7Kg==`
- `package/package.json` reports version `0.3.0`.
- `package/dist/index.d.ts` declares `export declare const version = "0.1.0";`.
- Tarball includes `src/components`.
- Tarball does not include `src/types`.
- Tarball does not include `src/composables`.
- `package/types/components.d.ts` references `../src/components/*`.
- Workspace `pnpm-lock.yaml` has the same integrity for
  `@partner-up-dev/design-web@0.3.0`.

## Registry 0.4.0 Verification

Fresh command:

- `npm pack --prefer-online --json @partner-up-dev/design-web@0.4.0`

Observed against npm scope registry `https://npm.pkg.github.com`:

- Tarball: `partner-up-dev-design-web-0.4.0.tgz`
- Integrity:
  `sha512-LS1Sx+SmpecJQZaFTbuKOJc3rMU5TFCrk4oF4o5a/WvoWAV0VNhsmUr8OLid82Zg3nlAEKDaduUhI9cA+6IorA==`
- `package/package.json` reports version `0.4.0`.
- `package/dist/index.d.ts` exports `version` from `./version`.
- `package/dist/version.d.ts` declares
  `export declare const version = "0.4.0";`.
- Root declarations no longer export `../types/components`.
- Tarball does not include `src/components`, `src/types`, or
  `src/composables`.
- `package/types/components.d.ts` references
  `typeof import('@partner-up-dev/design-web')['PuButton']` style package root
  named exports.
- Temporary consumer installed the `0.4.0` tarball plus Vue, TypeScript,
  vue-tsc, and Sass, then passed `vue-tsc --noEmit` while importing root
  components, `version`, and `@partner-up-dev/design-web/types`.

## Workspace 0.4.0 Upgrade Verification

Production edits after explicit user approval:

- `apps/frontend/package.json` depends on
  `@partner-up-dev/design-web` `0.4.0`.
- `pnpm-lock.yaml` resolves
  `@partner-up-dev/design-web@0.4.0` with integrity
  `sha512-LS1Sx+SmpecJQZaFTbuKOJc3rMU5TFCrk4oF4o5a/WvoWAV0VNhsmUr8OLid82Zg3nlAEKDaduUhI9cA+6IorA==`.
- `apps/frontend/tsconfig.json` no longer aliases
  `@partner-up-dev/design-web` to a local `.d.ts` file.
- `apps/frontend/src/types/design-web-runtime.d.ts` has been deleted.

Verification:

- `pnpm --filter @partner-up-dev/frontend build` - passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` - passed.
- `pnpm test:unit:frontend` - passed, 26 files / 117 tests.
- `git diff --check` - passed.

Runtime smoke:

- Temporary frontend server: Vite on `http://127.0.0.1:4002/`, stopped after
  verification.
- Mobile viewport: 390 x 844.
- Home page loaded without browser page errors.
  - Screenshot: `home-040-mobile.png`
  - Footer padding: top `20px`, right `18.72px`, bottom `20px`, left
    `18.72px`.
- PR detail route loaded without browser page errors and rendered the expected
  no-backend loading state plus footer.
  - Screenshot: `pr-040-mobile.png`
  - Body text: `加载中...`, `我的`, `需要帮助`, `关于`.
  - Footer padding: top `10px`, right `18px`, bottom `18px`, left `18px`.
