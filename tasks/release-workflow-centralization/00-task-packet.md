# Objective & Hypothesis

Centralize GitHub Release creation in the primary Release Please workflow.
GitHub Releases represent source code version archives, not deployment success.

Hypothesis: removing deploy-workflow release creation and enabling releases in
`release-please-config.json` eliminates duplicate-tag deploy failures while
keeping deployment workflows focused on hosted rollout.

# Guardrails Touched

- `.github/workflows/AGENTS.md`: workflows should stay thin hosted entry
  points.
- `docs/40-deployment/`: rollout and release automation truth changes from
  deployment-gated GitHub Releases to code-version GitHub Releases.
- Existing dirty worktree is preserved; only release workflow, deploy workflow,
  and deployment-doc files are touched.

# Verification

- Inspect workflow diffs for a single GitHub Release creation path.
- Run YAML/static validation through the narrowest available check.
- Confirm no remaining docs or workflows describe deployment-gated GitHub
  Releases.

Results:

- `pnpm check:config` passed.
- `pnpm check:format` passed.
- `pnpm check:lint` passed; UI naming audit remains report-only with existing
  weak-name findings.
- `node -e` JSON parse for release config and manifest passed.
- `pnpm exec yaml valid` passed for changed workflow YAML files.
- `git diff --check` passed for touched files.
