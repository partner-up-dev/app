# Exploration Map

## Evidence Snapshot

Commands used during initial exploration:

- `rg --files -g 'AGENTS.md' -g '!node_modules' -g '!dist' -g '!build'`
- `rg --files tasks/design-web-package-integration`
- `rg --files apps/frontend/node_modules/@partner-up-dev/design-web/skills/design-web`
- `rg -n '@/shared/ui/|<PageScaffold|<PageFooter|<PageHeader' apps/frontend/src`
- line-count scan over `apps/frontend/src/**/*.vue`
- raw-control scan for `<form`, `<input`, `<textarea`, `<select`, `<button`,
  `<img`, role/status, and live-region usage

## Residual Shared UI

`src/shared/ui` remaining files:

- `feedback/ErrorToast.vue`
- `forms/MultiStopToggle.vue`
- `forms/ProductLocalDateCalendarPicker.vue`
- `forms/TimelinePolicyPicker.vue`
- `navigation/PageHeader.vue`
- `sections/APRNotificationSubscriptions.vue`
- `sections/PageFooter.vue`
- `sections/WeChatNotificationSubscriptionsCard.vue`

Initial read:

- `PageHeader` is primarily a local facade over page header structure plus
  router fallback behavior. Package target is `PuPageHeader`; router fallback
  can move to usage sites or a composable if needed.
- `ErrorToast` is a local toast/inline error surface. Package targets are
  `PuSnackbar`/`PuSnackbarHost` for transient feedback and `PuInlineNotice` for
  persistent embedded state.
- `MultiStopToggle` owns a custom multi-stop slider/toggle interaction. It is
  not a direct `PuToggleSwitch` replacement. `PuSegmented` may be considered
  only when the product accepts a segmented-control interaction.
- `TimelinePolicyPicker` is a domain-shaped editor currently in shared UI. It
  should likely move to a domain owner and compose package form controls.
- `ProductLocalDateCalendarPicker` is product-local calendar selection. There
  is no direct package calendar component in the current component map.

## Large-File Hotspots

Top files by line count from the initial scan:

| Lines | File |
| ---: | --- |
| 1757 | `apps/frontend/src/pages/AdminAnalyticsPage.vue` |
| 1440 | `apps/frontend/src/domains/event/ui/surfaces/AnchorEventFormModeSurface.vue` |
| 1323 | `apps/frontend/src/pages/AnchorEventLandingPage.vue` |
| 1078 | `apps/frontend/src/domains/event/ui/surfaces/AnchorEventCardModeSurface/AnchorEventCardModeSurface.vue` |
| 1037 | `apps/frontend/src/domains/admin/ui/pr/views/AdminPRBasicView.vue` |
| 993 | `apps/frontend/src/pages/StudySprintPomodoroPage.vue` |
| 965 | `apps/frontend/src/domains/event/ui/surfaces/AnchorEventListModeSurface.vue` |
| 883 | `apps/frontend/src/domains/event/ui/primitives/AnchorEventDemandCard.vue` |
| 781 | `apps/frontend/src/domains/event/ui/controls/form-mode/FormModePreferenceControl.vue` |
| 774 | `apps/frontend/src/pages/MePage.vue` |

Interpretation:

- Admin pages combine rails, filters, forms, result cards, summary cards, and
  command handling in route-level files.
- Anchor Event surfaces are state-machine heavy. They need topology mapping
  before production edits.
- PR editor/admin PR editor still contain many raw fields and repeated field
  CSS patterns.

## Raw Field Hotspots

Top raw form-control files from the initial scan:

| Count | File |
| ---: | --- |
| 16 | `apps/frontend/src/domains/admin-commerce/ui/product-management/sections/AdminCommerceSpuEditor.vue` |
| 14 | `apps/frontend/src/domains/admin/ui/pr/views/AdminPRBasicView.vue` |
| 14 | `apps/frontend/src/domains/admin/ui/poi/sections/PoiBasicSection.vue` |
| 13 | `apps/frontend/src/pages/AdminPaymentPage.vue` |
| 10 | `apps/frontend/src/domains/admin-commerce/ui/pricing-rules/PricingRulesEditor.vue` |
| 10 | `apps/frontend/src/domains/admin-commerce/ui/product-management/sections/AdminCommerceSkuEditor.vue` |
| 10 | `apps/frontend/src/pages/AdminRideHailingPage.vue` |
| 9 | `apps/frontend/src/pages/AdminCommercePlacementPage.vue` |
| 8 | `apps/frontend/src/domains/pr/ui/forms/PREditor.vue` |
| 7 | `apps/frontend/src/pages/AdminAnalyticsPage.vue` |

Interpretation:

- Admin/commerce field cleanup can produce broad maintainability gains with
  lower product risk than Form Mode refactors.
- Eligible controls can move to `PuInput`/`PuTextarea`, but date-time and select
  fields need a separate interaction/API decision.

## Direct Package Targets

- Page title/action/meta: `PuPageHeader`
- Toast or transient feedback: `PuSnackbar`, `PuSnackbarHost`
- Embedded persistent notice/error: `PuInlineNotice`
- Dashboard bento layout: `PuBentoGrid`, `PuBentoItem`
- Grouped content: `PuCard`
- Dense row/settings groups: `PuCellGroup`, `PuCell`
- Read-only facts: `PuDescriptionList`, `PuDescriptionItem`
- Field shells: `PuFormItem`, `PuInput`, `PuTextarea`, `PuToggleSwitch`,
  `PuCheckbox`, `PuCheckboxGroup`
- Select/picker interaction: `PuPicker` when the interaction is acceptable
- Media: `PuImg`
- Expand/collapse: `PuAccordion`, `PuAccordionItem`
- Loading placeholder: `PuSkeleton` when final layout shape is known,
  `PuLoadingState` or `PuSpinner` otherwise

## Open Questions For Discussion

- Should `PageHeader` router fallback behavior move into a small composable
  used by pages, or should usage sites decide `router.back()` versus fallback
  route explicitly?
- Should app-wide transient errors use a single `PuSnackbarHost` queue, or
  should this slice only replace existing embedded `ErrorToast` usages with
  local `PuSnackbar`/`PuInlineNotice` first?
- Do we want to accept `PuPicker` as the admin option-selection interaction, or
  keep native `select`/`datalist` until the package exposes a web-select field?
- Is `AdminPageScaffold` a durable domain container worth keeping, or should
  more of its aside/sticky behavior be expressed directly through
  `PuPageScaffold` page-level props if the package covers it?
