# Issue 148 QR Poster Share

## Objective & Hypothesis

Objective: make PR link sharing also present a scannable QR poster with the page title.

Hypothesis: the smallest durable change is frontend-owned and upload-backed. The link share mode already owns the normalized `web_share` URL, and the PR share payload already carries backend-authored canonical share title. Rendering one composed poster image, uploading it with purpose `poster`, and displaying the resulting URL satisfies WeChat browser save behavior without adding a backend cache field.

## Guardrails Touched

- Frontend share domain: `apps/frontend/src/domains/share`
- PR share context contract: `PRShareData.canonicalShare.title`
- QR code dependency plus canvas poster composition and upload in the link-share use case
- Link-share action semantics: action button copies the link
- Locale schema and Chinese copy

## Verification

- Run frontend build from repo root: `pnpm --filter @partner-up-dev/frontend build`
- Run token lint from repo root: `pnpm --filter @partner-up-dev/frontend lint:tokens`
- Inspect that link share panel uses the same normalized URL for QR poster and copy behavior
