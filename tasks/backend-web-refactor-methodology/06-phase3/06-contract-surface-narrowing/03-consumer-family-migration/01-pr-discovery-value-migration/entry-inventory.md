# 06C.1 entry inventory — PR Discovery value migration

Rebased 2026-07-17 from 74 root declarations plus five inline type edges. The following exact files are the frozen
consumer set for this family:

| Path | Root symbols to move | Root symbols to retain |
| --- | --- | --- |
| `apps/web/src/domains/pr/queries/usePRCreate.ts` | `PartnerRequestFields`, `PRAllowEditAfterReady`, `PRStatus`, `WeekdayLabel` | `PRId` |
| `apps/web/src/domains/pr/queries/usePRAuthoringRouteApplications.ts` | `PRRoute` | — |
| `apps/web/src/domains/pr/use-cases/usePRDiscoveryCreation.ts` | `PRAllowEditAfterReady` | — |
| `apps/web/src/domains/pr/model/pr-discovery-time-window.ts` | `PRAllowEditAfterReady` | — |
| `apps/web/src/domains/pr/model/types.ts` | `PartnerRequestFields` | — |
| `apps/web/src/domains/pr/model/pr-discovery-form.ts` | `PRRoute` | — |
| `apps/web/src/domains/pr/model/pr-route.ts` | `PRRoute`, `PRRoutePoint` | — |
| `apps/web/src/domains/pr/model/pr-route.test.ts` | `PRRoute` | — |
| `apps/web/src/domains/pr/model/pr-discovery-creation-suggestion.ts` | `PRRoute` | — |
| `apps/web/src/domains/pr/model/pr-discovery-place-options.ts` | `PRRoute` | — |
| `apps/web/src/domains/pr/model/discovery.ts` | inline `PRRoute` | — |
| `apps/web/src/domains/pr/ui/PRDiscoveryPanel.vue` | inline `PRAllowEditAfterReady` | — |
| `apps/web/src/processes/wechat/pending-wechat-action.ts` | inline `PRAllowEditAfterReady` (three edges) | — |
| `apps/web/src/domains/pr/ui/discovery/list/PRDiscoveryCreateCard.vue` | `PRAllowEditAfterReady` | — |
| `apps/web/src/domains/pr/ui/discovery/card/PRDiscoveryTimeWindowEditor.vue` | `PRAllowEditAfterReady` | — |
| `apps/web/src/domains/pr/ui/discovery/card/PRDiscoveryTimeWindowInlineEditor.vue` | `PRAllowEditAfterReady` | — |
| `apps/web/src/domains/pr/ui/discovery/form/PRCarouselPlaceSelector.test.ts` | `PRRoute` | — |
| `apps/web/src/domains/pr/ui/discovery/PRDiscoveryCardView/PRDiscoveryCardStack.vue` | `PRAllowEditAfterReady` | — |
| `apps/web/src/domains/pr/ui/discovery/form/PRTimeControl.vue` | `PRAllowEditAfterReady` | — |
| `apps/web/src/domains/pr/ui/discovery/form/PRTimeWindowEditor.vue` | `PRAllowEditAfterReady` | — |
| `apps/web/src/domains/pr/ui/discovery/PRDiscoveryFormView.vue` | `PRAllowEditAfterReady` | — |
| `apps/web/src/domains/pr/ui/discovery/PRDiscoveryListView.vue` | `PRAllowEditAfterReady` | — |
| `apps/web/src/domains/pr/ui/forms/PRPlaceModeField.vue` | `PRRoute` | — |
| `apps/web/src/pages/RouteApplicationPage.vue` | `PRRoute` | — |
| `tests/scenario/pr/pr-detail-edit.scenario.test.ts` | `PartnerRequestFields` | deep Backend fixture imports remain scenario-owned |

The 06B-owned `apps/web/src/domains/pr/contracts.ts` and its query re-export facades are read-only dependencies for
this packet. Admin `PRRoute`/join-gate consumers, PR lifecycle status/join-gate consumers, and Share/Commerce/upload
consumers belong to the other family packets.

## Entry proof and residual ledger

- Baseline for this frozen set: 22 declarations plus five inline type edges (including the three pending-WeChat
  inline sites) and one scenario type import; exact counts must be re-run with `rg` immediately before mutation.
- A root `PRId` import in `usePRCreate.ts` is the only planned residual in this set.
- Any additional root residual is a fork: classify it, move it to the correct family packet, or stop.
