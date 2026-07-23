# `6-3.3d` Mental Rehearsal

- A legacy handler still references an Opportunity helper: keep only the narrow
  decoder required to drain and postpone the table drop; do not fake a generic
  replacement.
- A rolling old server writes a row after archive: deployment-writer evidence
  was incomplete, so stop and restore/retain rather than retrying migration.
- A deleted Wave test was the only proof of a target window invariant: replace
  it with the generic reservation proof before deleting it.
