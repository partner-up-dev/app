# OAuth `openid` Normalisation Verification

- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/services/WeChatOAuthService.test.ts`:
  1 file / 4 tests passed.
- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/controllers/wechat-oauth-return-to.test.ts`:
  1 file / 4 tests passed.
- `DATABASE_URL=postgresql://unit:unit@localhost:5432/unit pnpm test:unit:backend`:
  85 files / 383 tests passed.
- `pnpm test:scenario:backend`, `pnpm check:type`, `pnpm check:lint`, `pnpm check:build`, scoped formatting, and
  `git diff --check`: passed in the parent review.
