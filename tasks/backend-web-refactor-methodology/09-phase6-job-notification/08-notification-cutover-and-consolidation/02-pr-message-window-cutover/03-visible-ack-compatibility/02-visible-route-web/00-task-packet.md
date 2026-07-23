# `6-3.2c-2` — Visible Route Web Flow

## Status

**Locally complete.** See [`verification-log.md`](./verification-log.md) for
the workflow/unit/static evidence.

## Objective

Make the dedicated messages route the sole new-client attention acknowledgement
initiator without turning it into read-marker/inbox behavior.

## Scope

- typed PR-domain acknowledgement mutation;
- a testable PR route workflow for mount, render commit, document visibility,
  one same-cursor retry and later visibility retry;
- page-only opt-in and stable route/thread test IDs;
- removal of Web's automatic `/read-marker` call and its implementation-facing
  warning from `PRMessageThread`.

## Non-Goals

- deleting the backend legacy endpoint or legacy response fields;
- acknowledging a cached/hideable query result before the component renders;
- a shared browser visibility abstraction with PR semantics;
- user-visible read/unread state.

## Exit

The Web page waits until it is mounted, rendered and visible before posting the
response cursor. No other current PR page mounts the workflow; a failed first
post retries the same cursor exactly once without optimistic acknowledgement.
