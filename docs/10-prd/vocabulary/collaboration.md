# Collaboration Vocabulary

These terms are scoped to the core `PR` collaboration context. If a term is used inside event or commerce behavior with a narrower meaning, that narrower meaning belongs in that context file.

| Chinese Term | English Label | Context Boundary | Meaning |
| --- | --- | --- | --- |
| 搭子请求类型 | `PR.type` | PR-owned classification | A PR-owned classification string. It may resolve a PR into an Anchor Event context, but it remains a PR field rather than the Anchor Event's user-facing label. |
| 加入门槛 | `Join Gate` | PR-owned join prerequisite | Runtime configuration that must be resolved before a viewer can join or waitlist a PR. The resolved state may come from the owning fact for each gate kind. |
| 当前创建者 | `Current Creator` | PR responsibility role | The user currently responsible for creator-only PR actions. `PartnerRequest.createdBy` represents this current responsibility, not an immutable original author. |
| 集合点指引 | `Meeting-Point Guidance` | Participant coordination | Guidance that answers where participants should meet at or inside the primary location. Visibility changes by PR state and viewer participation. |
| 配对码 | `Pairing Code` | READY-phase offline aid | A color-coded four-digit visual aid for active participants to find each other at an offline venue. It is not authentication, joining proof, or attendance proof. |
| 自习冲刺 | `Study Sprint` | PR collaboration subtype | A `STUDY_SPRINT` PR experience where current active participants can focus remotely with independent timers and shared room visibility. |
