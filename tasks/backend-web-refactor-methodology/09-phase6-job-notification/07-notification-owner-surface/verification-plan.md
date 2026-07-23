# `6-2` Verification Plan

## Cheapest Credible Checks

| Claim | Verification |
| --- | --- |
| template/payload correlation is safe | compile-time negative fixtures plus runtime schema rejection |
| caller sees no Job/provider mechanics | export/import ledger and structural search |
| timing/creation/dedupe belongs to Notification | policy unit tests from semantic payload/context to private Job request |
| logical unlimited credit is safe | ADT decode/eligibility matrix; current WeChat adapter fixture proves non-null count -> LIMITED and no schema migration |
| eligibility is dispatch-time authoritative | representative handler tests for valid/stale promotion and missing recipient/channel |
| provider outcomes are neutral and safe | accepted/refusal/proven-not-applied/ambiguous → generic disposition + option-consequence matrix; ambiguous never retries by default |
| authoritative reload is not duplicated | schedule test proves no full prepare query; handler test proves one dispatch-time reload |
| WAITLIST_PROMOTED behavior is preserved | focused existing/new backend unit and scenario regression |
| exemplar handoff debt is visible | failure injection after promotion commit records the named `6-3` gap; no false atomicity claim |
| untouched families remain live | registration inventory and existing notification unit suite |

## Gate Order

1. type fixtures and registry/policy unit tests;
2. focused waitlist handler/workflow tests;
3. dependency/import search;
4. `pnpm check:type:backend` and `pnpm check:lint:backend`;
5. `pnpm test:unit:backend`;
6. targeted backend scenario, then `pnpm check:static` before exit.

No Web UI, deployed provider call or table removal is required for this slice.
