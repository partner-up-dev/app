# `6-3.2b-1` Plan — Complete

1. Completed: used `pnpm db:next-migration drizzle`, which allocated `0093`,
   then added nullable `pr_messages.deleted_at`. No existing `0089`–`0092`
   migration was modified.
2. Completed: normal thread/list/window repository reads filter tombstones;
   `findLatestAcknowledgementCursorByPrId` and
   `findByPrIdAndIdIncludingTombstone` name the intentional all-row path.
3. Completed: thread/create/read-marker responses carry
   `acknowledgementCursor` while `latestVisibleMessageId`, legacy
   `lastReadMessageId`, and `hasUnread` retain their old compatibility meaning.
4. Completed: a real-Postgres scenario tombstones the high-water and proves
   visible thread state drops to the lower item while the cursor remains
   covering. Full command evidence is in `verification-log.md`.
