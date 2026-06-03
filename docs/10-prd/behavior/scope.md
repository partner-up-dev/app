# Scope

## In Scope

- one collaboration object: `PR`
- home exploration, event browsing, `PR` creation, and PR detail participation
- anonymous UUID continuity, WeChat login / binding, `/me`, and `/pr/mine`
- distribution paths, WeChat share, Xiaohongshu caption / poster output, and `spm` attribution
- the current event-context `PR` detail-page information architecture: meeting-point guidance under the facts-card location row, persistent notification subscriptions section, facts-card driven participant roster modal, clickable participant profile badges, and venue-image entry through a clickable label row
- non-realtime PR messaging and message notifications, including participant-authored messages plus operator-authored system messages, with the current frontend rollout exposed through the dedicated `/pr/:id/messages` route family
- the current reliability loop modules: confirmation, reminders, check-in, and new-partner notifications
- support routing through "Need Help", author feedback, and about-page entry
- operator maintenance of Anchor Event, time-pool, PR, and POI semantics

## Explicitly Out Of Scope

- turning the product into an independent community, content platform, or social network
- a generic event-context `PR` creation entrypoint detached from Anchor Event and time-pool context
- direct publish inside Xiaohongshu
- multilingual product experience

## Deliberately Retained Current-Stage Constraints

- some real product capabilities still depend on WeChat environment differences and operator-managed configuration
