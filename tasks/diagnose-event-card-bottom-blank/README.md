# Diagnose Event Card Bottom Blank

## Objective & Hypothesis

Diagnose the large blank area at `https://partner-up.localhost/e/1?mode=card`.

Initial hypothesis from user: blank area may come from `PageScaffold` or incorrect usage. Compare against working Form/List modes before proposing code changes.

Updated finding on 2026-06-08: the reproducible blank is not extra vertical DOM after the footer. It is page-level horizontal overflow in CARD mode. Full-page capture widens from a 390px viewport to a 791px document because offscreen card projection decorations extend outside the viewport; the right side then appears as a large blank area when inspecting or scrolling the rendered page.

## Guardrails Touched

- Frontend route layout only.
- No code mutation during exploration.
- If a durable or source change is needed, ask for explicit start before editing.

## Verification

- Inspect real DOM and computed layout in browser.
- Compare Card, Form, and List route modes.
- Check both vertical footer gap and horizontal document overflow.
- Inspect relevant Vue/CSS source for the owning selector and root cause.
- After fix:
  - `https://partner-up.localhost/e/1?mode=card` at 390x844: `bodyScrollWidth=390`, `htmlScrollWidth=390`, overflow 0.
  - `https://partner-up.localhost/e/1?mode=form` at 390x844: `bodyScrollWidth=390`, `htmlScrollWidth=390`, overflow 0.
  - `https://partner-up.localhost/e/1?mode=list` at 390x844: `bodyScrollWidth=390`, `htmlScrollWidth=390`, overflow 0.
  - Footer-after gap remains only a 1px rounding difference.
  - Full-page screenshot after fix: `tasks/diagnose-event-card-bottom-blank/card-full-390x844-after-fix.png` is `390x1122`.
  - `pnpm --filter @partner-up-dev/frontend build` passed.
  - `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.

## Current Understanding

- Runtime DOM for `mode=card` at 390x844:
  - document height: 1122px
  - `.pu-page-scaffold__viewport`: y=0..844
  - card mode surface: y=118..844
  - `.pu-page-scaffold__footer`: y=844..1122, height 278px
  - footer content = mode switch shell 74px + brand footer 204px
- `mode=form` and `mode=list` have the same scaffold/footer height structure.
- Footer-after gap is not the cause:
  - `mode=card`: `.pu-page-scaffold__footer` bottom is the document bottom, with only a 1px rounding difference.
  - `mode=form`: same.
  - `mode=list`: same.
  - At bottom scroll, the last viewport pixel hits `.page-footer__beian`, not blank DOM after the footer.
- CARD mode alone creates horizontal document overflow:
  - viewport width: 390px
  - `mode=card`: `bodyScrollWidth=791`, horizontal overflow = 401px
  - `mode=form`: `bodyScrollWidth=390`, horizontal overflow = 0
  - `mode=list`: `bodyScrollWidth=390`, horizontal overflow = 0
  - Full-page screenshot evidence: `tasks/diagnose-event-card-bottom-blank/card-full-390x844.png` is `791x1122`, even though `innerWidth=390`.
- The overflow owners in real DOM are under CARD mode:
  - `.card-stage__projection-layer--underlay` is `inline-size: 100vw`, `left: 50%`, `transform: translateX(-50%)`, and `overflow: visible`.
  - `.card-stage__projection-side--right` and descendants such as `.card-stage__projection-spill`, `.card-stage__projection-bloom`, `.card-stage__projection-light`, `.card-stage__projection-rim`, and `.card-stage__projection-source` extend to the right side of the viewport.
  - Example measured offender: `.card-stage__projection-spill` right edge at 784px in a 390px viewport.
  - Ancestors `.card-stage`, `.card-mode`, `.pu-page-scaffold__main`, `.pu-page-scaffold__shell`, `.pu-page-scaffold__viewport`, and root scaffold all allow visible overflow, so the decorative projection contributes to document `scrollWidth`.
- Implementation tripwire:
  - `CARD_OVERFLOW_GUARD_CLASS = "anchor-event-card-overflow-guard"` exists.
  - `syncCardOverflowGuard` toggles the class only for uncontrolled `AnchorEventCardModeSurface`.
  - `/e/:eventId` uses the surface in controlled mode by passing `active-demand-card` and `stack-preview-cards`, so the guard is skipped.
  - No CSS rule for `.anchor-event-card-overflow-guard` exists in current source, so even uncontrolled mode would not currently clamp overflow.
- Temporary DOM-only fix experiment:
  - Baseline CARD horizontal overflow: 401px.
  - `.card-stage__projection-layer { overflow-x: clip; }` reduces `body/html scrollWidth` to 390px, overflow 0.
  - Computed projection layer overflow becomes `overflow-x: clip`, `overflow-y: visible`.
  - Clipping root scaffold, viewport, shell, main, card mode, or card stage also removes overflow, but the projection layer is the narrowest confirmed owner.
  - `html/body.anchor-event-card-overflow-guard { overflow-x: clip; }` did not reduce measured document scrollWidth in this runtime.
- Applied fix:
  - `apps/frontend/src/domains/event/ui/surfaces/AnchorEventCardModeSurface/AnchorEventCardModeSurface.scss`
  - `.card-stage__projection-layer` now uses `overflow-x: clip` and `overflow-y: visible`.
- Card mode additionally has local stage breathing room:
  - mobile card bottom to action top is about 71px
  - desktop card/front-shell bottom to action top is about 59px
- Corrected primary issue after user clarification:
  - The visible "large blank area" is primarily inside `AnchorEventDemandCard`, not the page footer.
  - Mobile 390x844 active card:
    - `.demand-card`: height 538px
    - `.demand-card__cover`: height 256px
    - `.demand-card__content`: height 280px
    - `.demand-card__primary`: height 24px
    - therefore about 208px of the content pane is empty when the card has only a time label and no visible preferences/notes.
  - Source cause: `AnchorEventDemandCard.vue` makes `.demand-card` a column flex container and `.demand-card__content { flex: 1; min-height: 0; }`, while cover has fixed `min-height: 256px`. Sparse card data leaves the flex-filled lower pane visually empty.
- `FooterRevealPageScaffold` passes `footer-placement="reveal"` to design-web `PuPageScaffold`.
- design-web `PuPageScaffold` reveal contract is screen viewport followed by footer outside the viewport.
- Runtime page loads current active design-web path:
  - `node_modules/.pnpm/@partner-up-dev+design-web@_5bed...`
  - package version `0.1.1`
- Old design-web `0.1.0` copies exist in `.pnpm`, but the page is not loading them.
- Page CSS currently targets `.footer-reveal-page-scaffold__viewport` and `.footer-reveal-page-scaffold__footer`, but runtime/design-web DOM uses `.pu-page-scaffold__viewport` and `.pu-page-scaffold__footer`; those page-level deep selectors are currently dead.

## Confirmed Constraints

- User said current frontend dev server may be stale; if needed, stop it and ask user to restart.
- Do not start the frontend dev server from this agent.

## Next Step

- Primary blank/overflow fix is implemented and verified.
- Follow-up candidates, separate from this fix:
  - Either remove the unused `CARD_OVERFLOW_GUARD_CLASS` path or make it real and ensure controlled route usage participates in it.
  - Adjust `AnchorEventDemandCard.vue` card proportions/content layout so sparse cards do not allocate a 280px lower pane for one line.
  - Fix dead selectors in `AnchorEventLandingPage.vue` from `.footer-reveal-page-scaffold__*` to the actual wrapper/design-web DOM contract if that styling is still intended.
