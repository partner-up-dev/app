# Semgrep Local State

## Installation

- Installed Semgrep `1.166.0` through PDM global project on 2026-06-16.
- Command used: `pdm add -g semgrep==1.166.0`.
- PATH location: `C:\Users\yyh\AppData\Local\Programs\Python\Python314\Scripts\semgrep.exe`.
- `semgrep --version` returns `1.166.0`.

## Current Report

`pnpm check:security` now performs a real local Semgrep scan. It remains report-only through `lint:security:report`.

Current findings:

- `apps/backend/src/lib/build-metadata.ts`: reviewed `execSync` boundary.
- `apps/frontend/vite.config.ts`: reviewed `execSync` boundary.
- `apps/frontend/src/shared/ui/sections/APRNotificationSubscriptions.vue`: two `v-html` occurrences that need trusted-template/sanitization review.
