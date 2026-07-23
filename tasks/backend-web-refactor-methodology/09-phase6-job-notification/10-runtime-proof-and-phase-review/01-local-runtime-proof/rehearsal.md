# `6-5.1` Mental Rehearsal

- FC tick and request-tail overlap: one claim token is current; stale completion
  cannot overwrite it.
- Handler crosses provider boundary then crashes: Notification/RideHailing
  owner classification, not lease expiry, decides replay safety.
- Public health is OK with late DB work: authenticated diagnostics expose the
  backlog and recovery route.
- Scenario setup disables request-tail: an explicit enabled seam is required;
  absence of failure is not proof.
- A migration fixture contains legacy pending Jobs and old tables: decoders and
  forward migrations preserve/retire them in the declared order.
