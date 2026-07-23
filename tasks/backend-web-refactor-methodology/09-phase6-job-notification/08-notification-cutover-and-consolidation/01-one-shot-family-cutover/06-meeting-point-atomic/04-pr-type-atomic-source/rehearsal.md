# `6-3.1f-04` Rehearsal

- The source first locks the config and then locks every PR of that exact type
  in ascending ID order. A concurrent PR-content/admin-reclassification write
  either precedes the observed set or causes a serializable retry; it cannot
  leave a global pre-commit snapshot paired with a later config write.
- A PR with an explicit point ignores the type change and gets no task. A PR
  using a type/location rule, type fallback or exposed POI fallback gets a
  task only when its visible description/image changes. A changed unused map
  entry, equal visible content, or a next point without description yields no
  event even if the config row changes.
- One coordination mutation can affect many PRs. It generates one UUID inside
  the retry callback and shares it as `meetingPointUpdateId` and correlation;
  each task remains unambiguous because causation includes its PR ID and the
  private creation key additionally includes its recipient.
- Source-time active rosters are read after the config write but before commit;
  Notification removes inactive users, users without OpenID and users without
  an enabled meeting-point option. A missing provider configuration does not
  veto the source transaction.
- If Notification rejects the second changed PR after the first has written
  generic tasks, the config and every prior generic task roll back together;
  no concrete legacy job or Opportunity is created.
