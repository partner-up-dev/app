# job-runner-trigger (Aliyun FC Timer Function)

This function is a timer-triggered bridge for serverless scheduling. It sends
`POST` requests to backend maintenance tick endpoints:

- `/internal/maintenance/tick`

Durable runtime cron, rollout, and recovery truth lives in
`docs/40-deployment/backend-runtime.md`,
`docs/40-deployment/backend-rollout.md`, and `docs/40-deployment/recovery.md`.

## File

- handler entry: `job-runner-trigger.cjs`
- exported handler: `exports.handler`
- FC template: `s.yaml`

## Environment Variables

- `JOB_RUNNER_TICK_URL` (required)
  Comma-separated target URLs.
  Example:
  `https://env-a.example.com/internal/maintenance/tick,https://env-b.example.com/internal/maintenance/tick`
- `JOB_RUNNER_INTERNAL_TOKEN` (required)
  Sent via header `x-internal-token`.
- `JOB_RUNNER_TRIGGER_REQUEST_TIMEOUT_MS` (optional)
  Per-request timeout in milliseconds. Default: `25000`.

## Runtime Behavior

1. parse `JOB_RUNNER_TICK_URL` by `,` and trim spaces
2. trigger all URLs in parallel using `fetch`
3. treat any non-2xx response as failure
4. fail the whole invocation if at least one URL fails
5. return per-URL results when all URLs succeed

## Failure Semantics

- Fail-fast is not used; all targets are attempted in the same invocation.
- Error message includes failed URLs and response summary.

## Cron Source

The FC timer cron expression is deployed from
`ALIYUN_FC_JOB_RUNNER_TRIGGER_CRON`. The current GitHub Actions workflow
fallback is `0 */30 * * * *`; set the GitHub Environment variable explicitly
when an environment needs a different cadence.
