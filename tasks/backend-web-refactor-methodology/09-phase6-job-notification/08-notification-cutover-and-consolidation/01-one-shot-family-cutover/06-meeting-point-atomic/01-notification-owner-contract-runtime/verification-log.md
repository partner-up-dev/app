# `6-3.1f-01` Verification Log

## Result

The generic Notification owner can now execute
`pr.meeting-point-updated` without any source-route cutover. The task carries
immutable source event identity, description and timestamp; runtime composition
rechecks current recipient eligibility and maps the existing WeChat template.

## Focused Proof

- Owner unit creates two distinct ONCE_PER_CAUSE tasks for two UUIDs at the
  same timestamp, preserves payload facts in prepared rendering, skips an
  exited participant before I/O/credit, and performs generic permission
  cleanup after a known revocation.
- Prepared channel unit maps configured provider fields, rejects an
  unconfigured template before calling the provider, and classifies WeChat
  43101 as recipient-permission revocation.
- The runtime uses the preference-preserving meeting-point credit repository
  primitive; a generic accepted send does not silently convert exhausted
  credit into an opt-out.

## Commands And Results

| Command | Result |
| --- | --- |
| `pnpm exec vitest run apps/backend/src/domains/notification/owner/meeting-point-updated-notification-owner.test.ts apps/backend/src/infra/notifications/channels/wechat-subscription.adapter.test.ts` | passed: 2 files / 18 tests |
| `pnpm check:type:backend` | passed |
| `pnpm check:lint:backend` | passed |
| focused `oxfmt --check` | passed |

## Deferred To The Next Source Slices

No business source currently requests the generic template. Transaction-local
effective resolution, source eligibility/fan-out and atomic source writers
remain the responsibility of sub-tasks 02 through 05.
