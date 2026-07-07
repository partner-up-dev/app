# Release Automation

## Release Please Workflow

Primary workflow: `.github/workflows/release-please.yml`

Release Please owns automated version bumps, changelog updates, release tags,
and GitHub Release notes after the `0.3.0` bootstrap baseline. GitHub Releases
represent source code version archives, not proof that a production deployment
has succeeded.

Tracked release units:

- backend: `apps/backend/package.json`, `apps/backend/CHANGELOG.md`,
  `backend-vX.Y.Z`
- web: `apps/web/package.json`, `apps/web/CHANGELOG.md`, `web-vX.Y.Z`

The shared manifest is `.release-please-manifest.json`.

## GitHub Release Semantics

The Release Please workflow is the single GitHub Release creation path for
tracked release units. Backend and web deployment workflows do not create
GitHub Releases.

Deployment status is represented by the deployment workflows and hosted runtime
state, not by the presence or absence of a GitHub Release.

If release PR checks must run when opened by automation, configure
`RELEASE_PLEASE_TOKEN` as a GitHub PAT or GitHub App token with repository
contents, pull request, and issue-label permissions. Without that secret, the
workflow falls back to `GITHUB_TOKEN`.
