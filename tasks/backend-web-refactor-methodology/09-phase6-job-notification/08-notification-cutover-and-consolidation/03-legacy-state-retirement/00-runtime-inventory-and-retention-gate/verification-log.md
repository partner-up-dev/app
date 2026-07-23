# `6-3.3a` Read-Only Preflight Verification Log

## Local Evidence Completed

- Read the parent specification, retirement packet, plan and rehearsal before
  searching source.
- Mapped current inbox/read-marker, Opportunity/Wave, concrete PR-message Job
  and delivery references. The exact topology is recorded in
  [`../preflight-evidence.md`](../preflight-evidence.md).
- Confirmed the new Web source contains no legacy read-marker transport and
  the `6-3.2c` semantic ACK system scenario remains green.
- Confirmed the legacy PR-message decoder remains registered at boot and reads
  inbox state; the Opportunity table is shared by inactive legacy scheduler
  definitions from several notification families.
- Confirmed `notification_deliveries` remains an explicit `6-5` exclusion.

## Gate Result

**No-Go for destructive mutation.** The repository cannot prove production Job
row shape/status, runner claim/drain state, cached old-client traffic or archive
recovery authority. The exact redacted evidence required to change this result
is in [`../runtime-inventory-request.md`](../runtime-inventory-request.md).

## Cheapest Future Proof

One operator-authorized shape/count inventory and an old-client deployment/API
traffic record are sufficient to choose the next bounded decoder or migration
batch. They are not replaceable by a local source search.
