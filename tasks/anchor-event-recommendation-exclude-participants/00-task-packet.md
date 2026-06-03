# Anchor Event Recommendation Exclude Participants

## Objective & Hypothesis

Prevent Anchor Event Form Mode recommendations and Card Mode demand cards from recommending PRs where the current viewer is already an active partner.

Hypothesis: backend recommendation pools are the correct mutation point because participation state is backend-authoritative and both Form/Card surfaces consume backend-authored projections.

## Guardrails Touched

- Backend authoritative partner-slot state: active partner statuses are `JOINED`, `CONFIRMED`, and `ATTENDED`.
- Anchor Event Form Mode recommendation contract.
- Anchor Event Card Mode demand-card projection contract.
- Existing route-mode Anchor Event work in the same files must be preserved.

## Verification

- Add backend scenario coverage for Form Mode excluding an already-joined PR.
- Add backend scenario coverage for Card Mode grouping after excluding already-joined PR candidates.
- Run targeted backend scenario tests for Anchor Event.
