# `6-3.1c` Decision Log

| ID | Decision | Exit proof |
| --- | --- | --- |
| `6-3.1c-D1` | The atomic unit is one promoted candidate, not the full exit/temporal/admin command. | injected Job write leaves that candidate `PENDING`; earlier capacity-releasing mutation is unchanged |
| `6-3.1c-D2` | The unit includes slot promotion, reliability delta, derived PR status and generic waitlist Job only. | success commits those facts and one causal `notification.send.v1` Job together |
| `6-3.1c-D3` | A PR row lock serializes the capacity/FIFO decision, while Job keeps its creation-key advisory lock. | transaction path obtains both narrow locks; repeat causal request remains one Job |
| `6-3.1c-D4` | PR uses named executor-aware repository seams and a named transaction-bound Notification port, never public raw transaction/Job inputs. | import/contracts review finds no public transaction field or duplicated direct-SQL business mutation |
| `6-3.1c-D5` | The root-exported transaction-bound Notification factory accepts only a transaction-bound writer; test clocks remain private to Notification internals. | caller cannot alter `runAt`; owner-policy tests retain deterministic time through the internal factory or fake clock |
| `6-3.1c-D6` | Reusable-slot causal identity and whole-PR active-admission serialization are P1 successor slices, not implicit properties of the first handoff proof. | each successor has an independent re-entry/concurrency proof before `6-3.1d` starts |
