# `6-3.1f-01` Rehearsal

- Request construction cannot receive Job type, timing or raw provider fields;
  those remain owner-private.
- Two source events with identical descriptions still remain distinct because
  their UUIDs differ. The description is not a dedupe key.
- At dispatch, a more recent meeting-point change is intentionally irrelevant:
  the task renders its own event description/time or skips for current
  recipient state.
- The prepared channel must branch explicitly on this template. Falling
  through to the waitlist branch would select the wrong WeChat template.
