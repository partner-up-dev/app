# `6-3.2b-3.4` Verification Log

## Focused Proof — Complete

- `apps/backend/src/controllers/wechat-notification-subscription.test.ts`
  proves `ADD_ONE` delegates to the canonical Notification command without a
  legacy concrete-job drain, while `CLEAR` runs the command and then the
  separate drain.
- The controller early branch runs before its former direct
  `UserNotificationOptRepository` write; its response maps the canonical
  current snapshot back onto the existing HTTP fields.
- b2's real-Postgres source-vs-clear/re-enable scenario remains the
  behavioral authority for no historical replay. The generic `43101` runtime
  already calls the same canonical Notification command; b3.5 will include it
  in the cross-entrance matrix.

## Commands Reported Passing

- `pnpm check:type:backend`
- focused controller Vitest: 1 file / 2 tests
- OAuth controller regression Vitest: 2 files / 6 tests
- targeted Oxlint
- targeted controller ast-grep audit
- `git diff --check`
