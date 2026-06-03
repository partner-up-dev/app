# Hard Constraints

## Product Shape Constraints

- The product is not an app, a community, or a content platform. It is a collaboration trigger embedded into existing conversation and sharing behavior.
- The core external collaboration object is `PartnerRequest`, surfaced product-side as `PR`.
- The current version keeps event-context PR creation inside Anchor Event and time-pool context when the Anchor Event policy allows user creation. Admin-only Anchor Events source same-type PRs through operator tooling.

## Interaction And Identity Constraints

- one `PR` object supports shared participation semantics across multiple entry paths and reliability configurations.
- baseline revisit continuity depends on anonymous UUID session recovery.
- higher-trust PR participation actions require an authenticated session plus a bound WeChat `openid`.
- The current version primarily targets H5 and WeChat-related environments rather than a native app.

## Cold-Start And Distribution Constraints

- The creation path must support "start from one sentence" and cannot force a heavy registration flow ahead of first collaboration.
- Sharing is a primary distribution path, so public links, WeChat sharing, and Xiaohongshu share outputs all belong to the current product shape.

## Current Scope Constraints

- The current product experience is single-language and `zh-CN` only.
- WeChat notifications remain constrained by WeChat environment and user subscription quota.
- Xiaohongshu currently supports generated captions and posters, but not in-platform direct publish.
