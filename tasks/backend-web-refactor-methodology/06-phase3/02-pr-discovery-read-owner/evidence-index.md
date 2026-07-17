# Slice 3-2 Evidence Index

| ID | Kind | Claim | Evidence | Confidence |
| --- | --- | --- | --- | --- |
| P3-S02-001 | Command | Slice starts at `b674f5ca`; owned paths clean and unrelated dirty paths excluded | `git status --short`; `entry-delta.md` | High |
| P3-S02-002 | Source | Page and Panel both own catalog/type-detail hooks and parse selected type | `PRDiscoveryPage.vue`; `PRDiscoveryPanel.vue`; focused `rg` | High |
| P3-S02-003 | Durable | Route page parses canonical query and delegates one workflow owner | `docs/20-product-tdd/pr-discovery-and-authoring-contracts.md` section 2 | High |
| P3-S02-004 | Source/test | 500 ms timeout aborts and only timeout falls back to LIST | `usePRDiscovery.ts`; `usePRDiscovery.test.ts`; durable contract | High |
| P3-S02-005 | Scenario | Existing System suite covers catalog, modes, zero-ratio LIST, error escape, FORM directory failure and view flows | `tests/scenario/pr-discovery/pr-discovery.scenario.test.ts` | High |
| P3-S02-006 | Skill | Existing package composition is valid and should be preserved | design-web composition/page/header/drawer/segmented references | High |

Command evidence is run from the repository root with task/generated/dependency paths excluded unless named.
