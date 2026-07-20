# Route Guard Cancellation Verification

- `pnpm exec vitest run --project frontend-unit apps/web/src/processes/wechat/route-wechat-auto-login.test.ts`:
  1 file / 7 tests passed. It includes delayed bootstrap, a newer `beforeEach` epoch, and proof that the older
  `/bills` attempt neither marks storage nor invokes OAuth.
- `pnpm check:type:web`: passed.
- `pnpm test:unit:web`: 57 files / 194 tests passed.
- `pnpm check:type`, `pnpm check:lint`, `pnpm check:build`, and `git diff --check`: passed in the parent review.

The test intentionally stays a process/fake-router proof. It does not manufacture a browser/provider topology claim;
the existing System canonical-host boundary remains unchanged.
