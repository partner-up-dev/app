# `8-6.3` Compatibility Ledger

| Surface | Evidence | Disposition | Exit / proof |
| --- | --- | --- | --- |
| Web `router/index.ts` | zero source/test/doc/config consumer; only re-exported `app/router` | removed | focused reference audit; Web integration gates |
| Web `stores/userSessionStore.ts` | zero source/test/doc/config consumer; only re-exported current shared auth owner | removed | focused reference audit; Web integration gates |
| Job `registerHandler` / `unregisterHandler` and `legacy-adapter.ts` | Official Account follow sync was the only production caller | removed after caller migrated to typed versioned `JobDefinition` | focused Job/marketing tests plus full Backend proof |
| `JobHandler` compatibility type | no consumer after legacy registration retirement | removed | exact symbol search |
| `deletePendingJobsByDedupe` | declaration/implementation only; current semantic API is cancellation | removed | exact symbol search |
| `jobs.early_tolerance_ms` / `late_tolerance_ms` | entity declaration only; no runtime reader/writer | forward-retired by universal migration `0097` | migration lint/check and scenario migration proof |
| `resolution_ms` / tolerance-unit columns | active scheduling calculation, persistence and claim predicates | retained as current Job state | current source readers/writers |
| `OPENAI_API_KEY` env alias | parsed but never consumed; CI/template/validation and operator-stated FC truth use `LLM_API_KEY` | removed | repository/deployment reference audit |
| legacy CaoCao callback route | mounted, scenario-tested and named by edge router, nginx, systemd and deployment truth | retained; external exit | provider URL migrated to the provider-instance route, legacy-order callback window cleared, deployment config/docs changed and signed staging smoke proven |
| direct WeChat OAuth callback RPC | terminal route compatibility required by current handoff protocol | retained explicit exception | replacement callback/session protocol plus provider/runtime and System proof |
| broad Knip findings | report-first inventory without per-item owner/behavior proof | not admitted | a later named owner and reference/behavior proof |
| `notification_deliveries` | historical audit compatibility awaiting professional O11y/retention decision | future independent | replacement/retention proof |
| Drizzle journal/generator provenance | independent controlled tooling question | independent | separately authorized generator/provenance task |

## Cut-off Note

Sir already decided Phase 6/8 need not preserve arbitrary old Job payloads.
Official follow-sync has always scheduled version `1` with `{}`. A malformed
non-empty historical payload now becomes `INVALID_PAYLOAD` permanent failure
instead of entering the former untyped handler and retrying; this is the
accepted forward cut-off, not a hidden compatibility promise.
