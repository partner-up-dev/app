# `6-3.2` Mental Rehearsal

- Reservation insert fails: message transaction rolls back and Web cannot see
  an uncovered cursor.
- Messages 10/11/12 commit: one HELD generation reaches high-water 12 even if
  its execution already terminated.
- Visible render through 11 ACKs 11: high-water 12 remains HELD.
- Covering ACK cancels pending execution or releases running/terminal
  reservation; message 13 later opens a new generation.
- Fetch resolves while hidden/pre-render: no ACK. Render while visible ACKs;
  failure allows the same cursor to retry.
- ACK reaches a running handler before provider I/O: recheck skips. If provider
  I/O already began, no exactly-once cancellation claim is made.
- Recipient leaves or PR terminates: window releases/cancels; rejoin does not
  replay absence-period messages, but a new later message can reopen.

## Entry-Rehearsal Corrections

- The old route's read-marker update must not be treated as a generic ACK during
  deployment overlap, because it fires on query availability rather than visible
  render.
- Admin hard deletion of high-water is a correctness branch, not admin-only
  cleanup: target cursor/tombstone behavior enters before Web ACK rollout.
- Existing no-channel/no-credit schedule behavior remains explicit at message
  creation; a missing channel must not create an unreleaseable held window.
