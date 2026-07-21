# 5-1 Rehearsal

1. Start with one producer and one real consumer, not a directory-wide barrel replacement.
2. If an imported symbol is a type, decide whether it is a stable contract or an internal persistence/model detail.
3. If it is behavior, decide whether it is a command, canonical query, or genuine provider/transaction port.
4. If changing the path creates a cycle, stop and record the cycle as evidence; do not add a convenience barrel.
5. If an adapter validation helper has no independent cross-owner contract, keep it internal and redesign the
   adapter interaction rather than exporting the helper.

Expected branches: root re-export is safe; a new narrow category entrypoint is needed; or a compatibility edge must
remain with an explicit removal condition.
