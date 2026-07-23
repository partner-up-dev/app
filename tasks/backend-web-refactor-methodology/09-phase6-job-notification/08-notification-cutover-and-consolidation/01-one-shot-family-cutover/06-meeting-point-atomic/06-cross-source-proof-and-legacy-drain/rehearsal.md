# `6-3.1f-06` Rehearsal

- A static absence check proves only creation cutover, not historical row
  safety. Keep legacy handler registration and decoder unless the pending-row
  drain gate is separately closed.
- A passing source scenario must inspect generic Job payloads, not just an HTTP
  success response. It must also assert no Opportunity/Delivery row was
  created by the new path.
- Durable documentation should name the temporal relationship explicitly:
  source time freezes event facts and fan-out eligibility; dispatch time
  decides whether current recipient/channel state allows delivery.
