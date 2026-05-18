# Product Claims

## Claim 1. A One-Sentence Intent Can Become a Joinable Collaboration Object

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

## Claim 2. One PR Must Evolve Through Context-Specific Entry Paths And Stable Collaboration Rules

- Claim Intent: preserve one durable `PR` object while allowing home-led, form-led, and event-assisted entry surfaces to diverge without fragmenting collaboration semantics.
- Evaluation Dimensions:
  - entry surfaces and suggestions can diverge
  - shared semantics such as participation and timing remain legible
  - event-assisted collaboration can add discovery context without changing the core object
- Evidence Expectation:
  - route families and workflows remain context-aware while durable vocabulary stays `PR`
  - the same `PR` object can be created from natural-language, structured form, and event-assisted paths
- Source Rationale:
  - `../_drivers/business-and-service-objectives.md`
  - `../_drivers/hard-constraints.md`
- Realization Pointers:
  - `../../20-product-tdd/claim-realization-matrix.md`
  - `../../20-product-tdd/cross-unit-contracts.md`

## Claim 3. Collaboration Must Support Distribution, Revisit, and Re-Entry

- Claim Intent: treat `PartnerRequest` as a reusable collaboration object rather than a disposable form submission.
- Evaluation Dimensions:
  - link sharing remains a first-class path
  - revisit and re-entry remain available through home, event, history, and shared routes
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

## Claim 4. Collaboration Needs a Minimum Trust Loop

- Claim Intent: help users judge whether collaboration is still credible, not just whether it was created.
- Evaluation Dimensions:
  - formed and full states remain clear
  - confirmation and check-in loops reinforce reliability when the relevant modules are present
  - notification semantics model real send opportunities rather than a generic toggle
- Evidence Expectation:
  - the `Partner` submodule and notification modules expose confirmation, reminder, and check-in behavior when the relevant facts are present
  - reminder, message, and reliability feedback remain user-visible where relevant
- Source Rationale:
  - `../_drivers/market-and-user-pressures.md`
  - `../_drivers/operational-realities.md`
- Realization Pointers:
  - `../../20-product-tdd/claim-realization-matrix.md`
  - `../../20-product-tdd/system-state-and-authority.md`

## Claim 5. Identity Should Support Collaboration Instead of Blocking It Up Front

- Claim Intent: let collaboration start lightly and strengthen identity only when the scenario requires more trust.
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
