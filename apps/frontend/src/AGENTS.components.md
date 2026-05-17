# AGENTS.md for Frontend Components

## Component Development Norms

### Using Shared Types

Always import type definitions from `@partner-up-dev/backend` instead of re-declaring them:

```typescript
import type { PartnerRequestFields, PRId, PRStatus } from "@partner-up-dev/backend";

// ❌ Don't do this:
interface PartnerRequestFields { ... }

// ✅ Do this:
import type { PartnerRequestFields } from "@partner-up-dev/backend";
```

This ensures consistency across frontend and backend and reduces duplication.

### Using RPC Data

In components, destructure Vue Query returns (`data`, `isLoading`, `error`).

```vue
<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else-if="user">
    <h1>{{ user.name }}</h1> <!-- Auto-completion here -->
    <p>{{ user.email }}</p>
  </div>
</template>

<script setup lang="ts">
import { useUser } from '@/domains/example/queries/useUser';
import { useRoute } from 'vue-router';

const route = useRoute();
// Assuming route param id
const { data: user, isLoading, error } = useUser(Number(route.params.id));
</script>
```

### Entity Preview Data Ownership

When a reusable domain component renders canonical facts for an entity, prefer
an id-based API and let the component own the canonical detail query. Callers
may provide caller-owned context such as route override, cover image,
contextual time label, analytics surface, or action slots.

Add snapshot or fallback props only when that fallback is an explicit product
contract with meaningful user-visible value. Low-value first-paint fallbacks add
interface complexity and keep stale data responsibilities alive at call sites.

### Ownership

Use the architecture rules in `src/ARCHITECTURE.md`.

- True cross-domain UI primitives live under `src/shared/ui/*`.
- Domain-owned UI should move toward `src/domains/<domain>/ui/*`.
- Do not add new usage-specific components back into `components/common`.

### Component Splitting And State Ownership

Split large Vue components along behavior ownership, not only along template shape.

- A child component should own the state, derived values, validation, and handlers that are fully local to its user interaction.
- A parent surface should own only cross-control flow state, route coordination, backend query / mutation orchestration, analytics, and handoff behavior that spans multiple child components.
- A pure presentation extraction is useful when it creates real reuse or isolates a repeated visual primitive. It is usually insufficient as the main answer to an oversized component when the parent still owns every interactive detail.
- Prefer component boundaries that let data move through explicit `v-model` / event contracts. Avoid child components that need to know sibling state or parent internals.
- When a child gathers draft input through a drawer, modal, picker, or editor, keep that draft state inside the child and emit the committed value to the parent.
- Keep backend-authoritative writes in the parent or a domain composable when the write affects cross-section flow, cache invalidation, routing, or telemetry.

### Styling

All components MUST follow `src/styles/AGENTS.md`.

Default rule:

- use direct `sys` tokens first
- do not add `dcs` or a component contract if existing `sys` already solves the need without a severe visual regression

Components may use existing shared primitives when the treatment is already centralized, but should not add a new primitive or variant just to hide ordinary `sys` usage.

Action treatments live inside the lowest action primitives:

- `shared/ui/actions/Button.vue`
- `shared/ui/actions/ActionLink.vue`

Pages, domain components, and higher-level shared components should compose `Button`, `ActionLink`, or `FeedbackButton` instead of re-declaring action treatment styles. Navigation components such as `TabBar` should own their navigation-specific styles directly instead of reusing action treatments.

Exception: explicitly exempted visual surfaces such as the Landing Page may keep treatment styles component-local when visual continuity matters. Do not push those one-off treatments into `dcs` or shared primitives just to satisfy reuse.

- Mixins are auto-injected by Vite config for all components, use them directly:
  - `@include mx.pu-font($key)` - Typography (e.g., `body-large`, `label-small`)
  - `@include mx.pu-elevation($level)` - Shadows (levels 1-5)
  - `@include mx.pu-icon($size)` - Icon sizing (`small`, `medium`, `large`)

