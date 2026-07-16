# Product Claims

## Claim Axis Map

The claim set is intentionally small and orthogonal. Capabilities, route families, and modules realize claims; they should not become claims unless they introduce a new reason the product exists.

| Claim | Primary Axis | Capability Clusters It Explains |
| --- | --- | --- |
| Claim 1 | Object formation | lightweight creation, draft/publish, one-sentence and structured PR creation |
| Claim 2 | Contextual discovery | home, `/prd`, Form Mode, Authoring handoff, search/list/card discovery |
| Claim 3 | Distribution and re-entry | public links, sharing, history, `/me`, `/pr/mine`, revisit continuity |
| Claim 4 | Trust, coordination, and completion | state clarity, join gates, confirmation, reminders, meeting guidance, messaging, pairing, Study Sprint, feedback, bounded PR-attached fulfillment/support |
| Claim 5 | Progressive identity | anonymous browsing, UUID continuity, authenticated escalation, WeChat binding |

## Claim 1. Lightweight Intent Can Become A Stable Collaboration Object

- Claim Intent: let a user freeze a natural-language collaboration intent into a stable `PartnerRequest` that other people can understand, join, and revisit.
- Evaluation Dimensions:
  - creation friction stays low
  - the created object remains stable enough to share
  - a recipient can understand what action to take
- Evidence Expectation:
  - users can create a `PR` from lightweight input
  - shared routes remain legible and actionable on revisit
- Source Rationale:
  - `../_drivers/market-and-user-pressures.md`
  - `../_drivers/business-and-service-objectives.md`
- Realization Pointers:
  - `../../20-product-tdd/claim-realization-matrix.md`
  - `../../20-product-tdd/cross-unit-contracts.md`

## Claim 2. Discovery And Authoring Views Can Vary Without Forking PR Semantics

- Claim Intent: let criteria, type-specific behavior, and presentation views shape how a user finds or creates a collaboration while preserving one durable `PR` vocabulary and object model.
- Evaluation Dimensions:
  - entry and discovery surfaces can diverge by context
  - `/prd`, Form Mode, list/card/search, and no-match Authoring handoff remain PR Discovery/Authoring surfaces rather than separate collaboration objects
  - shared PR semantics such as participation, timing, place mode, and creation policy remain legible after entry
- Evidence Expectation:
  - the same `PR` object can be created or entered from natural-language, structured form, Form Mode, and search/list/card paths
  - type-specific defaults may materialize into PR-owned runtime state without introducing a template identity or PR-side reference
- Source Rationale:
  - `../_drivers/business-and-service-objectives.md`
  - `../_drivers/hard-constraints.md`
- Realization Pointers:
  - `../../20-product-tdd/claim-realization-matrix.md`
  - `../../20-product-tdd/cross-unit-contracts.md`

## Claim 3. Collaboration Must Remain Distributable And Re-Enterable

- Claim Intent: treat `PartnerRequest` as a reusable collaboration object that can be shared, revisited, and resumed after the initial creation or join moment.
- Evaluation Dimensions:
  - link sharing remains a first-class path
  - revisit and re-entry remain available through shared routes, personal center, history, `/prd`, and home
  - attribution can flow through the revisit path
- Evidence Expectation:
  - public detail routes remain stable
  - share outputs continue to route new visitors back into collaboration
- Source Rationale:
  - `../_drivers/market-and-user-pressures.md`
  - `../_drivers/hard-constraints.md`
- Realization Pointers:
  - `../../20-product-tdd/claim-realization-matrix.md`
  - `../../20-product-tdd/cross-unit-contracts.md`

## Claim 4. Collaboration Needs Contextual Trust, Coordination, And Completion Loops

- Claim Intent: help users judge and complete a collaboration after the PR exists, without turning PartnerUp into a generic social, ecommerce, or support platform.
- Evaluation Dimensions:
  - formed and full states remain clear
  - join gates, confirmation, reminders, messaging, meeting guidance, pairing, feedback, and Study Sprint reinforce coordination when relevant
  - PR-attached fulfillment and support loops stay bounded to collaboration completion
  - notification semantics model real send opportunities rather than a generic toggle
- Evidence Expectation:
  - PR detail and downstream flows expose only the coordination, reliability, fulfillment, and support affordances relevant to the current PR context
  - reminder, message, meeting-point, questionnaire, Study Sprint, and PR-attached commerce behavior remain user-visible where relevant
- Source Rationale:
  - `../_drivers/market-and-user-pressures.md`
  - `../_drivers/operational-realities.md`
- Realization Pointers:
  - `../../20-product-tdd/claim-realization-matrix.md`
  - `../../20-product-tdd/system-state-and-authority.md`

## Claim 5. Identity Should Progress With Commitment Instead Of Blocking Discovery

- Claim Intent: let users discover and understand collaboration lightly, then strengthen identity only when the action requires more trust or accountability.
- Evaluation Dimensions:
  - anonymous browsing is allowed
  - anonymous UUID continuity can support lightweight revisit
  - stronger identity requirements appear only on the actions that carry those requirements
- Evidence Expectation:
  - core `PR` creation and revisit flows remain compatible with anonymous UUID continuity
  - actions that require stronger identity remain gated by authenticated session plus WeChat binding
- Source Rationale:
  - `../_drivers/market-and-user-pressures.md`
  - `../_drivers/hard-constraints.md`
- Realization Pointers:
  - `../../20-product-tdd/claim-realization-matrix.md`
  - `../../20-product-tdd/cross-unit-contracts.md`
