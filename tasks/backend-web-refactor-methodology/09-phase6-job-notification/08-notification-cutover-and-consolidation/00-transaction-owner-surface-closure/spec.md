# `6-3.1h` Target Surface

## Current Versus Target

| Concern | Current leak | Target owner surface |
| --- | --- | --- |
| source transaction | PR/POI/admin owns a locked `TransactionExecutor` | unchanged |
| generic Job writer | source imports `infra/jobs` and passes a writer through Notification | Notification constructs it from the provided executor |
| task type/key/policy | Notification mostly owns it, but source observes Job factory mechanics | Notification-only |
| test injection | source-facing factory shapes are forced to expose writer | a Notification-private writer-injected adapter is testable; public factory accepts executor |

## Required Public Shapes

Each source-facing factory has an input object containing `executor` plus only
template/source-specific configuration. Examples:

```text
createTransactionBoundNewPartnerNotificationPort({ executor })
createTransactionBoundPRReadyNotificationPort({ executor })
createTransactionBoundMeetingPointUpdatedNotificationPort({ executor })
createTransactionBoundPRMessageSummaryNotificationPort({ executor, isChannelConfigured? })
createTransactionBoundWaitlistPromotionNotificationPort({ executor })
```

The exact TypeScript naming may differ only to keep existing public semantics
clear; it may not accept `JobTransactionWriter` on the curated source surface.

## Invariants

1. The writer is constructed with the same executor that owns the source
   transaction; no post-commit queue call is introduced.
2. Source code supplies business facts/roster/causation only; it cannot select
   Job type, version, dedupe or reservation representation.
3. Notification's private adapter can still use a fake writer in a focused
   unit test without becoming a root export.
4. The source reverse-edge audit is zero-reference rather than a new
   exception allowlist.
