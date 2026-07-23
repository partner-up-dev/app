# `6-3.2b-2` Rehearsal

- Release must work after a terminal handler result because terminal execution
  intentionally leaves `UNTIL_ACKNOWLEDGED` reservation state held.
- A running call cannot be recalled. Releasing before it reaches its provider
  fence skips it; releasing during I/O only prevents later reservation effects.
- Job locks the creation-key identity before reading the held row. A prefix
  implementation must not scan once and release without serializing the keys it
  finds, or a concurrent source can recreate an old window in the gap.
- The option row is the only shared availability serialization point. Do not
  make a PR source use an unlocked snapshot while a controller mutates the
  same user's credit in another transaction.

## Outcome

The real-Postgres race proves the intended order: a clear waits while the
source holds the recipient option row; after the source commits its held
window, clear owns that same row and releases it before its own commit. Prefix
enumeration remains intentionally weaker than an imaginary prefix lock, so it
is used only under that option-row protocol. Re-enabling removes an old held
generation but creates no catch-up Job.
