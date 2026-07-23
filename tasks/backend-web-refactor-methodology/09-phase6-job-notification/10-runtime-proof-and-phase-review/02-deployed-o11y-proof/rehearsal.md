# `6-5.2` Mental Rehearsal

- JSON appears in FC stdout but not SLS query: signal path is unproven and
  compatibility stays.
- Query works but retention is shorter than recovery needs: replacement fails.
- Probe slow-success lease expires: new claim is visible and old completion is
  rejected by token, with no external effect.
- Alert routes to no owner/runbook: operational proof fails even when logs
  exist.
- A log contains message/OpenID/raw provider params or unnecessary amount:
  redact and repeat; never accept it as useful evidence.
- Runtime authority is unavailable: mark external pending, do not simulate a
  deployed conclusion from local source.
