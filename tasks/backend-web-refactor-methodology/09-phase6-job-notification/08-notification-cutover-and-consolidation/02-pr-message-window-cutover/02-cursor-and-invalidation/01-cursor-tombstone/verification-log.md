# `6-3.2b-1` Verification Log

## Result

`pr_messages.deleted_at` is now the retention boundary for a hidden message;
ordinary repository/thread/notification-context queries exclude it, while the
new acknowledgement cursor deliberately continues to see its PR-local ID. The
legacy read marker remains a separate compatibility field and has not become a
semantic Job acknowledgement.

## Focused Proof

- Real Postgres creates two messages, tombstones the high-water, and proves:
  - visible repository and HTTP thread list contain only the lower message;
  - `latestVisibleMessageId` is the lower ID;
  - `acknowledgementCursor` is the tombstoned higher ID;
  - ordinary lookup hides the tombstone while the named cursor lookup retains
    it.
- The existing producer scenario proves both participant and admin immediate
  create responses expose the newly created ID as `acknowledgementCursor`.
- Unit proof keeps `hasUnread` bound to legacy visible/read markers even when
  the acknowledgement cursor is higher.

## Commands And Results

| Command | Result |
| --- | --- |
| `pnpm db:next-migration drizzle` | passed; allocated `0093` |
| `pnpm db:lint && pnpm db:check` | passed |
| focused PR thread unit test | passed: 1 file / 6 tests |
| cursor/tombstone + producer real-Postgres scenarios | passed: 2 files / 2 tests |
| `pnpm check:type:backend` | passed |
| `pnpm check:lint:backend` | passed |
| `pnpm check:build:backend` | passed |
| targeted `oxfmt --check` and `git diff --check` | passed |

## Compatibility Carried Forward

- Current admin message delete still performs a physical delete. It is not
  switched in this child because doing so without the Notification release
  transaction would only change how a held-window leak presents.
- Current `GET` and `POST /read-marker` still read/write
  `pr_message_inbox_states`; `6-3.2c` has since completed the semantic visible
  ACK and its public HTTP behavior, while `6-3.3` retains compatibility
  removal.
- Historical concrete `wechat.notification.pr-message` rows still drain through
  their legacy handler until `6-3.3` proves retirement conditions.
