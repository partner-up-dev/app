# `6-3.3d` — Opportunity/Wave Source Retirement

## Status

**Ready after current-source reference audit. Archive/deployed-writer gates are
waived.**

## Objective

Remove the obsolete Opportunity/Wave creation models and their dead scheduler
edges after all current business sources use the generic Notification surface.

## Scope

- forward migration/archive of `notification_opportunities` and
  `notification_waves`;
- entities, repositories, legacy service exports and unreachable scheduler
  creation helpers; and
- current-source/registration zero-reference proof.

## Non-Goals

- no removal of generic `notification.send.v1` Jobs;
- no removal of `notification_deliveries`; and
- no use of table absence as evidence that legacy Jobs have drained.

## Exit

No current compiled source writes/reads Opportunity/Wave state; the forward
migration has representative old-data proof.
