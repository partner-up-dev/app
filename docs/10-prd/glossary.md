# Glossary

This file owns universal product vocabulary and routes context-specific vocabulary to scoped files. The file is written in English, but product-owned Chinese terms remain preserved as the canonical labels where needed.

Do not force every recurring word into one global definition. When a term's meaning depends on collaboration, discovery, commerce, support, or operations, define it in the scoped vocabulary file and link it from here.

## Universal Vocabulary

| Chinese Term | English Label | Meaning |
| --- | --- | --- |
| 搭子请求 | `PR` (`PartnerRequest`) | The core one-off collaboration object that can be created, joined, shared, revisited, and concluded. |
| 搭子位 | `Partner Slot` | The shared participation slot model used by `PR`. |
| 匿名用户 UUID | `Anonymous User UUID` | The lightweight local continuity identifier used to restore anonymous visitor identity across revisits. |
| 协作触发器 | `Collaboration Trigger` | The product thesis that collaboration should start from a lightweight shareable carrier rather than a heavy platform workflow. |

## Scoped Vocabulary

| Context | File | Owns |
| --- | --- | --- |
| Collaboration | [`vocabulary/collaboration.md`](./vocabulary/collaboration.md) | PR-owned participation, creator, guidance, join gates, pairing, study collaboration terms. |
| PR discovery | [`vocabulary/pr-discovery-and-authoring.md`](./vocabulary/pr-discovery-and-authoring.md) | `/prd`, Form Mode, Authoring handoff, POI, location application, and discovery terms. |
| Commerce and support | [`vocabulary/commerce-and-support.md`](./vocabulary/commerce-and-support.md) | PR-attached commerce, quote, placement, choice set, RideHailing, support and feedback terms. |
| Operations | [`vocabulary/operations.md`](./vocabulary/operations.md) | Operator-maintained product configuration and review surfaces. |
