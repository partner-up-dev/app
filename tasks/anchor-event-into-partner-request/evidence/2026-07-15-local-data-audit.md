# Local Development Data Audit - 2026-07-15

This is read-only local evidence. It is not production truth and must not be used to skip staging/production gates.

## Observed Local Development Database

| Fact | Result |
|---|---|
| Anchor Event rows | 4 |
| Status distribution | `ACTIVE = 4`; no PAUSED/ARCHIVED rows |
| Exact/normalized duplicate type groups | 0 |
| PRs whose type matches those rows | 0 |
| Live PRs requiring meeting fallback | 0 |
| Preference tags | 5 `PUBLISHED` rows |
| Route applications | 0 |
| Landing config KV rows | 0 |
| Direct FK constraints referencing `anchor_events` | 2 |

The seed baseline also defines four ACTIVE type rows. This explains local results but does not predict production data.

## Read-only Audit Queries For Each Environment

```sql
select status, count(*)
from anchor_events
group by status
order by status;

select lower(trim(type)) as normalized_type, count(*)
from anchor_events
group by lower(trim(type))
having count(*) > 1;

select
  ae.id,
  ae.type,
  ae.status,
  count(pr.id) as pr_count,
  count(pr.id) filter (
    where pr.status in ('OPEN', 'READY', 'ACTIVE')
  ) as live_pr_count
from anchor_events ae
left join partner_requests pr on pr.type = ae.type
group by ae.id, ae.type, ae.status
order by ae.status, ae.type;

select status, count(*)
from anchor_event_preference_tags
group by status
order by status;

select status, count(*)
from anchor_event_route_applications
group by status
order by status;

select key
from config
where key like 'anchor_event:%';

select
  conrelid::regclass as child_table,
  confrelid::regclass as parent_table,
  conname
from pg_constraint
where confrelid = 'anchor_events'::regclass;

select dependent_ns.nspname, dependent_view.relname
from pg_depend d
join pg_rewrite r on r.oid = d.objid
join pg_class dependent_view on dependent_view.oid = r.ev_class
join pg_namespace dependent_ns on dependent_ns.oid = dependent_view.relnamespace
where d.refobjid = 'anchor_events'::regclass;
```

Before cutover, extend the PR query with future time-window, active participant, PR meeting-point override, and any owner-specific live-fallback criteria validated against the deployed schema.

## Interpretation

- Local migration can exercise the simple path: only ACTIVE source rows, no PR dependency, no route applications, and no landing override rows.
- Production code and migrations must still implement and test the guarded path.
- Any staging/production PAUSED/ARCHIVED row is not mapped to a new state. It triggers explicit discard/materialize/narrow-migration review.
- The two current parent FKs correspond to preference tags and route applications; they must be migrated/retired before the parent table is dropped.
