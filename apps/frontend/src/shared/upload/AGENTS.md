# Shared Upload Local Rules

This folder owns cross-domain upload helpers and controls.

## Component And Composable Contracts

- `ImageUrlInput.vue`: reusable image URL control with purpose-scoped backend upload, manual URL entry, upload progress, error text, and preview.
- `useCloudStorage.ts`: handles purpose-scoped image uploads to the backend and returns download URLs.

## Boundaries

- Keep upload transport and generic image URL entry here.
- Consuming domains own purpose selection, copy, validation policy, and submitted payload shape.
