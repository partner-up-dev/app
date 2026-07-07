# CONTRIBUTE to PartnerUp MVP-HA

## Commit Policy

This repository is primarily changed by AI Coding agents, so commit and release
metadata must be explicit enough for automation to preserve product history.

- Use Conventional Commits for all commits that may reach `master`.
- Use `feat(<scope>): ...` for user-visible capabilities or release-worthy behavior additions.
- Use `fix(<scope>): ...` for user-visible bug fixes or release-worthy correctness changes.
- Use `perf(<scope>): ...` only when the performance change is release-worthy.
- Use `refactor`, `chore`, `docs`, `test`, or `build` only when the change should not create a product release note.
- Do not hide release-worthy behavior behind `refactor`, `chore`, or vague messages. If a refactor changes observable behavior, classify the observable part as `feat` or `fix`.
- Mark breaking changes with `!` in the commit type or a `BREAKING CHANGE:` footer.
- Prefer scopes that match the affected owner, such as `backend`, `frontend`, `event`, `pr`, `admin`, `deploy`, or `release`.

## Release Policy

Release Please owns app versions, changelog entries, release tags, and GitHub
Release notes after the `0.3.0` bootstrap baseline:

- Backend release state lives in `apps/backend/package.json`, `apps/backend/CHANGELOG.md`, and tags named `backend-vX.Y.Z`.
- Web release state lives in `apps/web/package.json`, `apps/web/CHANGELOG.md`,
  and tags named `web-vX.Y.Z`.
- Do not manually bump app `package.json` versions except for explicit release automation bootstrap or a human-approved recovery.
- Do not manually edit generated changelog release sections. Improve future changelog content through better commits or Release Please commit overrides on the merged PR body.
- GitHub Releases represent source code version archives. Deployment status is
  owned by deploy workflows and hosted runtime state.
