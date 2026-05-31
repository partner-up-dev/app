alter table "placements"
  add column "binding_rules" jsonb not null default
    '[
      {
        "fieldKey": "participantCount",
        "contextPath": "activeParticipantCount",
        "lock": true
      },
      {
        "fieldKey": "serviceStartAt",
        "contextPath": "time.startAt",
        "lock": true
      },
      {
        "fieldKey": "serviceEndAt",
        "contextPath": "time.endAt",
        "lock": true
      }
    ]'::jsonb;
