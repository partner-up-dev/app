# `6-3.2a-2` Rehearsal

- The helper owns one message transaction only; it is not a reusable database
  callback for arbitrary PR work.
- It locks the PR before locking active slots in slot-id order. Admission
  already locks the PR; exit writes wait on the locked active slot, so the
  roster passed to Notification is one coherent observation.
- A failed Job reservation means no externally visible message, preventing an
  uncovered cursor.
- The failure probe writes a real generic reservation before throwing, so its
  assertion proves rollback of both persistence effects rather than merely a
  pre-write exception.
- Unavailable provider-template configuration is a Notification eligibility
  result, not a PR-message persistence error: the message can commit without a
  held reservation.
- Operation logs occur after commit and cannot make a partial write valid.
