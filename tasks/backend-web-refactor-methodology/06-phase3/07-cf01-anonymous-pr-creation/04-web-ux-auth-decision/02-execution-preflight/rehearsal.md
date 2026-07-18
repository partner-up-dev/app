# Browser A rehearsal sequence

The sequence below is the acceptance rehearsal, not an implementation claim.

```mermaid
sequenceDiagram
    participant U as Anonymous user
    participant O as Create owner
    participant G as Shared auth gate
    participant S as Session bootstrap/store
    participant D as Disclosure
    participant W as WeChat OAuth
    participant API as PR create API

    U->>O: Fill form/NL/discovery selection
    U->>O: Explicit Create/submit
    O->>G: ensureCreateAuth()
    G->>S: bootstrap, then read isAuthenticated
    S-->>G: anonymous
    G-->>O: false; no payload/replay retained
    O->>D: open honest disclosure
    Note over API: zero POST /api/pr/new/form or /api/pr/new/nl
    U->>D: Cancel
    D-->>O: close; in-memory fields unchanged
    U->>D: Confirm OAuth
    D->>W: requestWeChatOAuthLogin(current URL)
    Note over U,W: full redirect may lose page memory

    participant A as Authenticated user
    A->>O: Explicit Create/submit
    O->>G: ensureCreateAuth()
    G->>S: bootstrap, then read isAuthenticated
    S-->>G: authenticated
    G-->>O: true
    O->>API: exactly one normal create POST
    API-->>O: OPEN result
```

## Rehearsal checklist

1. Before code changes, confirm the baseline in `evidence-report.md` and verify no 07D implementation files exist in
   the application tree.
2. After implementation, run the shared gate unit matrix. Explicitly count create-spy calls and OAuth calls; do not
   treat a 401 response as proof of correctness.
3. Run the updated anonymous structured browser case. Observe both create endpoints, assert the disclosure before any
   request, cancel, and verify editor values remain. Inspect localStorage to ensure no `PR_DISCOVERY_CREATE` key is
   written.
4. Run an authenticated structured create and the existing authenticated Discovery ordinary-create cases. Assert one
   POST and `OPEN`; there must be no second POST on mount or after route return.
5. Only after the focused behavior is green, run `pnpm check:type:web` and `pnpm check:build:web`. Full System gate is
   reserved for the 07E integration slice.
