# 07D Browser A — execution-time preflight packet

Date: 2026-07-17
Mode: read-only execution-time rebaseline (no application/test/durable-doc mutation)

## Objective

Freeze the current Web seams for Browser A: a PR create command must authenticate before any create POST. An
anonymous command opens an honest disclosure and stops; only explicit confirmation starts the existing WeChat OAuth
redirect. Cancel leaves in-memory editor state unchanged. Full OAuth redirect may lose that state. There is no
anonymous PR row, Save Draft affordance, durable structured local draft, pending create intent, or automatic
post-OAuth create replay.

## Owned files

Only this task-local folder is owned by this preflight:

- `00-task-packet.md`
- `entry-inventory.md`
- `test-strategy.md`
- `implementation-shape.md`
- `rehearsal.md`
- `evidence-report.md`

Application source, tests, locale files, durable docs, and the parent 07D packet are read-only inputs.

## Accepted policy and command owners

The gate must cover all four create command owners:

1. structured `PREditor` on `/pr/new?mode=form`;
2. full-page `NLPRForm` on `/pr/new?mode=nl`;
3. home `InlineNLPRForm`;
4. `PRDiscoveryPanel` direct create paths (form, list/card create, no-match fallback, and zero-candidate create).

The two existing create RPCs remain the only durable writes: `/api/pr/new/form` and `/api/pr/new/nl`. Authenticated
submission keeps its normal one-command behavior and returns an `OPEN` PR where applicable.

## Entry status

- Current source still performs bootstrap-only auth and can call a create mutation while anonymous.
- Structured create still exposes `pr-create.save-draft` and copy promising a saved draft.
- Discovery still writes/reads/replays `PR_DISCOVERY_CREATE` through WeChat pending-action storage.
- Existing natural-language raw text persistence remains allowed; it must not become a pending create/replay.
- Focused and full Web unit baselines pass at this snapshot; see `evidence-report.md`.

## Stop conditions

Stop and reopen product/security design if implementation needs a pre-auth server row, capability URL, cross-device
recovery, a new server draft API, automatic replay, or an OAuth protocol/global session redesign.
