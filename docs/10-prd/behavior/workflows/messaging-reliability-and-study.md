# Messaging, Reliability, And Study Workflows

## 1. Non-Realtime PR Messaging

1. A current active participant enters a `PR` detail page, reviews the current collaboration context, and uses that page as the handoff point into the dedicated message route `/pr/:id/messages`.
2. The message experience is a separate page so the detail page can stay focused on facts, participation, and notification-subscription management.
3. A current active participant can post plain-text messages inside the PR to coordinate meetup details, timing changes, or other collaboration context.
4. An operator may also add a plain-text system message to one specific `PR` when participants need an official coordination note, fulfillment update, or other operator-authored context inside the same thread.
5. The system persists both participant messages and operator-authored system messages inside the corresponding `PartnerRequest` context rather than forcing participants into an external chat tool.
6. If other current active participants still have an eligible notification option, the system opens one message-attention window per `PR / recipient`, schedules one delayed summary task after a short fixed debounce window, and limits dispatch to at most one send while that window remains open.
7. When another participant explicitly views the visible PR thread, that acknowledgment closes the current message-attention window. Hidden loads and prefetches do not close it; a later message may open a new window.

## 2. Study Sprint Pomodoro

1. A current active participant opens a `STUDY_SPRINT` PR detail page.
2. The PR detail Utility Actions area shows the Study Sprint Pomodoro entry. The entry copy is `开始一起专注<duration>分钟`, where duration is derived from the PR time window and falls back to 30 minutes when the time window is incomplete or invalid.
3. When the PR is not `ACTIVE`, the entry remains visible to current active participants but is disabled with explanatory copy.
4. When the PR is `ACTIVE`, the participant opens `/pr/:id/study-sprint`.
5. On first use, the participant sees a full-screen guidance flow made from illustration, short text, and action buttons. Intermediate pages use `下一个`; the final page text is `开始专注` and the final action is `开始`.
6. The participant manually starts their own Pomodoro timer. Timers are independent per participant; a late participant can enter and start their own timer after others are already focusing.
7. The room uses a video-call-like layout only. It shows participant tiles, live focus state, and aggregate focus progress; it does not provide camera, microphone, chat, or co-editing.
8. Staying on the Pomodoro page is not treated as touching the phone. Screen-off time after entering the room counts as focus time by product definition, while the product should avoid claiming physical no-touch proof.
9. Reaching the target duration marks the participant completed but does not automatically exit them from the room. The participant can keep viewing the room or leave manually.
10. User-visible summary shows only current room participant aggregate state. Study Sprint Pomodoro results do not affect reputation, reliability, PR punishment, or participation status.

## 3. Reliability Loop

1. The user joins a `PR` whose `Partner` submodule carries explicit reliability-related facts such as confirmation or join-lock settings.
2. The relevant command path enforces whether confirmation is enabled, whether immediate confirmation is required, whether additional joining is still allowed, and whether unconfirmed slots are released.
3. If the user still has relevant notification quota, the responsible modules may register reminder or new-partner notifications.
4. After the activity, the attendance module may collect check-in feedback and contribute to the reliability loop.
5. When the PR has a mounted feedback questionnaire instance, the PR detail flow may ask the participant to submit that questionnaire after check-in. The feedback command stores questionnaire answers in the feedback system, while the PR flow controls when the questionnaire is presented.
