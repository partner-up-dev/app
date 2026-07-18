# 4-2 Subtask Map

```text
01 backend public-session validation
  -> proves active/role authority and explicit issuance
  -> enables
02 web session projection
  -> removes duplicate registration and projection split
  -> enables
03 cross-unit continuity proof
  -> proves browser anonymous recovery and stale-UUID replacement
  -> allows durable promotion and 4-3 entry refresh
```

The order is dependency-based, not a second phase taxonomy. `01`, `02`, and `03` are execution subtasks within
one `4-2` slice. Each has one low-cost proof before its broader proof; an unexpected contract shape returns the
work to its own rehearsal rather than expanding into `4-3`.

| Subtask | Stop branch | Rollback boundary |
| --- | --- | --- |
| 01 | canonical query cannot classify current rows without leaking persistence | retain current public middleware and make no Web change |
| 02 | typed RPC/session shape cannot support one register-or-restore process | retain storage-compatible code and do not touch callback/handoff |
| 03 | browser behavior differs from focused unit model | preserve source, diagnose only the observed journey before promotion |

All three subtasks exited through their declared proof rather than their stop branch. The resulting evidence is
linked from the root [`verification-log.md`](./verification-log.md) and each subtask's own exit record.
