# Product Workflows

This file is the workflow routing surface. Detailed workflow truth is split by product context so PRD behavior does not accumulate in one flat file.

| Context | File | Owns |
| --- | --- | --- |
| Core PR | [`workflows/core-pr.md`](./workflows/core-pr.md) | Home creation, structured creation, link entry, joining, revisit, and sharing. |
| Event context | [`workflows/event-context.md`](./workflows/event-context.md) | Anchor Event landing, Form Mode, dummy PR materialization, event-assisted creation, POI location application. |
| Commerce and support | [`workflows/commerce-and-support.md`](./workflows/commerce-and-support.md) | PR-attached ordering, support routing, feedback, operator support. |
| Messaging, reliability, and study | [`workflows/messaging-reliability-and-study.md`](./workflows/messaging-reliability-and-study.md) | PR messaging, Study Sprint, confirmation, reminders, check-in, and questionnaire prompting. |

Use `behavior/capabilities.md` for a high-level surface map and `behavior/rules-and-invariants.md` for product rules. Workflow files should describe user-visible sequences, not implementation ownership.
