# Img Migration

## Target

- Local owner: native `img` elements, background-image cover shells, and domain
  image primitives in app usage sites.
- Package target: `PuImg`.
- Desired final state: package owns reusable image rendering, loading/error
  behavior, fit mode, radius, and sizing where image semantics match. App code
  keeps only domain-specific overlay, fallback copy, and interaction logic.

## Current Contract

- `PRPreviewCardFrame.vue` renders the PR cover as a background-image block.
- `AnchorEventDemandCard.vue` renders card cover images as background-image
  blocks and separately owns swipe/preview interaction.
- `EventCard.vue` renders event cover/fallback gallery images as background
  images and overlays available-location pills.
- `Avatar.vue` owns identity fallback semantics and is treated as a local
  exception, not a generic image wrapper.

## Migration Shape

- From: native `img` and CSS `background-image` shells where the image itself is
  the reusable visual primitive.
- To: usage sites import `PuImg` directly and pass `src`, fit mode, dimensions,
  radius, loading/error settings, and local classes as needed.
- Completion rule: touched image surfaces should not introduce a local `Img`
  facade. Keep domain components only when they own layout, overlays, gestures,
  or fallback text beyond the image primitive itself.
- Parity rule: exact CSS background-image crop, placeholder visual, loading
  behavior, or error behavior does not need to match the old implementation.
  Use `PuImg`'s native model unless a product-owned exception is discussed.

## Initial Usage-Site Scope

- PR preview cover image: `PRPreviewCardFrame.vue`.
- Anchor Event card cover image: `AnchorEventDemandCard.vue`.
- Event card cover image: `EventCard.vue`.
- Avatar image branch: `Avatar.vue`, only if `PuImg` can support the identity
  component contract directly without weakening fallback accessibility.

## Risks

- Replacing a CSS background with `PuImg` may change crop behavior. The
  required guardrail is that the image remains legible, correctly bounded, and
  does not break overlays or gestures.
- `PuImg` has `loading` and `error` slots, but card fallbacks may be
  product/domain copy rather than image error UI.
- Gesture-heavy cards must keep pointer, focus, and swipe behavior on the card
  root, not on the image.

## Verification

- Build, token lint, frontend unit tests.
- Browser smoke for Anchor Event card mode/list mode and PR preview card
  surfaces on mobile and desktop widths.

## Slice Result

- `EventCard.vue`, `AnchorEventDemandCard.vue`, and
  `PRPreviewCardFrame.vue` now use `PuImg` for cover images.
- `MePage.vue` and `UserProfilePage.vue` now use `PuImg` for identity images.
- No local image wrapper was introduced.
