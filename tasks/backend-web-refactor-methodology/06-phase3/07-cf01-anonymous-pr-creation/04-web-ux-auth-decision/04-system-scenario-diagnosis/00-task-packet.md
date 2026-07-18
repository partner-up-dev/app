# 07D system-scenario diagnosis packet

Owner: read-only diagnosis of the targeted Browser/System scenario. This packet owns only the evidence and
reproduction notes under this directory; it does not change application code, tests, Vitest configuration, or durable
documentation.

Target:

```text
pnpm exec vitest run --project system-scenario \
  tests/scenario/pr/pr-create.scenario.test.ts \
  -t 'pr_create_form_requires_authentication_before_create'
```

Questions:

- Is `system-scenario` the correct project and is the title selectable?
- Is the apparent no-result state caused by scenario infrastructure (database, servers, or browser), or by the test?
- What is the smallest command that produces an observable final result without leaving child processes behind?

Stop conditions: do not edit the implementation or test, do not start ad-hoc dev servers, and do not claim a pass
without the final Vitest summary. A real application/test defect would be reported with exact evidence only.

Status: complete. The selector and title resolve, scenario infrastructure is available, and a clean rerun produced a
final pass. The earlier startup-only observation is attributable to an inconclusive bounded wrapper run that left the
Vitest child process alive; it is not evidence of a persistent test block.
