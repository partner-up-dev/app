# Release Automation

## Release Please Workflow

Primary workflow: `.github/workflows/release-please.yml`

Release Please owns automated version bumps, changelog updates, release tags,
and GitHub Release notes after the `0.3.0` bootstrap baseline.

Tracked release units:

- backend: `apps/backend/package.json`, `apps/backend/CHANGELOG.md`,
  `backend-vX.Y.Z`
- frontend: `apps/frontend/package.json`, `apps/frontend/CHANGELOG.md`,
  `frontend-vX.Y.Z`

The shared manifest is `.release-please-manifest.json`.

## Deployment-Gated GitHub Releases

Backend and frontend GitHub Release semantics are deployment-gated:

- Backend Release Please PRs update source release metadata, but backend GitHub
  Releases are skipped in the general release workflow. The backend deployment
  workflow creates the backend GitHub Release only after the `master`
  production rollout finishes successfully.
- Frontend Release Please PRs update source release metadata, but frontend
  GitHub Releases are skipped in the general release workflow. The frontend
  deployment workflow creates the frontend GitHub Release only after the
  `master` production ESA rollout finishes successfully.

If release PR checks must run when opened by automation, configure
`RELEASE_PLEASE_TOKEN` as a GitHub PAT or GitHub App token with repository
contents, pull request, and issue-label permissions. Without that secret, the
workflow falls back to `GITHUB_TOKEN`.
