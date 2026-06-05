# Fix Expandable Card Collapsed Gap

- Objective & Hypothesis: remove the extra collapsed bottom gap from Anchor Event List Mode's create-card shell. Hypothesis: the `keep-content-mounted` branch keeps `.expandable-card__content` padding inside a collapsed CSS grid row, so the slot DOM remains mounted but its padding still contributes visible height.
- Guardrails Touched: shared frontend `ExpandableCard` primitive; Anchor Event create card depends on `keep-content-mounted` to preserve expensive child DOM and local state across expand/collapse.
- Verification: run targeted `ExpandableCard` frontend unit checks and frontend build/type checks after the shared primitive change; inspect the diff to ensure the mounted-content branch still renders the slot without `v-if`.
