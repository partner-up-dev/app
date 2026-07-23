# `6-3.2a-3` Rehearsal

- Participant calls map to `ACTIVE_PARTICIPANT`; admin-system and
  content-generated system-context calls map to `OPERATOR_OR_SYSTEM`. Their
  source prechecks remain outside the named transaction. The adapter rechecks
  only a participant-post author under the locked roster; content must not add
  that recheck after its independently committed mutation.
- A current generic source writes no new inbox, wave, opportunity, Delivery or
  concrete Job, even while the old handler remains registered. Only the
  participant create response uses a synthetic read projection.
- M1 creates one HELD window; M2 coalesces it and raises high-water. Terminal
  execution does not release HELD; stale ACK is ignored, covering ACK releases,
  and a later source message reopens a new generation.
- Configured eligible recipients receive reservations; missing channel,
  missing OpenID/inactive account and no credit receive none.
- A content-generated message runs in an independent transaction after the
  content mutation has committed and never re-runs that mutation on message
  retry.
- A final source search distinguishes retention of old handler code from a new
  caller, and a historical fixture proves the inbox-dependent concrete row
  still drains. This compatibility drain cannot masquerade as cutover
  incompleteness.
- Stop if any test or implementation describes this slice as HTTP semantic ACK;
  that contract belongs to the later visible-ACK child.
