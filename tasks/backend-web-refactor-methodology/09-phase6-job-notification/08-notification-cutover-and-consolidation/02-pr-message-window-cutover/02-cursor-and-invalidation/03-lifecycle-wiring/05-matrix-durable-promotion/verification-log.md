# `6-3.2b-3.5` Verification Log

## Lifecycle matrix

The matrix remains split by source fact so each assertion retains a small,
reviewable fixture rather than hiding different locks and eligibility branches
in one mega-scenario.

| Entrance / invariant | Evidence |
| --- | --- |
| self exit, admin release, temporal unconfirmed release, content-conflict release; recipient precision and rejoin no-replay | `pr-participant-message-window-release.scenario.test.ts` |
| manual `CLOSED`, temporal `CLOSED` / `EXPIRED`, no terminal-source reopen, generic and concrete drain fences | `pr-terminal-attention-fences.scenario.test.ts` |
| tombstone visibility/cursor/repeated `404`, root cascade, transactional rollback | `pr-admin-message-window-lifecycle.scenario.test.ts` |
| serialized `CLEAR` / restore and no historical replay | `pr-message-window-invalidation-foundation.scenario.test.ts` |
| generic runtime `43101` → canonical clear → held release → restore/no replay | `pr-message-generic-revocation.scenario.test.ts` |
| authenticated controller command delegation and historical concrete drain isolation | `wechat-notification-subscription.test.ts` |

## Final local gates

All completed on 2026-07-22:

- `pnpm test:scenario:backend` — 43 files / 136 tests passed.
- `pnpm test:unit:backend` — 108 files / 496 tests passed.
- `pnpm check:type:backend`, `pnpm check:lint:backend`, and
  `pnpm check:build:backend` passed.
- Targeted new-test Oxfmt check passed.
- `git diff --check` passed.

## Reverse-edge audit

The following searches returned no direct Job/private-key edge in PR, POI,
admin PR-type, admin PR-management or the WeChat subscription controller:

```text
createTransactionBoundJobWriter | JobRepository | jobRunner |
notification.send.v1 | prMessageSummaryCreationKey | infra/jobs
```

The named lifecycle sources also returned no legacy inbox/wave/opportunity/
delivery/concrete-scheduler write. The remaining expected compatibility paths
are classified rather than hidden:

- `pr-message-unread-wave.service.ts` owns the historical Wave/Opportunity/
  inbox source but has no non-test caller;
- `wechat-pr-message.ts` plus `pr-message-dispatch.service.ts` remain the
  concrete historical Job drain, including delivery evidence;
- the authenticated controller calls concrete cancellation only on `CLEAR`;
- PR message list/read-marker still use inbox rows only for old-client
  compatibility until the `6-3.3` retirement gate; current Web uses the
  semantic acknowledgement route; and
- `notification_deliveries` remains until `6-5` observability proof.

## Durable promotion

Promoted current/target facts:

- `docs/20-product-tdd/architecture-objectives-and-decision-rules.md`
- `docs/20-product-tdd/unit-topology.md`
- `docs/20-product-tdd/system-state-and-authority.md`
- `docs/20-product-tdd/notification-contracts.md`
- `docs/20-product-tdd/pr-messaging-contracts.md`
- `docs/20-product-tdd/pr-lifecycle-contracts.md`
- `docs/10-prd/behavior/rules-and-invariants.md`

The promotion deliberately left visible Web ACK/read-marker migration and
legacy-state retirement for their separately named `6-3.2c` / `6-3.3` slices.
`6-3.2c` is now locally complete; only legacy-state retirement remains.
