# `6-3.3c` — PR-Message Inbox And API Retirement

## Status

**Ready after current-source reference audit. Old-client/decoder gates are
waived.**

## Objective

Remove the legacy per-viewer inbox/read-marker projection without changing the
target visible-thread semantic acknowledgement contract.

## Scope

- forward migration/archive of `pr_message_inbox_states`;
- removal of the legacy read-marker route/command/repository/entity;
- removal of `lastReadMessageId` / `hasUnread` response fields and their
  synthetic create-response projection; and
- removal of the concrete PR-message handler/decoder.

## Non-Goals

- no replacement unread table or per-viewer receipt;
- no removal of `acknowledgementCursor` or tombstone cursor validation; and
- no replacement compatibility bridge for old clients.

## Exit

Current API/Web behavior uses only visible semantic ACK; no current source or
response needs inbox state.
