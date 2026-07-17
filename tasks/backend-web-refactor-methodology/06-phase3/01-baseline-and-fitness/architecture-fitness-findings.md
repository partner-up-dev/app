# Architecture Fitness Finding Classification

## Snapshot

Scope digest: `991949747b64b352f69b9e7708364c87542977df5734842e0dd055b86fd03564`.
The JSON baseline owns every exact fingerprint; this page owns the compact review interpretation.

| Rule | Known | New | Governance |
| --- | ---: | ---: | --- |
| `backend/no-canonical-pr-to-pr-core` | 50 | 0 | Slice 05 compatibility retirement; includes imports and compatibility re-exports |
| `backend/no-controller-to-repository` | 7 | 0 | Historical edges in five controllers; migrate with the owning behavior slice |
| `backend/no-cross-domain-private-import` | 53 | 0 | Review per owner; replace with a curated command/query/contract/event-port surface |
| `web/no-model-to-query` | 9 | 0 | Owning Web domain migration; PR contract edges feed Slice 06 |
| `web/no-model-to-transport` | 3 | 0 | Slice 06 moves inference to an adapter-owned contract seam |
| `web/no-page-raw-rpc` | 2 | 0 | Exact BI entry and WeChat OAuth callback route exceptions |
| `web/no-ui-primitive-to-query` | 1 | 0 | Exact canonical-read exception for `PRPreviewCard.vue` |
| `web/no-shared-to-domain` | 0 | 0 | Target direction currently holds |
| `web/no-query-to-page` | 0 | 0 | Target direction currently holds |
| `web/no-ui-raw-rpc` | 0 | 0 | Ordinary domain UI target direction currently holds |

## Exception Discipline

The two route exceptions and one PR preview exception have exact fingerprint, owner, reason and removal/review
condition in the baseline. Rule-level governance classifies every other known fingerprint. The baseline is not an
allowlist for an import family: a different source/target fingerprint is `new` even when it matches a rule that
already has historical findings.

The default report remains exit 0. `--check-new` is implemented and verified, but it is intentionally not wired
into `package.json`, CI, `sgconfig.yml` or the active lint migration in this slice.
