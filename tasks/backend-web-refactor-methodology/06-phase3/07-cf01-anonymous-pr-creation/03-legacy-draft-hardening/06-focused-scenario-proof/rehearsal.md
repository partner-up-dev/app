# Rehearsal

`givenDraftPR` must support both creatorless legacy rows and rows with `createdBy=owner.id`. Every ordinary DRAFT
request should be asserted through HTTP, then child tables and the root row should be probed. Participant-flow DRAFT
requests are expected to fail before lookup/upsert. Admin requests use `/api/admin/*` and never invoke ordinary DRAFT
policy. The create-conflict test observes residue only; it must not delete or rewrite the row or children.