- CSS Variables prefixed with `--sys-`:
  - Colors: `--sys-color-primary`, `--sys-color-surface-container`, etc.
  - Spacing: `--sys-spacing-xsmall`, `--sys-spacing-medium`, etc.
  - Radius: `--sys-radius-small`, `--sys-radius-large`, etc.

Learn available tokens in `src/styles/_sys.scss`, governance rules in `src/styles/AGENTS.md`, and low-level typography/elevation/icon mixins in `src/styles/_mixins.scss`.

Prohibited:

- ❌ Hardcoded colors, sizes, or font properties
- ❌ Adding a new component contract or `dcs` token when direct `sys` is already enough
- ❌ Direct imports of token files (`_sys.scss`, `_ref.scss`)

## Components

- `shared/ui/actions/Button.vue`: Shared button primitive. Prefer it over page-local button classes; use `appearance="pill"` for compact CTA clusters and `appearance="rect"` for dialogs or block actions. Keep `tone` choices narrow (`primary`, `primary-outline`, `outline`, `secondary`, `surface`, `tertiary`, `dashed`, `danger`, `ghost`).
- `shared/ui/actions/ActionLink.vue`: Shared action-looking link primitive for `<RouterLink>` and external `<a>` CTAs. Use `primary-outline` for primary-color outlined actions and `secondary` for secondary-family actions.
- `shared/ui/actions/FeedbackButton.vue`: Shared transient feedback action button. Use `state="pending|success|error"` for short-lived action results instead of page-local `.success` / `.error` button treatments.
- `shared/ui/containers/SurfaceCard.vue`: Standard card shell for reusable section, inset, and outline surfaces. Use it instead of re-declaring card shells in pages when the wrapper itself is a reusable primitive.
- `shared/ui/containers/ExpandableCard.vue`: Collapsible card shell. Use `keep-content-mounted` only when collapsed content owns expensive local state or setup work; use `expanded-reset-key` with `default-expanded` when a parent needs to reset expansion without remounting the card.
- `shared/ui/containers/ChoiceCard.vue`: Selectable card primitive for button-like choices and RouterLink navigation choices. Use it for repeated default/active selectable card shells without embedding domain semantics.
- `shared/ui/layout/FullScreenPageScaffold.vue`: Viewport-height page scaffold with `header`, content, and `footer` regions. Use it when the main content should absorb remaining height and manage its own inner scrolling.
- `shared/ui/layout/FooterRevealPageScaffold.vue`: Viewport-first page scaffold with `header`, content, and `footer` regions where `header + content` fill the first screen and the footer appears only after continued page scroll.
- `shared/ui/forms/FormField.vue`: Label + control + hint/error wrapper for plain form rows. It does not own the input shell; pair it with native controls or existing form primitives that already style the control.
- `shared/ui/forms/TextareaInput.vue`: Shared textarea primitive with stable shell, optional char count, and configurable rows/max length. Prefer it when multiple screens need the same textarea treatment instead of re-implementing native `<textarea>` styling locally.
- `shared/ui/forms/ToggleSwitch.vue`: Shared labeled boolean switch primitive with `v-model` and switch semantics. Keep domain copy and workflow behavior in the consuming component.
- `shared/ui/forms/WheelPicker.vue`: Shared finite vertical option picker for single-value choices. Use `modelValue`, `options`, `itemHeight`, `visibleCount`, and `tone`/`variant` values `surface`, `outline`, `primary`, `secondary`, `tertiary`; `teritary` is accepted as a compatibility alias.
- `shared/ui/forms/ProductLocalDateCalendarPicker.vue`: Product-local date-key calendar grid for visible-window multi-select flows. Keep search policy such as defaults, fallback, and allowed-date derivation in the owning page or domain component.
- `shared/ui/controls/SegmentedControl.vue`: Generic mutually exclusive segmented control for local mode selection. Keep domain copy and mode semantics in the consuming component; use option-level `testId` when route/scenario coverage needs stable interactive nodes.
- `shared/map/Map.vue`: Generic Tencent LBS-backed map wrapper with typed marker, polyline, active-geometry, and viewport padding props. Keep domain-specific projection in the consuming domain.
- `shared/ui/display/InfoRow.vue`: Generic label/value row with inline or stacked layout. Use it for neutral metadata presentation, not domain-specific timeline or status logic.
- `shared/ui/display/InfoRowAction.vue`: Generic label row with a trailing inline button. Use it when metadata should keep InfoRow visual rhythm while only the right-side affordance is clickable.
- `shared/ui/display/Cell.vue`: Generic single-line cell for title/value rows with an optional suffix icon or suffix slot. Use it for compact settings/list rows that need a Wot-style cell treatment without domain-specific behavior. Pass `border` to show the bottom divider.
- `shared/ui/display/Chip.vue` and `shared/ui/display/ChipGroup.vue`: Neutral tokenized chips for tags, lightweight roster labels, and compact metadata groups. Use `size="lg"` when replacing legacy pill-badge treatments. Do not move domain semantics like PR status into these when a domain badge already exists.
- `shared/ui/display/FitChipGroup.vue`: Single-line chip row that measures available width and only shows whole chips that fully fit. Prefer it when chip text must stay complete and overflow should hide entire chips rather than truncate them.
- `shared/ui/feedback/InlineNotice.vue`: Inline success/info/warning/error banner. Prefer it over page-local feedback blocks when the message is simple and does not need toast behavior.
- `shared/ui/feedback/EmptyState.vue`: Empty or not-found shell with title, description, icon, and optional actions slot.
- `shared/ui/overlay/ConfirmDialog.vue`: Standard confirm/cancel dialog built on `Modal` and `Button`. Use it for straightforward confirmation flows instead of rebuilding modal actions per page.
- `shared/ui/identity/Avatar.vue`: Shared avatar with image and fallback initial. Prefer it over per-page avatar fallback markup when the need is generic identity display.
- `shared/ui/overlay/Modal.vue`: Generic modal primitive. Add scroll locking with `useBodyScrollLock(computed(() => open.value))` in the parent when needed.
- `domains/event/ui/composites/AnchorEventRadioCardCarousel.vue`: Event-domain carousel selector that centers and enlarges the selected Anchor Event card while keeping event-card content reuse local to the event domain.
- `domains/pr/ui/primitives/PRPreviewCard.vue`: PR-domain preview card for PR list rows and search results. Accepts `prId`, owns the PR detail query, and supports route override, cover image, contextual time label, and an `actions` slot. Keep canonical PR facts inside the owned detail query; keep call-site props limited to caller context.
- `domains/pr/ui/forms/DateTimeRangePicker.vue`: Standalone time-window picker for start/end date-time.
- `domains/pr/ui/forms/PRForm.vue`: Structured PR create/edit form using `src/lib/validation`.
- `domains/route/ui/RouteEditor.vue`: Generic route editor with compact route rows, waypoint add/remove, map preview toggle, and `LocationPicker` handoff for point selection.
- `domains/route/ui/RouteMap.vue`: Generic route display wrapper over `shared/map/Map.vue`; consuming domains own payload conversion and planned polyline sourcing.
- `domains/location/ui/LocationPickerPanel.vue`: Generic Tencent `componentPicker`-backed location picker that returns `PickedLocation`; consuming domains map the picked location into their own payload shape.
- `domains/share/ui/composites/PRShareCarousel.vue`: Share-method carousel host.
- `domains/share/ui/methods/as-link/ShareAsLink.vue`: Link-sharing method UI.
- `domains/share/ui/methods/xhs/ShareToXiaohongshu.vue`: Xiaohongshu sharing method UI.
- `domains/share/ui/methods/wechat/ShareToWechatChat.vue`: WeChat sharing method UI.

## Composables

- `shared/upload/ImageUrlInput.vue`: Reusable image URL control with purpose-scoped backend upload, manual URL entry, upload progress, error text, and preview.
- `shared/upload/useCloudStorage.ts`: Handles purpose-scoped image uploads to the backend and returns download URLs.
