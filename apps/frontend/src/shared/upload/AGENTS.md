# Shared Upload Local Rules

This folder owns cross-domain upload helpers and controls.

## Component And Composable Contracts

- `useCloudStorage.ts`: handles purpose-scoped image uploads to the backend and returns download URLs.
- `useDesignWebImageUpload.ts`: adapts design-web upload item state to app-owned URL strings and string arrays while preserving backend upload transport.

## Boundaries

- Keep upload transport and generic design-web upload state adapters here.
- Consuming domains own purpose selection, copy, validation policy, and submitted payload shape.
