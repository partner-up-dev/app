# Operational Realities

## 1. WeChat Environment Differences Are a First-Class Product Reality

Important product paths depend on WeChat-specific capabilities:

- WeChat login and binding
- subscription notifications
- WeChat sharing
- support-link routing inside and outside WeChat

The product therefore has to accept capability differences across environments instead of assuming one uniform client.

## 2. Reliability Depends on Feedback Loops, Not One-Time Promise Signals

The current PR reliability loop raises reliability through:

- confirmation windows
- check-in feedback
- reminder subscriptions
- new-partner notifications

This means "will the person actually show up" and "should the signal remain trustworthy" are part of current product reality, not secondary polish.

## 3. Operator Configuration Is Part of the User-Visible Product Loop

Support links, notification templates, and POIs are product configuration. They directly affect user experience and cold-start viability.

PRD therefore needs to recognize operator-managed configuration as part of product behavior whenever it changes the user-visible path.

## 4. The Product Is Still in MVP Evolution

Some current capabilities remain stage-constrained realities:

- the product still depends on environment-specific capabilities rather than one universal client surface
- operator-managed resources still materially shape whether user flows can complete successfully
- some reliability and fulfillment flows are intentionally narrower than a mature platform would provide

PRD should describe the real current product rather than an imagined end-state platform.
